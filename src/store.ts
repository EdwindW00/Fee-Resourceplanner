// Lokale opslag (fase 2 uit §11): alles in localStorage van deze browser.
// Later te vervangen door een backend met SSO en database (§11 fase 3).

import { nlFeestdagenReeks } from './core/feestdagen';
import type { Medewerker, Project, Stamdata, Tarief } from './core/types';

const SLEUTEL_PROJECTEN = 'frp.projecten.v1';
const SLEUTEL_STAM = 'frp.stamdata.v1';

/**
 * Standaardtarieven: tab 'Tarieven' van 'Uren- en honorariumplanning v1.1 - template.xlsx'
 * (bron daar: 'Externe tarieven 2026.pdf'). Aan te passen onder Beheer.
 */
export const STANDAARD_TARIEVEN: Tarief[] = [
  { sleutel: 'SR-PM', level: 'Senior', functie: 'Project Manager', tariefBasisjaar: 163, basisjaar: 2026 },
  { sleutel: 'SR-CON', level: 'Senior', functie: 'Consultant', tariefBasisjaar: 163, basisjaar: 2026 },
  { sleutel: 'MD-PM', level: 'Medior', functie: 'Project Manager', tariefBasisjaar: 142, basisjaar: 2026 },
  { sleutel: 'MD-CON', level: 'Medior', functie: 'Consultant', tariefBasisjaar: 142, basisjaar: 2026 },
  { sleutel: 'MD-CM', level: 'Medior', functie: 'Construction Manager (Directievoerder)', tariefBasisjaar: 142, basisjaar: 2026 },
  { sleutel: 'JR-PM', level: 'Junior', functie: 'Project Manager', tariefBasisjaar: 126, basisjaar: 2026 },
  { sleutel: 'JR-CON', level: 'Junior', functie: 'Consultant', tariefBasisjaar: 126, basisjaar: 2026 },
  { sleutel: 'CM-TZ', level: '', functie: 'Construction Manager (Toezichthouder)', tariefBasisjaar: 100, basisjaar: 2026 },
  { sleutel: 'GEEN', level: '', functie: 'Geen extern tarief', tariefBasisjaar: null, opmerking: 'Hulpregel voor functies zonder extern tarief (staf, externen).' },
];

/** Plaatshouders 'NNB – {functie}' per tariefsleutel (§14). Geen persoonsgegevens. */
export function plaatshouders(tarieven: Tarief[]): Medewerker[] {
  return tarieven
    .filter((t) => t.sleutel !== 'GEEN')
    .map((t) => ({
      id: `nnb-${t.sleutel}`,
      naam: `NNB – ${[t.level, t.functie].filter(Boolean).join(' ')}`,
      functie: 'Plaatshouder',
      tariefsleutel: t.sleutel,
      koppeling: 'Plaatshouder' as const,
      onderbouwing: 'Gebruik als de persoon nog niet bekend is.',
      actief: true,
    }));
}

export function standaardStamdata(): Stamdata {
  return {
    medewerkers: plaatshouders(STANDAARD_TARIEVEN),
    tarieven: STANDAARD_TARIEVEN,
    feestdagen: nlFeestdagenReeks(2026, 2035),
  };
}

function lees<T>(sleutel: string): T | null {
  try {
    const s = localStorage.getItem(sleutel);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

function schrijf(sleutel: string, waarde: unknown): boolean {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde));
    return true;
  } catch {
    return false;
  }
}

export const laadProjecten = (): Project[] => lees<Project[]>(SLEUTEL_PROJECTEN) ?? [];
export const bewaarProjecten = (p: Project[]) => schrijf(SLEUTEL_PROJECTEN, p);
export const laadStamdata = (): Stamdata => lees<Stamdata>(SLEUTEL_STAM) ?? standaardStamdata();
export const bewaarStamdata = (s: Stamdata) => schrijf(SLEUTEL_STAM, s);
