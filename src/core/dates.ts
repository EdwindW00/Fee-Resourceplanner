// Datumrekenen in hele dagen (UTC), zonder tijdzone-effecten.

const MS_PER_DAG = 86_400_000;

/** 'JJJJ-MM-DD' → dagnummer sinds 1970-01-01. */
export function dagNr(iso: string): number {
  const [j, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(j, m - 1, d) / MS_PER_DAG);
}

/** Dagnummer → 'JJJJ-MM-DD'. */
export function isoDatum(dag: number): string {
  return new Date(dag * MS_PER_DAG).toISOString().slice(0, 10);
}

export function jmd(dag: number): { jaar: number; maand: number; dag: number } {
  const d = new Date(dag * MS_PER_DAG);
  return { jaar: d.getUTCFullYear(), maand: d.getUTCMonth() + 1, dag: d.getUTCDate() };
}

/** Maandag = 0 … zondag = 6 (Excel WEEKDAY(x;3)). */
export function weekdagMa0(dag: number): number {
  // 1970-01-01 was een donderdag (3).
  return (((dag + 3) % 7) + 7) % 7;
}

export function maandagVan(dag: number): number {
  return dag - weekdagMa0(dag);
}

export function isGeldigeDatum(iso: string | null | undefined): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return false;
  const d = dagNr(iso);
  return Number.isFinite(d) && isoDatum(d) === iso.slice(0, 10);
}

export const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** dd-mm-jjjj */
export function fmtDatum(dag: number | null | undefined): string {
  if (dag == null || !Number.isFinite(dag)) return '';
  const { jaar, maand, dag: d } = jmd(dag);
  return `${String(d).padStart(2, '0')}-${String(maand).padStart(2, '0')}-${jaar}`;
}

/** 'mmm jjjj' */
export function fmtMaandJaar(dag: number): string {
  const { jaar, maand } = jmd(dag);
  return `${MAANDEN_KORT[maand - 1]} ${jaar}`;
}
