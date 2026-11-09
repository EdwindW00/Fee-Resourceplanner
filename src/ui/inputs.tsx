import { useEffect, useState, type KeyboardEvent } from 'react';
import { fmtDatum, dagNr, isGeldigeDatum } from '../core/dates';
import { parseDatum, parseGetal } from './format';

interface Basis {
  className?: string;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  list?: string;
  'data-col'?: number;
  'data-rij'?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

/** Tekstveld dat pas bij verlaten / Enter doorgeeft. */
export function Tekst({ waarde, onWijzig, ...b }: Basis & { waarde: string | undefined | null; onWijzig: (v: string) => void }) {
  const [concept, setConcept] = useState(waarde ?? '');
  useEffect(() => setConcept(waarde ?? ''), [waarde]);
  return (
    <input
      type="text"
      {...b}
      className={`invoer ${b.className ?? ''}`}
      value={concept}
      onChange={(e) => setConcept(e.target.value)}
      onBlur={() => concept !== (waarde ?? '') && onWijzig(concept)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        b.onKeyDown?.(e);
      }}
    />
  );
}

/** Getalveld; accepteert '12,5' en '1.234,5'. Factor 100 voor percentages. */
export function Getal({
  waarde,
  onWijzig,
  procent,
  ...b
}: Basis & { waarde: number | null | undefined; onWijzig: (v: number | null) => void; procent?: boolean }) {
  const toon = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? '' : String(procent ? Math.round(v * 1e6) / 1e4 : v).replace('.', ',');
  const [concept, setConcept] = useState(toon(waarde));
  useEffect(() => setConcept(toon(waarde)), [waarde]); // eslint-disable-line react-hooks/exhaustive-deps
  const commit = () => {
    const v = parseGetal(concept);
    const nieuw = v == null ? null : procent ? v / 100 : v;
    if (nieuw !== (waarde ?? null)) onWijzig(nieuw);
    else setConcept(toon(waarde));
  };
  return (
    <input
      type="text"
      inputMode="decimal"
      {...b}
      className={`invoer num ${b.className ?? ''}`}
      value={concept}
      onChange={(e) => setConcept(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        b.onKeyDown?.(e);
      }}
    />
  );
}

/** Datumveld in dd-mm-jjjj. */
export function Datum({ waarde, onWijzig, ...b }: Basis & { waarde: string | null | undefined; onWijzig: (v: string | null) => void }) {
  const toon = (v: string | null | undefined) => (isGeldigeDatum(v) ? fmtDatum(dagNr(v)) : '');
  const [concept, setConcept] = useState(toon(waarde));
  useEffect(() => setConcept(toon(waarde)), [waarde]);
  const commit = () => {
    if (!concept.trim()) return waarde ? onWijzig(null) : undefined;
    const d = parseDatum(concept);
    if (d && isGeldigeDatum(d)) {
      if (d !== waarde) onWijzig(d);
      else setConcept(toon(waarde));
    } else setConcept(toon(waarde));
  };
  return (
    <input
      type="text"
      placeholder="dd-mm-jjjj"
      {...b}
      className={`invoer datum ${b.className ?? ''}`}
      value={concept}
      onChange={(e) => setConcept(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        b.onKeyDown?.(e);
      }}
    />
  );
}

export function Keuze<T extends string>({
  waarde,
  onWijzig,
  opties,
  leeg,
  ...b
}: Basis & { waarde: T | null | undefined; onWijzig: (v: T | null) => void; opties: { waarde: T; label: string }[]; leeg?: string }) {
  return (
    <select
      {...b}
      className={`invoer ${b.className ?? ''}`}
      value={waarde ?? ''}
      onChange={(e) => onWijzig((e.target.value || null) as T | null)}
      onKeyDown={b.onKeyDown}
    >
      {leeg != null && <option value="">{leeg}</option>}
      {opties.map((o) => (
        <option key={o.waarde} value={o.waarde}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function StatusCel({ tekst, ernst }: { tekst: string; ernst: 'fout' | 'waarschuwing' | 'info' | null }) {
  if (!tekst) return <td />;
  const cls = tekst === 'OK' ? 'st-ok' : ernst === 'fout' ? 'st-fout' : 'st-let';
  return <td className={`status ${cls}`}>{tekst}</td>;
}
