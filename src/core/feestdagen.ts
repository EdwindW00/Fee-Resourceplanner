import { dagNr, isoDatum } from './dates';
import type { Feestdag } from './types';

/** Paaszondag (anonieme Gregoriaanse methode / Meeus). */
export function paaszondag(jaar: number): string {
  const a = jaar % 19;
  const b = Math.floor(jaar / 100);
  const c = jaar % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31);
  const dag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${jaar}-${String(maand).padStart(2, '0')}-${String(dag).padStart(2, '0')}`;
}

/**
 * Officiële Nederlandse feestdagen van één jaar, met de standaard 'meetellen'
 * uit specificatie §13: Goede Vrijdag nee, Bevrijdingsdag alleen in lustrumjaren.
 * Koningsdag op zondag → zaterdag 26 april.
 */
export function nlFeestdagen(jaar: number): Feestdag[] {
  const pasen = dagNr(paaszondag(jaar));
  const p = (n: number) => isoDatum(pasen + n);
  const koningsdag27 = dagNr(`${jaar}-04-27`);
  const zondag = (((koningsdag27 + 3) % 7) + 7) % 7 === 6;
  return [
    { datum: `${jaar}-01-01`, omschrijving: 'Nieuwjaarsdag', meetellen: true },
    { datum: p(-2), omschrijving: 'Goede Vrijdag', meetellen: false },
    { datum: p(1), omschrijving: '2e Paasdag', meetellen: true },
    { datum: zondag ? `${jaar}-04-26` : `${jaar}-04-27`, omschrijving: 'Koningsdag', meetellen: true },
    { datum: `${jaar}-05-05`, omschrijving: 'Bevrijdingsdag', meetellen: jaar % 5 === 0 },
    { datum: p(39), omschrijving: 'Hemelvaartsdag', meetellen: true },
    { datum: p(50), omschrijving: '2e Pinksterdag', meetellen: true },
    { datum: `${jaar}-12-25`, omschrijving: '1e Kerstdag', meetellen: true },
    { datum: `${jaar}-12-26`, omschrijving: '2e Kerstdag', meetellen: true },
  ];
}

export function nlFeestdagenReeks(vanJaar: number, totJaar: number): Feestdag[] {
  const uit: Feestdag[] = [];
  for (let j = vanJaar; j <= totJaar; j++) uit.push(...nlFeestdagen(j));
  return uit;
}
