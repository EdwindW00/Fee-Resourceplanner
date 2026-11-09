// Fabrieken en hulpfuncties voor het datamodel.

import { norm } from './calc';
import type { Fase, Inzetregel, Project, Teamlid } from './types';

export function nieuwId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function nieuwProject(velden: Partial<Project> = {}): Project {
  return {
    id: nieuwId(),
    naam: 'Nieuw project',
    opdrachtgever: '',
    pacoProjectnr: '',
    offertedatum: null,
    versie: '',
    opgesteldDoor: '',
    startdatum: null,
    urenPerDag: 8,
    afronding: 1,
    feestdagenMeenemen: false,
    basisjaarTarieven: 2026,
    indexatieAan: true,
    indexatiePct: 0.034,
    kantooropslagPct: 0.05,
    vastePrijs: null,
    fases: [],
    team: [],
    inzet: [],
    kalenderAfwijkingen: [],
    ...velden,
  };
}

export function nieuweFase(velden: Partial<Fase> = {}): Fase {
  return { id: nieuwId(), code: '', naam: '', pacoFasecode: '', duurWeken: null, startdatumHandmatig: null, ...velden };
}

export function nieuwTeamlid(velden: Partial<Teamlid> = {}): Teamlid {
  return { id: nieuwId(), rolNaam: '', medewerkerId: null, tariefHandmatig: null, beschikbaarUrenPerWeek: null, ...velden };
}

export function nieuweRegel(velden: Partial<Inzetregel> = {}): Inzetregel {
  return {
    id: nieuwId(),
    faseId: null,
    activiteit: '',
    teamlidId: null,
    methode: 'TOTAAL',
    waarde: null,
    profiel: 'GELIJK',
    vanafWeekInFase: null,
    aantalWeken: null,
    opmerking: '',
    ...velden,
  };
}

/** Koppelen op tekst (alleen bij import, §6.9): trim, hoofdletter-ongevoelig, als tekst. */
export function zoekFaseOpCode(p: Project, code: unknown): Fase | undefined {
  const c = norm(code);
  return c ? p.fases.find((f) => norm(f.code) === c) : undefined;
}

export function zoekTeamlidOpRol(p: Project, rol: unknown): Teamlid | undefined {
  const r = norm(rol);
  return r ? p.team.find((t) => norm(t.rolNaam) === r) : undefined;
}

/** Diepe kopie met nieuwe id's (dupliceren). Verwijzingen worden omgezet. */
export function dupliceerProject(p: Project): Project {
  const faseMap = new Map<string, string>();
  const teamMap = new Map<string, string>();
  const fases = p.fases.map((f) => {
    const id = nieuwId();
    faseMap.set(f.id, id);
    return { ...f, id };
  });
  const team = p.team.map((t) => {
    const id = nieuwId();
    teamMap.set(t.id, id);
    return { ...t, id };
  });
  const inzet = p.inzet.map((r) => ({
    ...r,
    id: nieuwId(),
    faseId: r.faseId ? faseMap.get(r.faseId) ?? null : null,
    teamlidId: r.teamlidId ? teamMap.get(r.teamlidId) ?? null : null,
  }));
  return {
    ...structuredClone(p),
    id: nieuwId(),
    naam: `${p.naam} (kopie)`,
    gearchiveerd: false,
    fases,
    team,
    inzet,
  };
}
