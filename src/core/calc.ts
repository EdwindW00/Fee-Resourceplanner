// Rekenkern – specificatie §6 (rekenregels) en §7 (validaties).
// Puur: geen UI, geen opslag. Invoer: project + stamdata. Uitvoer: alles wat de schermen tonen.

import { dagNr, fmtMaandJaar, isGeldigeDatum, jmd, maandagVan } from './dates';
import { excelRoundUp, roundStap, schoon } from './round';
import type { Fase, Inzetregel, Medewerker, Project, Stamdata, Tarief, Teamlid } from './types';

export type Ernst = 'fout' | 'waarschuwing' | 'info';
export type Scherm = 'project' | 'team' | 'inzet' | 'bezetting' | 'budget' | 'paco';

export interface Melding {
  ernst: Ernst;
  tekst: string;
  scherm: Scherm;
  /** id van fase / teamlid / inzetregel waar het probleem zit */
  id?: string;
  veld?: string;
}

export interface Week {
  w: number; // 1-based
  maandag: number; // dagnummer
  vrijdag: number;
  isoWeek: number;
  jaar: number; // ISO-jaar (jaar van de donderdag)
  maand: number; // maand van de donderdag
  maandsleutel: number; // jaar*100 + maand
  feestdagen: number;
  factor: number;
  afwijking: boolean;
}

export interface FaseResultaat {
  fase: Fase;
  nr: number; // 1-based volgnummer
  actief: boolean;
  startWeek: number | null;
  eindWeek: number | null;
  van: number | null; // maandag startweek
  tm: number | null; // vrijdag eindweek
  periode: string; // 'mmm jjjj – mmm jjjj'
  label: string;
  uren: number;
  honorarium: number;
  perWeek: number[]; // index w-1
  status: string; // 'OK' of meldingstekst, '' bij lege rij
  ernst: Ernst | null;
}

export interface RegelResultaat {
  regel: Inzetregel;
  faseIdx: number; // -1 = geen
  teamIdx: number; // -1 = geen
  actief: boolean;
  start: number | null;
  eind: number | null;
  weken: number | null;
  perWeek: number[]; // index w-1
  urenTotaal: number;
  gemPerWeek: number | null;
  tarief: number;
  kosten: number;
  status: string;
  ernst: Ernst | null;
}

export interface TeamResultaat {
  lid: Teamlid;
  nr: number;
  medewerker: Medewerker | null;
  functie: string;
  tariefsleutel: string;
  basistarief: number;
  jaren: number[];
  urenPerJaar: Record<number, number>;
  tariefPerJaar: Record<number, number>;
  projecttarief: number;
  urenTotaal: number;
  honorarium: number;
  perWeek: number[];
  grens: number; // uren/week waarboven overbezetting
  wekenOver: number;
  status: string;
  ernst: Ernst | null;
}

export interface PacoRegel {
  projectnummer: string;
  projectnaam: string;
  fasecode: string;
  fase: string;
  medewerker: string;
  pacoMedewerkernr: string;
  functie: string;
  rol: string;
  jaar: number;
  maand: number;
  periode: string;
  uren: number;
  uurtarief: number;
  bedrag: number;
  teamIdx: number;
  faseIdx: number;
}

export interface Budget {
  perFase: { faseIdx: number; uren: number; honorarium: number; pct: number | null; opslag: number; totaal: number }[];
  uren: number;
  honorarium: number;
  kantooropslag: number;
  totaal: number;
  vastePrijs: number | null;
  verschil: number | null;
  gemTarief: number | null;
  gemTariefVastePrijs: number | null;
  maanden: number[]; // maandsleutels in volgorde
  rolFaseUren: number[][]; // [teamIdx][faseIdx]
  rolMaandUren: number[][]; // [teamIdx][maandIdx]
  rolMaandBedrag: number[][];
}

export interface Resultaat {
  geldig: boolean; // false als er geen startdatum is
  projectMaandag: number | null;
  weken: Week[];
  fases: FaseResultaat[];
  regels: RegelResultaat[];
  team: TeamResultaat[];
  totaalPerWeek: number[];
  urenTotaal: number;
  kostenTotaal: number;
  budget: Budget;
  paco: PacoRegel[];
  meldingen: Melding[];
  aantalFouten: number;
  aantalWaarschuwingen: number;
}

/** Normaliseren voor tekstvergelijking (§6.9). */
export function norm(s: unknown): string {
  return String(s ?? '').trim().toUpperCase();
}

function pos(n: number | null | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export function faseActief(f: Fase): boolean {
  return norm(f.code) !== '' && pos(f.duurWeken) > 0;
}

function regelLeeg(r: Inzetregel): boolean {
  return !r.faseId && !r.teamlidId && !r.activiteit?.trim() && r.waarde == null;
}

export function bereken(p: Project, stam: Stamdata): Resultaat {
  const meldingen: Melding[] = [];
  const s = p.afronding || 1;
  const urenPerDag = pos(p.urenPerDag) || 8;

  const medewerkerById = new Map(stam.medewerkers.map((m) => [m.id, m]));
  const tariefBySleutel = new Map<string, Tarief>(stam.tarieven.map((t) => [norm(t.sleutel), t]));
  const faseIdxById = new Map(p.fases.map((f, i) => [f.id, i]));
  const teamIdxById = new Map(p.team.map((t, i) => [t.id, i]));

  const geldig = isGeldigeDatum(p.startdatum);
  if (!geldig) {
    meldingen.push({ ernst: 'fout', tekst: 'Startdatum project ontbreekt', scherm: 'project', veld: 'startdatum' });
  }
  const projectMaandag = geldig ? maandagVan(dagNr(p.startdatum!)) : null;

  // ---- 6.2 Fases: start- en eindweek ----
  const fasesR: FaseResultaat[] = p.fases.map((fase, i) => ({
    fase,
    nr: i + 1,
    actief: faseActief(fase),
    startWeek: null,
    eindWeek: null,
    van: null,
    tm: null,
    periode: '',
    label: fase.naam,
    uren: 0,
    honorarium: 0,
    perWeek: [],
    status: '',
    ernst: null,
  }));

  if (projectMaandag != null) {
    let maxEind = 0;
    for (const fr of fasesR) {
      if (!fr.actief) continue;
      const hand = fr.fase.startdatumHandmatig;
      const start = isGeldigeDatum(hand) ? Math.floor((maandagVan(dagNr(hand)) - projectMaandag) / 7) + 1 : maxEind + 1;
      const eind = start + Math.floor(pos(fr.fase.duurWeken)) - 1;
      fr.startWeek = start;
      fr.eindWeek = eind;
      fr.van = projectMaandag + (start - 1) * 7;
      fr.tm = projectMaandag + (eind - 1) * 7 + 4;
      fr.periode = `${fmtMaandJaar(fr.van)} – ${fmtMaandJaar(fr.tm)}`;
      fr.label = `${fr.fase.naam} (${fr.periode})`;
      maxEind = Math.max(maxEind, eind);
    }
  }

  // Status fases (#7 code dubbel, #8 start vóór projectstart)
  const codeTelling = new Map<string, number>();
  for (const f of p.fases) if (norm(f.code)) codeTelling.set(norm(f.code), (codeTelling.get(norm(f.code)) ?? 0) + 1);
  for (const fr of fasesR) {
    const f = fr.fase;
    const leeg = !norm(f.code) && !f.naam?.trim() && !pos(f.duurWeken) && !f.startdatumHandmatig;
    let st = '';
    if (!leeg) {
      if (!norm(f.code)) st = 'Code ontbreekt';
      else if (pos(f.duurWeken) <= 0) st = 'Duur ontbreekt';
      else if ((codeTelling.get(norm(f.code)) ?? 0) > 1) st = 'Code dubbel';
      else if (fr.startWeek != null && fr.startWeek < 1) st = 'Start vóór projectstart';
      else st = 'OK';
    }
    fr.status = st;
    if (st && st !== 'OK') {
      fr.ernst = 'fout';
      meldingen.push({ ernst: 'fout', tekst: `Fase ${fr.nr}${f.code ? ` (${f.code})` : ''}: ${st}`, scherm: 'project', id: f.id });
    }
  }

  // ---- 6.3 Vensters van inzetregels (nog zonder uren) ----
  interface Werk {
    rr: RegelResultaat;
    perWeekWaarde: number;
  }
  const werk: Werk[] = p.inzet.map((regel) => {
    const faseIdx = regel.faseId != null ? faseIdxById.get(regel.faseId) ?? -1 : -1;
    const teamIdx = regel.teamlidId != null ? teamIdxById.get(regel.teamlidId) ?? -1 : -1;
    const fr = faseIdx >= 0 ? fasesR[faseIdx] : null;
    const tl = teamIdx >= 0 ? p.team[teamIdx] : null;
    const rolOk = tl != null && norm(tl.rolNaam) !== '';
    const actief = !!fr && fr.actief && rolOk && pos(regel.waarde) > 0 && fr.startWeek != null;
    let start: number | null = null;
    let eind: number | null = null;
    if (actief && fr && fr.startWeek != null && fr.eindWeek != null) {
      start = fr.startWeek + Math.max(1, Math.floor(pos(regel.vanafWeekInFase))) - 1;
      eind = pos(regel.aantalWeken) > 0 ? start + Math.floor(pos(regel.aantalWeken)) - 1 : fr.eindWeek;
    }
    const perWeekWaarde = regel.methode === 'DAGEN_PER_WEEK' ? pos(regel.waarde) * urenPerDag : pos(regel.waarde);
    return {
      perWeekWaarde,
      rr: {
        regel,
        faseIdx,
        teamIdx: rolOk ? teamIdx : -1,
        actief,
        start,
        eind,
        weken: start != null && eind != null ? eind - start + 1 : null,
        perWeek: [],
        urenTotaal: 0,
        gemPerWeek: null,
        tarief: 0,
        kosten: 0,
        status: '',
        ernst: null,
      },
    };
  });

  // ---- 6.1 Weekraster: horizon tot einde laatste fase of regel ----
  let horizon = 0;
  for (const fr of fasesR) if (fr.eindWeek != null) horizon = Math.max(horizon, fr.eindWeek);
  for (const { rr } of werk) if (rr.eind != null) horizon = Math.max(horizon, rr.eind);

  const feestPerDag = new Set(stam.feestdagen.filter((f) => f.meetellen && isGeldigeDatum(f.datum)).map((f) => dagNr(f.datum)));
  const afwijking = new Map<number, number>();
  for (const a of p.kalenderAfwijkingen ?? []) if (Number.isFinite(a.beschikbaarheidPct)) afwijking.set(a.weekIndex, a.beschikbaarheidPct);

  const weken: Week[] = [];
  if (projectMaandag != null) {
    for (let w = 1; w <= horizon; w++) {
      const maandag = projectMaandag + (w - 1) * 7;
      const donderdag = maandag + 3;
      const { jaar, maand } = jmd(donderdag);
      const jan1 = dagNr(`${jaar}-01-01`);
      let fd = 0;
      for (let d = maandag; d <= maandag + 4; d++) if (feestPerDag.has(d)) fd++;
      const auto = p.feestdagenMeenemen ? (5 - fd) / 5 : 1;
      const afw = afwijking.get(w);
      weken.push({
        w,
        maandag,
        vrijdag: maandag + 4,
        isoWeek: Math.floor((donderdag - jan1) / 7) + 1,
        jaar,
        maand,
        maandsleutel: jaar * 100 + maand,
        feestdagen: fd,
        factor: afw ?? auto,
        afwijking: afw != null,
      });
    }
  }
  const nW = weken.length;
  const factor = (w: number) => (w >= 1 && w <= nW ? weken[w - 1].factor : 0);

  // ---- 6.4 Urenverdeling ----
  for (const { rr, perWeekWaarde } of werk) {
    rr.perWeek = new Array(nW).fill(0);
    if (!rr.actief || rr.start == null || rr.eind == null || rr.eind < rr.start) continue;
    const H = pos(rr.regel.waarde);
    const a = Math.max(1, rr.start);
    if (rr.regel.methode === 'TOTAAL') {
      const n = rr.eind - rr.start + 1;
      const gewicht = (w: number) => {
        const i = w - rr.start! + 1;
        const pg = rr.regel.profiel === 'OPLOPEND' ? i : rr.regel.profiel === 'AFLOPEND' ? n - i + 1 : 1;
        return pg * factor(w);
      };
      let Wtot = 0;
      for (let w = a; w <= rr.eind; w++) Wtot += gewicht(w);
      Wtot = schoon(Wtot);
      if (Wtot <= 0) continue;
      let cum = 0;
      let vorige = 0;
      for (let w = a; w <= rr.eind; w++) {
        cum += gewicht(w);
        const nu = roundStap((H * schoon(cum)) / Wtot, s);
        rr.perWeek[w - 1] = schoon(nu - vorige);
        vorige = nu;
      }
    } else {
      for (let w = a; w <= rr.eind; w++) rr.perWeek[w - 1] = roundStap(perWeekWaarde * factor(w), s);
    }
    rr.urenTotaal = schoon(rr.perWeek.reduce((x, y) => x + y, 0));
  }

  // ---- 6.5 Tarieven en indexatie per teamlid ----
  const eersteJaar = weken.length ? weken[0].jaar : projectMaandag != null ? jmd(projectMaandag + 3).jaar : p.basisjaarTarieven;
  const indexFactor = (y: number) => (p.indexatieAan ? Math.pow(1 + pos(p.indexatiePct), y - p.basisjaarTarieven) : 1);

  const rolTelling = new Map<string, number>();
  for (const t of p.team) if (norm(t.rolNaam)) rolTelling.set(norm(t.rolNaam), (rolTelling.get(norm(t.rolNaam)) ?? 0) + 1);

  const teamR: TeamResultaat[] = p.team.map((lid, i) => {
    const m = lid.medewerkerId ? medewerkerById.get(lid.medewerkerId) ?? null : null;
    const sleutel = m ? norm(m.tariefsleutel) : '';
    const tarief = sleutel && sleutel !== 'GEEN' ? tariefBySleutel.get(sleutel) : undefined;
    const basistarief = pos(tarief?.tariefBasisjaar ?? 0);
    const perWeek = new Array(nW).fill(0);
    for (const { rr } of werk) if (rr.actief && rr.teamIdx === i) for (let k = 0; k < nW; k++) perWeek[k] += rr.perWeek[k];
    for (let k = 0; k < nW; k++) perWeek[k] = schoon(perWeek[k]);
    const urenPerJaar: Record<number, number> = {};
    for (let k = 0; k < nW; k++) if (perWeek[k]) urenPerJaar[weken[k].jaar] = schoon((urenPerJaar[weken[k].jaar] ?? 0) + perWeek[k]);
    const jaren = Object.keys(urenPerJaar).map(Number).sort((a, b) => a - b);
    if (!jaren.length) jaren.push(eersteJaar);
    const tariefPerJaar: Record<number, number> = {};
    for (const y of jaren) tariefPerJaar[y] = basistarief * indexFactor(y);
    const urenTotaal = schoon(jaren.reduce((x, y) => x + (urenPerJaar[y] ?? 0), 0));
    let projecttarief = 0;
    if (pos(lid.tariefHandmatig) > 0) projecttarief = pos(lid.tariefHandmatig);
    else if (basistarief > 0) {
      projecttarief =
        urenTotaal > 0
          ? excelRoundUp(jaren.reduce((x, y) => x + (urenPerJaar[y] ?? 0) * tariefPerJaar[y], 0) / urenTotaal)
          : excelRoundUp(basistarief * indexFactor(eersteJaar));
    }
    const grens = pos(lid.beschikbaarUrenPerWeek) > 0 ? pos(lid.beschikbaarUrenPerWeek) : 5 * urenPerDag;
    const wekenOver = perWeek.filter((u) => u > grens + 1e-9).length;

    let status = '';
    let ernst: Ernst | null = null;
    const rolLeeg = !norm(lid.rolNaam);
    if (rolLeeg) {
      if (lid.medewerkerId) [status, ernst] = ['Rol ontbreekt', 'fout'];
    } else if (!lid.medewerkerId) [status, ernst] = ['Kies een medewerker', 'fout'];
    else if (!m) [status, ernst] = ['Medewerker niet in lijst Medewerkers', 'fout'];
    else if ((rolTelling.get(norm(lid.rolNaam)) ?? 0) > 1) [status, ernst] = ['Rol staat dubbel', 'fout'];
    else if (basistarief === 0 && !(pos(lid.tariefHandmatig) > 0)) [status, ernst] = ['Geen extern tarief – vul tarief handmatig in', 'fout'];
    else if (m.koppeling === 'Aanname') [status, ernst] = ['Let op: tariefniveau is een aanname', 'waarschuwing'];
    else status = 'OK';
    if (ernst) {
      meldingen.push({ ernst, tekst: `Team – ${lid.rolNaam || '(geen rol)'}: ${status}`, scherm: 'team', id: lid.id });
    }
    if (wekenOver > 0) {
      meldingen.push({
        ernst: 'waarschuwing',
        tekst: `Bezetting – ${lid.rolNaam}${m ? ` (${m.naam})` : ''}: ${wekenOver} ${wekenOver === 1 ? 'week' : 'weken'} boven ${grens} u/week`,
        scherm: 'bezetting',
        id: lid.id,
      });
    }

    return {
      lid,
      nr: i + 1,
      medewerker: m,
      functie: m?.functie ?? '',
      tariefsleutel: m?.tariefsleutel ?? '',
      basistarief,
      jaren,
      urenPerJaar,
      tariefPerJaar,
      projecttarief,
      urenTotaal,
      honorarium: 0,
      perWeek,
      grens,
      wekenOver,
      status,
      ernst,
    };
  });

  // ---- Status en kosten per regel (§7 #1–#6, #10) ----
  for (const { rr } of werk) {
    const r = rr.regel;
    if (regelLeeg(r)) continue;
    const fr = rr.faseIdx >= 0 ? fasesR[rr.faseIdx] : null;
    const tlIdx = r.teamlidId != null ? teamIdxById.get(r.teamlidId) ?? -1 : -1;
    let st: string;
    let ernst: Ernst = 'fout';
    if (!r.faseId) st = 'Kies een fase';
    else if (!fr) st = 'Fase niet gevonden';
    else if (!norm(fr.fase.code)) st = 'Fase heeft geen code';
    else if (pos(fr.fase.duurWeken) <= 0) st = 'Fase heeft geen duur';
    else if (!r.teamlidId) st = 'Kies een rol';
    else if (tlIdx < 0 || !norm(p.team[tlIdx].rolNaam)) st = 'Rol staat niet in Team';
    else if (!(pos(r.waarde) > 0)) st = 'Vul een waarde in';
    else if (rr.start == null || rr.eind == null) st = 'Startdatum project ontbreekt';
    else if (rr.eind < rr.start) st = 'Startweek ligt na einde fase';
    else if (rr.urenTotaal === 0 && r.methode === 'TOTAAL') st = 'Geen uren (beschikbaarheid 0%?)';
    else if (teamR[tlIdx].projecttarief === 0) st = 'Geen tarief voor deze rol (tab Team)';
    else if (fr.eindWeek != null && rr.eind > fr.eindWeek) {
      st = 'Let op: loopt door na einde fase';
      ernst = 'waarschuwing';
    } else {
      st = 'OK';
    }
    rr.status = st;
    if (st !== 'OK') {
      rr.ernst = ernst;
      const nr = p.inzet.indexOf(r) + 1;
      meldingen.push({ ernst, tekst: `Inzet regel ${nr}${r.activiteit ? ` (${r.activiteit})` : ''}: ${st}`, scherm: 'inzet', id: r.id });
    }
    if (rr.actief) {
      rr.tarief = teamR[rr.teamIdx].projecttarief;
      rr.kosten = schoon(rr.urenTotaal * rr.tarief);
      if (rr.weken) rr.gemPerWeek = Math.round((rr.urenTotaal / rr.weken) * 10) / 10;
    }
  }

  // ---- 6.6 / 6.7 Aggregaties ----
  const totaalPerWeek = new Array(nW).fill(0);
  for (const fr of fasesR) fr.perWeek = new Array(nW).fill(0);
  for (const { rr } of werk) {
    if (!rr.actief) continue;
    const fr = fasesR[rr.faseIdx];
    fr.uren += rr.urenTotaal;
    fr.honorarium += rr.kosten;
    teamR[rr.teamIdx].honorarium += rr.kosten;
    for (let k = 0; k < nW; k++) {
      fr.perWeek[k] += rr.perWeek[k];
      totaalPerWeek[k] += rr.perWeek[k];
    }
  }
  for (const fr of fasesR) {
    fr.uren = schoon(fr.uren);
    fr.honorarium = schoon(fr.honorarium);
    fr.perWeek = fr.perWeek.map(schoon);
  }
  for (const t of teamR) t.honorarium = schoon(t.honorarium);
  for (let k = 0; k < nW; k++) totaalPerWeek[k] = schoon(totaalPerWeek[k]);

  const urenTotaal = schoon(werk.reduce((x, { rr }) => x + (rr.actief ? rr.urenTotaal : 0), 0));
  const kostenTotaal = schoon(werk.reduce((x, { rr }) => x + (rr.actief ? rr.kosten : 0), 0));

  // Budget
  const opslagPct = pos(p.kantooropslagPct);
  const actieveFases = fasesR.map((f, i) => [f, i] as const).filter(([f]) => f.actief);
  const budgetUren = schoon(actieveFases.reduce((x, [f]) => x + f.uren, 0));
  const honorarium = schoon(actieveFases.reduce((x, [f]) => x + f.honorarium, 0));
  const kantooropslag = schoon(honorarium * opslagPct);
  const totaal = schoon(honorarium + kantooropslag);
  const vastePrijs = pos(p.vastePrijs) > 0 ? pos(p.vastePrijs) : null;

  const maanden = [...new Set(weken.map((w) => w.maandsleutel))];
  const maandIdx = new Map(maanden.map((m, i) => [m, i]));
  const rolFaseUren = p.team.map(() => new Array(p.fases.length).fill(0));
  const rolMaandUren = p.team.map(() => new Array(maanden.length).fill(0));
  const pacoMap = new Map<string, number>(); // teamIdx|faseIdx|maandsleutel → uren
  for (const { rr } of werk) {
    if (!rr.actief) continue;
    rolFaseUren[rr.teamIdx][rr.faseIdx] += rr.urenTotaal;
    for (let k = 0; k < nW; k++) {
      const u = rr.perWeek[k];
      if (!u) continue;
      const ms = weken[k].maandsleutel;
      rolMaandUren[rr.teamIdx][maandIdx.get(ms)!] += u;
      const key = `${rr.teamIdx}|${rr.faseIdx}|${ms}`;
      pacoMap.set(key, (pacoMap.get(key) ?? 0) + u);
    }
  }
  const rolMaandBedrag = rolMaandUren.map((rij, t) => rij.map((u) => schoon(u * teamR[t].projecttarief)));

  const budget: Budget = {
    perFase: actieveFases.map(([f, i]) => ({
      faseIdx: i,
      uren: f.uren,
      honorarium: f.honorarium,
      pct: honorarium ? f.honorarium / honorarium : null,
      opslag: schoon(f.honorarium * opslagPct),
      totaal: schoon(f.honorarium * (1 + opslagPct)),
    })),
    uren: budgetUren,
    honorarium,
    kantooropslag,
    totaal,
    vastePrijs,
    verschil: vastePrijs != null ? schoon(vastePrijs - totaal) : null,
    gemTarief: budgetUren ? honorarium / budgetUren : null,
    gemTariefVastePrijs: vastePrijs != null && budgetUren ? vastePrijs / budgetUren : null,
    maanden,
    rolFaseUren: rolFaseUren.map((r) => r.map(schoon)),
    rolMaandUren: rolMaandUren.map((r) => r.map(schoon)),
    rolMaandBedrag,
  };

  // ---- 6.8 PACO-export ----
  const paco: PacoRegel[] = [];
  for (const [key, urenRaw] of pacoMap) {
    const uren = schoon(urenRaw);
    if (uren <= 0) continue;
    const [t, f, ms] = key.split('|').map(Number);
    const tr = teamR[t];
    const fase = p.fases[f];
    const jaar = Math.floor(ms / 100);
    const maand = ms % 100;
    paco.push({
      projectnummer: p.pacoProjectnr ?? '',
      projectnaam: p.naam ?? '',
      fasecode: fase.pacoFasecode?.trim() || fase.code,
      fase: fase.naam,
      medewerker: tr.medewerker?.naam ?? '',
      pacoMedewerkernr: tr.medewerker?.pacoMedewerkernr ?? '',
      functie: tr.functie,
      rol: tr.lid.rolNaam,
      jaar,
      maand,
      periode: `${jaar}-${String(maand).padStart(2, '0')}`,
      uren,
      uurtarief: tr.projecttarief,
      bedrag: schoon(uren * tr.projecttarief),
      teamIdx: t,
      faseIdx: f,
    });
  }
  paco.sort((a, b) => a.teamIdx - b.teamIdx || a.faseIdx - b.faseIdx || a.jaar * 100 + a.maand - (b.jaar * 100 + b.maand));

  // #9 Totalen sluiten aan
  const pacoUren = schoon(paco.reduce((x, r) => x + r.uren, 0));
  const pacoBedrag = schoon(paco.reduce((x, r) => x + r.bedrag, 0));
  if (Math.abs(urenTotaal - budgetUren) >= 0.01 || Math.abs(urenTotaal - pacoUren) >= 0.01 || Math.abs(kostenTotaal - pacoBedrag) >= 0.5) {
    meldingen.push({ ernst: 'fout', tekst: 'Totalen sluiten niet aan (Planning / Budget / PACO)', scherm: 'paco' });
  }

  // #13 Vaste prijs
  if (vastePrijs != null && Math.abs(vastePrijs - totaal) >= 1) {
    meldingen.push({ ernst: 'info', tekst: 'Vaste prijs wijkt af van het berekende totaal', scherm: 'budget' });
  }

  return {
    geldig,
    projectMaandag,
    weken,
    fases: fasesR,
    regels: werk.map((x) => x.rr),
    team: teamR,
    totaalPerWeek,
    urenTotaal,
    kostenTotaal,
    budget,
    paco,
    meldingen,
    aantalFouten: meldingen.filter((m) => m.ernst === 'fout').length,
    aantalWaarschuwingen: meldingen.filter((m) => m.ernst === 'waarschuwing').length,
  };
}
