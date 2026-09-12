"""Only Stage 1 upstream. Standard library only; fail closed before replacing data."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://gmptoday.in/api/gmp.json'

def text(value):
    return value.strip() if isinstance(value, str) and value.strip() else None

def number(value):
    return value if type(value) in (int, float) and math.isfinite(value) else None

def url(value):
    value = text(value)
    return value if value and urlparse(value).scheme == 'https' and urlparse(value).netloc else None

def date(value):
    value = text(value)
    if not value:
        return None
    for fmt in ('%Y-%m-%d', '%d %b %Y', '%d-%b-%Y'):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            pass
    return None

def normalize(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('ipos'), list) or not raw['ipos']:
        raise ValueError('Expected a nonempty IPO list')
    stamp = text(raw.get('generated_at'))
    if not stamp or datetime.fromisoformat(stamp.replace('Z', '+00:00')).tzinfo is None:
        raise ValueError('Expected upstream timestamp with timezone')
    result, ids = [], set()
    metadata = raw.get('sources') if isinstance(raw.get('sources'), dict) else {}
    for item in raw['ipos']:
        if not isinstance(item, dict):
            raise ValueError('Invalid IPO identity')
        identity, name = text(item.get('slug')), text(item.get('name'))
        if not identity or not re.fullmatch(r'[a-z0-9-]+', identity) or not name or identity in ids:
            raise ValueError('Invalid or duplicate IPO identity')
        ids.add(identity)
        ipo = {'id': identity, 'name': name}
        for source, target in {
            'median_gmp': 'gmp', 'min_gmp': 'gmpMin', 'max_gmp': 'gmpMax',
            'est_listing_pct': 'gmpPercent', 'price_band': 'priceMax', 'price_min': 'priceMin',
            'lot_size': 'lotSize', 'min_investment': 'minInvestment', 'min_lots': 'minLots',
            'n_sources': 'sourceCount', 'subscription': 'overallSubscription',
        }.items():
            value = number(item.get(source))
            if value is not None and (target in ('gmp', 'gmpMin', 'gmpMax', 'gmpPercent') or value >= 0):
                ipo[target] = value
        for source, target in {'type': 'segment', 'status': 'status', 'confidence': 'confidence', 'sub_source': 'subscriptionSource', 'upi_cutoff': 'upiCutoff'}.items():
            if text(item.get(source)):
                ipo[target] = text(item[source])
        for source, target in {'open_iso': 'openDate', 'close_iso': 'closeDate', 'boa_date': 'allotmentDate', 'listing_date': 'listingDate'}.items():
            if date(item.get(source)):
                ipo[target] = date(item[source])
        reg = item.get('registrar') if isinstance(item.get('registrar'), dict) else {}
        registrar = {k: v for k, v in {'name': text(reg.get('name')) or text(item.get('registrar_official')), 'url': url(reg.get('url'))}.items() if v}
        if registrar:
            ipo['registrar'] = registrar
        cats = item.get('sub_cats') if isinstance(item.get('sub_cats'), dict) else {}
        ipo['subscription'] = {k: number(cats[k]) for k in ('qib', 'nii', 'retail', 'total') if number(cats.get(k)) is not None and cats[k] >= 0}
        sources = item.get('sources') if isinstance(item.get('sources'), dict) else {}
        ipo['trackers'] = []
        for key, value in sorted(sources.items()):
            if number(value) is None:
                continue
            meta = metadata.get(key) if isinstance(metadata.get(key), dict) else {}
            tracker = {'name': text(meta.get('label')) or key, 'gmp': value}
            if url(meta.get('url')):
                tracker['url'] = url(meta['url'])
            ipo['trackers'].append(tracker)
        history = item.get('history') if isinstance(item.get('history'), list) else []
        days = {}
        for point in history:
            if isinstance(point, dict) and date(point.get('date')) and number(point.get('median')) is not None:
                day = {'date': date(point['date']), 'median': point['median']}
                day.update({k: point[k] for k in ('min', 'max') if number(point.get(k)) is not None})
                days[day['date']] = day
        ipo['history'] = sorted(days.values(), key=lambda p: p['date'])
        result.append(ipo)
    return {'schemaVersion': 1, 'generatedAt': stamp, 'ipos': sorted(result, key=lambda i: i['id'])}

def meaningful_hash(data):
    # Hash only consumed normalized market content, never generated display prose/times.
    payload = {'schemaVersion': data['schemaVersion'], 'ipos': data['ipos']}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()

def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix='.pending-')
    try:
        with os.fdopen(handle, 'wb') as file:
            file.write(content)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def fetch():
    agent = os.environ.get('IPO_USER_AGENT', 'IPOFamilyDashboard/1.0 (personal static dashboard)')
    with urlopen(Request(URL, headers={'User-Agent': agent, 'Accept': 'application/json'}), timeout=30) as response:
        raw = response.read(15_000_001)
    if len(raw) > 15_000_000:
        raise ValueError('Upstream response exceeds limit')
    return raw

def sync(directory=ROOT / 'data', fetcher=fetch):
    raw = fetcher()
    data = normalize(json.loads(raw))
    data['contentHash'] = meaningful_hash(data)
    latest = directory / 'latest.json'
    if latest.exists():
        previous = json.loads(latest.read_text(encoding='utf-8'))
        if meaningful_hash(previous) == data['contentHash']:
            return False
    # Persist the debugging snapshot first; latest is always an atomic replacement.
    name = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    atomic_write(directory / 'snapshots' / f'{name}-{data["contentHash"][:12]}.json', raw)
    atomic_write(latest, (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode())
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixture', type=Path, help='Explicit local fixture for development only')
    parser.add_argument('--validate', action='store_true')
    args = parser.parse_args()
    try:
        if args.validate:
            data = json.loads((ROOT / 'data/latest.json').read_text(encoding='utf-8'))
            assert data['ipos'] and data['contentHash'] == meaningful_hash(data)
            print('Static market data valid')
        else:
            changed = sync(fetcher=args.fixture.read_bytes if args.fixture else fetch)
            print('Market data changed' if changed else 'No meaningful change')
    except Exception as error:
        print(f'Sync failed ({type(error).__name__}); previous data retained.', file=sys.stderr)
        sys.exit(1)
