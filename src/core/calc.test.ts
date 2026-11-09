// Acceptatie- en unit tests uit specificatie §12.

import { describe, expect, it } from 'vitest';
import { bereken } from './calc';
import { excelRound, excelRoundUp } from './round';
import { nlFeestdagenReeks } from './feestdagen';
import { nieuweFase, nieuweRegel, nieuwProject, nieuwTeamlid, zoekFaseOpCode, zoekTeamlidOpRol } from './model';
import type { Inzetregel, Medewerker, Project, Stamdata } from './types';

// Fictieve medewerkers; tarieven uit tab Tarieven van de template.
const mw = (id: string, sleutel: string, koppeling: Medewerker['koppeling'] = 'Bevestigd'): Medewerker => ({
  id,
  naam: `Medewerker ${id}`,
  functie: 'Test',
  tariefsleutel: sleutel,
  koppeling,
  actief: true,
});

const STAM: Stamdata = {
  medewerkers: [mw('a', 'SR-PM'), mw('b', 'MD-PM'), mw('c', 'SR-CON'), mw('d', 'GEEN'), mw('e', 'SR-PM', 'Aanname')],
  tarieven: [
    { sleutel: 'SR-PM', functie: 'Project Manager', tariefBasisjaar: 163 },
    { sleutel: 'SR-CON', functie: 'Consultant', tariefBasisjaar: 163 },
    { sleutel: 'MD-PM', functie: 'Project Manager', tariefBasisjaar: 142 },
    { sleutel: 'GEEN', functie: 'Geen extern tarief', tariefBasisjaar: null },
  ],
  feestdagen: nlFeestdagenReeks(2026, 2031),
};

/** Politie Zwolle-instellingen (§12.1) met de fasestructuur SO..RE. */
function zwolle(over: Partial<Project> = {}): Project {
  const fases = [
    nieuweFase({ code: 'SO', naam: 'Schetsontwerp', duurWeken: 5 }),
    nieuweFase({ code: 'VO', naam: 'Voorlopig ontwerp', duurWeken: 8 }),
    nieuweFase({ code: 'DO', naam: 'Definitief ontwerp', duurWeken: 13 }),
    nieuweFase({ code: 'TO', naam: 'Technisch ontwerp', duurWeken: 13 }),
    nieuweFase({ code: 'PC', naam: 'Prijsvorming', duurWeken: 13, startdatumHandmatig: '2027-09-06' }),
    nieuweFase({ code: 'UO', naam: 'Uitvoeringsgereed', duurWeken: 11, startdatumHandmatig: '2027-10-04' }),
    nieuweFase({ code: 'RE', naam: 'Realisatie', duurWeken: 52, startdatumHandmatig: '2028-01-03' }),
  ];
  const team = [
    nieuwTeamlid({ rolNaam: 'Projectleider', medewerkerId: 'a' }),
    nieuwTeamlid({ rolNaam: 'Projectcoördinator', medewerkerId: 'b' }),
    nieuwTeamlid({ rolNaam: 'Bouwkostendeskundige', medewerkerId: 'c' }),
  ];
  return nieuwProject({
    startdatum: '2027-01-04',
    afronding: 1,
    feestdagenMeenemen: false,
    basisjaarTarieven: 2026,
    indexatieAan: true,
    indexatiePct: 0.034,
    kantooropslagPct: 0.05,
    fases,
    team,
    ...over,
  });
}

function metRegel(p: Project, faseCode: string, velden: Partial<Inzetregel>, rol = 'Projectleider'): Project {
  p.inzet.push(nieuweRegel({ faseId: zoekFaseOpCode(p, faseCode)!.id, teamlidId: zoekTeamlidOpRol(p, rol)!.id, activiteit: 'test', ...velden }));
  return p;
}

const weken = (r: ReturnType<typeof bereken>, idx = 0) => {
  const rr = r.regels[idx];
  return rr.perWeek.slice(rr.start! - 1, rr.eind!);
};

describe('Excel-afronding', () => {
  it('rondt half weg van nul af, ook bij ruis', () => {
    expect(excelRound(2.5)).toBe(3);
    expect(excelRound(-2.5)).toBe(-3);
    expect(excelRound(240 / 19.2)).toBe(13); // 12.4999999… → 12.5 → 13
    expect(excelRoundUp(170.32)).toBe(171);
    expect(excelRoundUp(169.0000000000001)).toBe(169);
  });
});

describe('Feestdagen (§13)', () => {
  it('komen overeen met tab Feestdagen van de template, 2026–2031', () => {
    // Datums overgenomen uit 'Uren- en honorariumplanning v1.1 - template.xlsx', tab Feestdagen.
    const verwacht = {
      2026: ['2026-01-01', '2026-04-03', '2026-04-06', '2026-04-27', '2026-05-05', '2026-05-14', '2026-05-25', '2026-12-25', '2026-12-26'],
      2027: ['2027-01-01', '2027-03-26', '2027-03-29', '2027-04-27', '2027-05-05', '2027-05-06', '2027-05-17', '2027-12-25', '2027-12-26'],
      2028: ['2028-01-01', '2028-04-14', '2028-04-17', '2028-04-27', '2028-05-05', '2028-05-25', '2028-06-05', '2028-12-25', '2028-12-26'],
      2029: ['2029-01-01', '2029-03-30', '2029-04-02', '2029-04-27', '2029-05-05', '2029-05-10', '2029-05-21', '2029-12-25', '2029-12-26'],
      2030: ['2030-01-01', '2030-04-19', '2030-04-22', '2030-04-27', '2030-05-05', '2030-05-30', '2030-06-10', '2030-12-25', '2030-12-26'],
      2031: ['2031-01-01', '2031-04-11', '2031-04-14', '2031-04-26', '2031-05-05', '2031-05-22', '2031-06-02', '2031-12-25', '2031-12-26'],
    } as Record<number, string[]>;
    const alle = nlFeestdagenReeks(2026, 2031);
    for (const j of Object.keys(verwacht).map(Number)) {
      expect(alle.filter((f) => f.datum.startsWith(String(j))).map((f) => f.datum)).toEqual(verwacht[j]);
    }
    // Meetellen: Goede Vrijdag nee, Bevrijdingsdag alleen 2030.
    expect(alle.filter((f) => !f.meetellen).map((f) => f.datum)).toEqual([
      '2026-04-03', '2026-05-05', '2027-03-26', '2027-05-05', '2028-04-14', '2028-05-05',
      '2029-03-30', '2029-05-05', '2030-04-19', '2031-04-11', '2031-05-05',
    ]);
  });
});

describe('Fases (§6.2, §12.1)', () => {
  it('berekent start- en eindweken zoals Politie Zwolle', () => {
    const r = bereken(zwolle(), STAM);
    expect(r.fases.map((f) => [f.fase.code, f.startWeek, f.eindWeek])).toEqual([
      ['SO', 1, 5], ['VO', 6, 13], ['DO', 14, 26], ['TO', 27, 39], ['PC', 36, 48], ['UO', 40, 50], ['RE', 53, 104],
    ]);
  });
});

describe('Urenverdeling (§12.2)', () => {
  it('cumulatief gelijk: 40 uur over 6 weken = 7,6,7,7,6,7', () => {
    const p = metRegel(zwolle(), 'DO', { methode: 'TOTAAL', waarde: 40, aantalWeken: 6 });
    expect(weken(bereken(p, STAM))).toEqual([7, 6, 7, 7, 6, 7]);
  });

  it('gelijk exact: 40 uur over 5 weken = 8×5', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'TOTAAL', waarde: 40 });
    expect(weken(bereken(p, STAM))).toEqual([8, 8, 8, 8, 8]);
  });

  it('per week + feestdag: 12 u/wk in VO, week 13 (2e Paasdag) = 9,5', () => {
    const p = metRegel(zwolle({ feestdagenMeenemen: true, afronding: 0.5 }), 'VO', { methode: 'PER_WEEK', waarde: 12 });
    const r = bereken(p, STAM);
    expect(r.regels[0].start).toBe(6);
    expect(r.regels[0].eind).toBe(13);
    expect(weken(r)).toEqual([12, 12, 12, 12, 12, 12, 12, 9.5]);
  });

  it('oplopend + feestdagen: weken 14–19 = 2; 4,5; 6; 6,5; 8,5; 12,5', () => {
    const p = metRegel(zwolle({ feestdagenMeenemen: true, afronding: 0.5 }), 'DO', {
      methode: 'TOTAAL', waarde: 40, profiel: 'OPLOPEND', aantalWeken: 6,
    });
    const r = bereken(p, STAM);
    expect([r.regels[0].start, r.regels[0].eind]).toEqual([14, 19]);
    expect(weken(r)).toEqual([2, 4.5, 6, 6.5, 8.5, 12.5]);
    expect(r.regels[0].urenTotaal).toBe(40);
  });

  it('aflopend + feestdagen: 12; 10; 8; 5; 3; 2', () => {
    const p = metRegel(zwolle({ feestdagenMeenemen: true, afronding: 0.5 }), 'DO', {
      methode: 'TOTAAL', waarde: 40, profiel: 'AFLOPEND', aantalWeken: 6,
    });
    expect(weken(bereken(p, STAM))).toEqual([12, 10, 8, 5, 3, 2]);
  });

  it('dagen per week: 2 dagen × 8 u over 4 weken = 16×4', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'DAGEN_PER_WEEK', waarde: 2, aantalWeken: 4 });
    expect(weken(bereken(p, STAM))).toEqual([16, 16, 16, 16]);
  });

  it('lange reeks: 328 uur over 52 weken, halve uren, som exact', () => {
    const p = metRegel(zwolle({ afronding: 0.5 }), 'RE', { methode: 'TOTAAL', waarde: 328 });
    const w = weken(bereken(p, STAM));
    expect(w).toHaveLength(52);
    expect(w.reduce((a, b) => a + b, 0)).toBe(328);
    expect(new Set(w)).toEqual(new Set([6, 6.5]));
    expect(w.filter((x) => x === 6.5).length).toBeGreaterThan(26);
  });

  it('kerstsluiting: 0% in een week schuift uren naar andere weken', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'TOTAAL', waarde: 40 });
    p.kalenderAfwijkingen = [{ weekIndex: 3, beschikbaarheidPct: 0 }];
    const w = weken(bereken(p, STAM));
    expect(w[2]).toBe(0);
    expect(w).toEqual([10, 10, 0, 10, 10]);
  });

  it('venster helemaal op 0% geeft een foutmelding', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'TOTAAL', waarde: 40, aantalWeken: 1 });
    p.kalenderAfwijkingen = [{ weekIndex: 1, beschikbaarheidPct: 0 }];
    const r = bereken(p, STAM);
    expect(r.regels[0].status).toBe('Geen uren (beschikbaarheid 0%?)');
    expect(r.aantalFouten).toBe(1);
  });
});

describe('Tarieven en indexatie (§6.5, §12.1)', () => {
  // Uren per ISO-jaar zoals in Politie Zwolle; jaar 2027 = weken 1–52, jaar 2028 = weken 53–104.
  function tweeJaar(rol: string, u2027: number, u2028: number, p: Project) {
    if (u2027) metRegel(p, 'J1', { methode: 'TOTAAL', waarde: u2027 }, rol);
    if (u2028) metRegel(p, 'J2', { methode: 'TOTAAL', waarde: u2028 }, rol);
  }
  const project = () =>
    zwolle({
      fases: [nieuweFase({ code: 'J1', naam: '2027', duurWeken: 52 }), nieuweFase({ code: 'J2', naam: '2028', duurWeken: 52 })],
    });

  it('projecttarief = gewogen gemiddelde, naar boven afgerond: 171 / 149 / 169', () => {
    const p = project();
    tweeJaar('Projectleider', 728, 328, p);
    tweeJaar('Projectcoördinator', 186, 112, p);
    tweeJaar('Bouwkostendeskundige', 380, 0, p);
    const r = bereken(p, STAM);
    expect(r.weken[51].jaar).toBe(2027);
    expect(r.weken[52].jaar).toBe(2028);
    expect(r.team.map((t) => [t.urenPerJaar[2027] ?? 0, t.urenPerJaar[2028] ?? 0])).toEqual([[728, 328], [186, 112], [380, 0]]);
    expect(r.team[0].tariefPerJaar[2027]).toBeCloseTo(168.542, 9);
    expect(r.team[0].tariefPerJaar[2028]).toBeCloseTo(174.272428, 9);
    expect(r.team.map((t) => t.projecttarief)).toEqual([171, 149, 169]);
  });

  it('zonder uren: tarief van het eerste jaar, naar boven afgerond', () => {
    const r = bereken(project(), STAM);
    expect(r.team[0].projecttarief).toBe(169); // 168,542 → 169
  });

  it('handmatig tarief overschrijft', () => {
    const p = project();
    p.team[0].tariefHandmatig = 150;
    tweeJaar('Projectleider', 100, 0, p);
    const r = bereken(p, STAM);
    expect(r.team[0].projecttarief).toBe(150);
    expect(r.regels[0].kosten).toBe(15000);
  });

  it('kosten, kantooropslag en totaal', () => {
    const p = project();
    tweeJaar('Projectleider', 728, 328, p);
    const r = bereken(p, STAM);
    expect(r.budget.honorarium).toBe(1056 * 171);
    expect(r.budget.kantooropslag).toBeCloseTo(1056 * 171 * 0.05, 6);
    expect(r.budget.totaal).toBeCloseTo(1056 * 171 * 1.05, 6);
  });
});

describe('PACO-export (§6.8)', () => {
  it('maand van de donderdag; totalen sluiten aan', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'PER_WEEK', waarde: 10 });
    metRegel(p, 'VO', { methode: 'TOTAAL', waarde: 80 }, 'Projectcoördinator');
    const r = bereken(p, STAM);
    const eerste = r.paco[0];
    expect([eerste.fasecode, eerste.periode, eerste.uren, eerste.uurtarief]).toEqual(['SO', '2027-01', 40, 169]);
    expect(eerste.bedrag).toBe(40 * 169);
    expect([r.paco[1].periode, r.paco[1].uren]).toEqual(['2027-02', 10]); // week 5 = 1 feb 2027
    expect(r.paco.reduce((a, x) => a + x.uren, 0)).toBe(r.urenTotaal);
    expect(r.paco.every((x, i, arr) => i === 0 || arr[i - 1].teamIdx <= x.teamIdx)).toBe(true);
    expect(r.aantalFouten).toBe(0);
  });

  it('gebruikt de PACO-fasecode als die is ingevuld', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'PER_WEEK', waarde: 10 });
    p.fases[0].pacoFasecode = '100';
    expect(bereken(p, STAM).paco[0].fasecode).toBe('100');
  });
});

describe('Validaties (§7, §12.3)', () => {
  it('fase bestaat niet → fout', () => {
    const p = zwolle();
    p.inzet.push(nieuweRegel({ faseId: 'XX', teamlidId: p.team[0].id, waarde: 10 }));
    expect(bereken(p, STAM).regels[0].status).toBe('Fase niet gevonden');
  });

  it('rol niet in team → fout', () => {
    const p = zwolle();
    p.inzet.push(nieuweRegel({ faseId: p.fases[0].id, teamlidId: 'architect', waarde: 10 }));
    const r = bereken(p, STAM);
    expect(r.regels[0].status).toBe('Rol staat niet in Team');
    expect(r.regels[0].ernst).toBe('fout');
  });

  it('vanaf-week 4 + 5 weken in een fase van 5 weken → waarschuwing', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'PER_WEEK', waarde: 8, vanafWeekInFase: 4, aantalWeken: 5 });
    const r = bereken(p, STAM);
    expect(r.regels[0].status).toBe('Let op: loopt door na einde fase');
    expect(r.regels[0].ernst).toBe('waarschuwing');
    expect(r.aantalFouten).toBe(0);
  });

  it('vanaf-week na einde fase → fout', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'PER_WEEK', waarde: 8, vanafWeekInFase: 6 });
    // venster 6..5 is leeg
    expect(bereken(p, STAM).regels[0].status).toBe('Startweek ligt na einde fase');
  });

  it('waarde ≤ 0 en lege keuzes', () => {
    const p = zwolle();
    p.inzet.push(nieuweRegel({ faseId: p.fases[0].id, teamlidId: p.team[0].id, waarde: 0 }));
    p.inzet.push(nieuweRegel({ teamlidId: p.team[0].id, waarde: 5 }));
    p.inzet.push(nieuweRegel({ faseId: p.fases[0].id, waarde: 5 }));
    p.inzet.push(nieuweRegel()); // lege regel telt niet
    expect(bereken(p, STAM).regels.map((x) => x.status)).toEqual(['Vul een waarde in', 'Kies een fase', 'Kies een rol', '']);
  });

  it('codes matchen bij tekstimport: "VO " = "vo"', () => {
    const p = zwolle();
    p.fases[1].code = 'VO ';
    expect(zoekFaseOpCode(p, 'vo')?.id).toBe(p.fases[1].id);
  });

  it('rol dubbel, code dubbel, geen tarief, aanname, start vóór projectstart', () => {
    const p = zwolle();
    p.team.push(nieuwTeamlid({ rolNaam: 'projectleider ', medewerkerId: 'a' }));
    p.team.push(nieuwTeamlid({ rolNaam: 'Staf', medewerkerId: 'd' }));
    p.team.push(nieuwTeamlid({ rolNaam: 'Senior 2', medewerkerId: 'e' }));
    p.fases.push(nieuweFase({ code: 'so', naam: 'dubbel', duurWeken: 2 }));
    p.fases.push(nieuweFase({ code: 'XY', naam: 'vroeg', duurWeken: 2, startdatumHandmatig: '2026-12-01' }));
    const r = bereken(p, STAM);
    expect(r.team.map((t) => t.status)).toEqual([
      'Rol staat dubbel', 'OK', 'OK', 'Rol staat dubbel', 'Geen extern tarief – vul tarief handmatig in', 'Let op: tariefniveau is een aanname',
    ]);
    expect(r.fases.map((f) => f.status)).toEqual(['Code dubbel', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'Code dubbel', 'Start vóór projectstart']);
    expect(r.aantalWaarschuwingen).toBe(1);
  });

  it('overbezetting boven 5 × uren per dag', () => {
    const p = metRegel(zwolle(), 'SO', { methode: 'PER_WEEK', waarde: 30 });
    metRegel(p, 'SO', { methode: 'PER_WEEK', waarde: 12, aantalWeken: 2 });
    const r = bereken(p, STAM);
    expect(r.team[0].wekenOver).toBe(2);
    expect(r.meldingen.some((m) => m.scherm === 'bezetting' && m.ernst === 'waarschuwing')).toBe(true);
  });

  it('zonder startdatum: fout, geen weken', () => {
    const r = bereken(zwolle({ startdatum: null }), STAM);
    expect(r.aantalFouten).toBeGreaterThan(0);
    expect(r.weken).toHaveLength(0);
  });
});

describe('Prestatie (§10)', () => {
  it('200 regels × 156 weken binnen 200 ms', () => {
    const p = zwolle({
      fases: [nieuweFase({ code: 'A', naam: 'A', duurWeken: 156 })],
      feestdagenMeenemen: true,
      afronding: 0.25,
    });
    for (let i = 0; i < 200; i++) metRegel(p, 'A', { methode: i % 2 ? 'TOTAAL' : 'PER_WEEK', waarde: 100 + i, profiel: 'OPLOPEND' }, ['Projectleider', 'Projectcoördinator', 'Bouwkostendeskundige'][i % 3]);
    const t0 = performance.now();
    const r = bereken(p, STAM);
    const ms = performance.now() - t0;
    expect(r.weken).toHaveLength(156);
    expect(ms).toBeLessThan(200);
  });
});
