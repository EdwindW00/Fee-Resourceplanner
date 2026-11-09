const euro0 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const euro2 = new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const getal = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 1 });

/** € 1.234 */
export const fmtEuro = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? '' : `€ ${euro0.format(x)}`);
/** € 1.234,56 */
export const fmtEuro2 = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? '' : `€ ${euro2.format(x)}`);
/** 1.234,5 – leeg bij 0 als leegBijNul */
export const fmtUren = (x: number | null | undefined, leegBijNul = false) =>
  x == null || !Number.isFinite(x) || (leegBijNul && x === 0) ? '' : getal.format(x);
export const fmtPct = (x: number | null | undefined) => (x == null || !Number.isFinite(x) ? '' : pct1.format(x));

/** Getal uit Nederlandse of Engelse notatie: '1.234,5' / '1234.5' / '12,5'. */
export function parseGetal(s: string): number | null {
  const t = s.trim().replace(/[€\s%]/g, '');
  if (!t) return null;
  let n: string;
  if (t.includes(',') && t.includes('.')) n = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else n = t.replace(',', '.');
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/** 'dd-mm-jjjj' of 'jjjj-mm-dd' → 'jjjj-mm-dd' */
export function parseDatum(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
