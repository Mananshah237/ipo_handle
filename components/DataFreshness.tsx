'use client';
import { useEffect, useState } from 'react';
import { freshness } from '../lib/data';
export default function DataFreshness({ stamp }: { stamp: string }) {
  const [now, setNow] = useState<number>();
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const info = now ? freshness(stamp, now) : { label: 'Checking update time…', stale: false };
  return <p className={`freshness ${info.stale ? 'stale' : ''}`} title={stamp}><span aria-hidden="true">●</span> {info.label}{info.stale && ' · Data may be stale'}</p>;
}
