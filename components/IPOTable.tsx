'use client';

import { Fragment, useState } from 'react';
import type { IPO, LocalState } from '../lib/types';
import type { AllotmentStore, StoredResult } from '../lib/allotment/types';
import { emptyResults } from '../lib/allotment/results';
import { allotmentInfo, formatDate, gmpPercent, istDay, money, safeUrl, status } from '../lib/data';
import IPOCard from './IPOCard';
import AllotmentCheck from './AllotmentCheck';
import { Table, TableHeader, TableBody, TableCaption, TableRow, TableHead, TableCell } from './ui/animated-table-rows';

interface Props {
  ipos: IPO[];
  state: LocalState;
  currentDate: Date;
  allotments?: boolean;
  onApplied: (ipo: string, member: string, checked: boolean) => void;
  results?: AllotmentStore;
  onResult?: (ipo: string, member: string, result: StoredResult) => void;
}

export default function IPOTable({ ipos, state, currentDate, allotments = false, onApplied, results = emptyResults(), onResult = () => {} }: Props) {
  const [expanded, setExpanded] = useState<string>();
  const columns = allotments
    ? ['Company', 'Allotment date', 'Registrar', 'Family applied', 'Status page']
    : ['Company', 'Price band', 'Lot size', 'Min. investment', 'GMP / GMP %', 'Range / sources', 'QIB', 'NII', 'Retail', 'Total', 'Closes', 'Allotment', 'Listing', 'Family applied'];

  return <section className="table-section" aria-label={allotments ? 'Allotment overview' : 'IPO overview'}>
    <p className="table-hint">Swipe across to compare{!allotments && ' · Tap a company for details & applications'}</p>
    <Table>
      <TableCaption>{allotments ? 'Allotment dates and family applications' : 'IPO market data · GMP is not a guaranteed listing return'}</TableCaption>
      <TableHeader><TableRow>{columns.map((column, index) => <TableHead key={column} className={index === 0 ? 'company-column' : undefined}>{column}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {ipos.map((ipo, index) => {
          const stage = status(ipo, currentDate);
          const percent = gmpPercent(ipo);
          const applied = state.members.filter(member => state.applications[ipo.id]?.[member.id]?.applied);
          const open = expanded === ipo.id;
          const registrarUrl = safeUrl(ipo.registrar?.url);
          const allotment = allotmentInfo(ipo);
          const allotmentLabel = <>{formatDate(allotment.date)}{allotment.date && allotment.estimated && <small>estimated</small>}</>;
          return <Fragment key={ipo.id}>
            <TableRow data-state={open ? 'selected' : undefined} style={{ animationDelay: `${Math.min(index, 6) * 35}ms` }}>
              <th scope="row" className="company-column">
                {allotments ? <strong className="company-name">{ipo.name}</strong> : <button className="company-button" aria-expanded={open} aria-controls={`detail-${ipo.id}`} onClick={() => setExpanded(open ? undefined : ipo.id)}>{ipo.name}<span aria-hidden="true">{open ? '−' : '+'}</span></button>}
                <div className="company-meta"><span>{ipo.segment ?? 'IPO'}</span><span className={`badge ${stage.toLowerCase()}`}>{stage}</span></div>
              </th>
              {allotments ? <>
                <TableCell>{allotmentLabel}</TableCell>
                <TableCell className="wrap-cell">{ipo.registrar?.name ?? 'Not available'}</TableCell>
                <TableCell className="wrap-cell"><AllotmentCheck ipo={ipo} state={state} results={results} today={istDay(currentDate)} onResult={onResult}/></TableCell>
                <TableCell>{registrarUrl ? <a className="button" href={registrarUrl} target="_blank" rel="noopener noreferrer">Open registrar page ↗</a> : 'Not available'}</TableCell>
              </> : <>
                <TableCell>{ipo.priceMin != null && ipo.priceMax != null ? `${money(ipo.priceMin)}–${money(ipo.priceMax)}` : ipo.priceMax != null ? `${money(ipo.priceMax)} (upper)` : '—'}</TableCell>
                <TableCell>{ipo.lotSize?.toLocaleString('en-IN') ?? '—'}</TableCell>
                <TableCell>{money(ipo.minInvestment)}</TableCell>
                <TableCell><strong>{money(ipo.gmp)}</strong><small>{percent == null ? '—' : `${percent.toFixed(1)}%`} GMP</small></TableCell>
                <TableCell>{money(ipo.gmpMin)} – {money(ipo.gmpMax)}<small>{ipo.sourceCount != null ? `${ipo.sourceCount} sources` : 'Sources unavailable'}{ipo.confidence ? ` · ${ipo.confidence}` : ''}</small></TableCell>
                {(['qib', 'nii', 'retail', 'total'] as const).map(key => <TableCell key={key}>{ipo.subscription?.[key] == null ? '—' : `${ipo.subscription[key]}×`}</TableCell>)}
                <TableCell>{formatDate(ipo.closeDate)}</TableCell>
                <TableCell>{allotmentLabel}</TableCell>
                <TableCell>{formatDate(ipo.listingDate)}</TableCell>
                <TableCell className="wrap-cell">{applied.map(member => member.name).join(', ') || 'None marked'}</TableCell>
              </>}
            </TableRow>
            {!allotments && <tr id={`detail-${ipo.id}`} hidden={!open} className="table-detail-row"><TableCell colSpan={columns.length}>{open && <div className="table-detail"><IPOCard ipo={ipo} stage={stage} state={state} onApplied={(member, checked) => onApplied(ipo.id, member, checked)}/></div>}</TableCell></tr>}
          </Fragment>;
        })}
      </TableBody>
    </Table>
  </section>;
}
