// Import en export: stamdata uit Excel, PACO-lijst (CSV/XLSX), project-back-up (JSON).

import type { Resultaat } from './core/calc';
import { norm } from './core/calc';
import type { Feestdag, Koppeling, Medewerker, Project, Stamdata, Tarief } from './core/types';

async function excel() {
  const mod = await import('exceljs');
  return (mod.default ?? mod) as typeof import('exceljs');
}

export function download(bestandsnaam: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = bestandsnaam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function veiligeNaam(s: string) {
  return (s || 'project').replace(/[\\/:*?"<>|]+/g, '_').trim();
}

// ---------- Stamdata uit Excel ----------

type Cel = string | number | boolean | Date | null;

function celWaarde(v: unknown): Cel {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('result' in o) return celWaarde(o.result);
    if ('richText' in o && Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('');
    if ('text' in o) return String(o.text);
    return null;
  }
  return v as Cel;
}

const tekst = (v: Cel) => (v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
const getal = (v: Cel) => (typeof v === 'number' ? v : v == null || v === '' ? null : Number.isFinite(Number(String(v).replace(',', '.'))) ? Number(String(v).replace(',', '.')) : null);

/** Leest een tabblad als lijst van objecten, op basis van de kopregel die `verplichteKop` bevat. */
function leesTabel(ws: import('exceljs').Worksheet, verplichteKop: string): Record<string, Cel>[] {
  let kopRij = -1;
  const koppen: Record<number, string> = {};
  ws.eachRow({ includeEmpty: false }, (row, nr) => {
    if (kopRij > 0) return;
    row.eachCell((cell) => {
      if (norm(tekst(celWaarde(cell.value))) === norm(verplichteKop)) kopRij = nr;
    });
    if (kopRij === nr) row.eachCell((cell, col) => (koppen[col] = norm(tekst(celWaarde(cell.value)))));
  });
  if (kopRij < 0) return [];
  const uit: Record<string, Cel>[] = [];
  ws.eachRow({ includeEmpty: false }, (row, nr) => {
    if (nr <= kopRij) return;
    const rec: Record<string, Cel> = {};
    for (const [col, kop] of Object.entries(koppen)) rec[kop] = celWaarde(row.getCell(Number(col)).value);
    uit.push(rec);
  });
  return uit;
}

function zoekTab(wb: import('exceljs').Workbook, ...namen: string[]) {
  for (const n of namen) {
    const ws = wb.worksheets.find((w) => norm(w.name) === norm(n)) ?? wb.worksheets.find((w) => norm(w.name).startsWith(norm(n)));
    if (ws) return ws;
  }
  return undefined;
}

export function medewerkerId(naam: string) {
  return `mw-${norm(naam).replace(/[^A-Z0-9]+/g, '-')}`;
}

export interface ImportResultaat {
  medewerkers?: Medewerker[];
  tarieven?: Tarief[];
  feestdagen?: Feestdag[];
  meldingen: string[];
}

/**
 * Leest de tabs Medewerkers, Tarieven (of 'Tarieven 2026') en Feestdagen uit een xlsx
 * met dezelfde kolomkoppen als de template v1.1.
 */
export async function importeerStamdataXlsx(bestand: File): Promise<ImportResultaat> {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await bestand.arrayBuffer());
  const res: ImportResultaat = { meldingen: [] };

  const wsT = zoekTab(wb, 'Tarieven');
  if (wsT) {
    const rijen = leesTabel(wsT, 'Sleutel');
    const tarieven: Tarief[] = [];
    for (const r of rijen) {
      const sleutel = tekst(r['SLEUTEL']);
      const functie = tekst(r['FUNCTIE']);
      if (!sleutel || !functie) continue;
      const tariefKop = Object.keys(r).find((k) => k.startsWith('TARIEF'));
      tarieven.push({
        sleutel,
        level: tekst(r['LEVEL']),
        functie,
        tariefBasisjaar: tariefKop ? getal(r[tariefKop]) : null,
        opmerking: tekst(r['OPMERKING']),
      });
    }
    res.tarieven = tarieven;
    res.meldingen.push(`Tarieven: ${tarieven.length} gelezen uit tab '${wsT.name}'.`);
  } else res.meldingen.push('Geen tab Tarieven gevonden.');

  const wsM = zoekTab(wb, 'Medewerkers');
  if (wsM) {
    const rijen = leesTabel(wsM, 'Medewerker');
    const medewerkers: Medewerker[] = [];
    for (const r of rijen) {
      const naam = tekst(r['MEDEWERKER']);
      if (!naam) continue;
      const k = tekst(r['KOPPELING']);
      const koppeling: Koppeling = k === 'Aanname' ? 'Aanname' : k === 'Plaatshouder' ? 'Plaatshouder' : 'Bevestigd';
      medewerkers.push({
        id: medewerkerId(naam),
        naam,
        functie: tekst(r['FUNCTIE']),
        businessLine: tekst(r['BUSINESS LINE']),
        team: tekst(r['TEAM / AFDELING'] ?? r['TEAM']),
        vestiging: tekst(r['VESTIGING']),
        tariefsleutel: tekst(r['TARIEFSLEUTEL']) || 'GEEN',
        koppeling,
        onderbouwing: tekst(r['ONDERBOUWING KOPPELING'] ?? r['ONDERBOUWING']),
        pacoMedewerkernr: tekst(r['PACO-MEDEWERKERNR']),
        email: tekst(r['E-MAIL']),
        actief: true,
      });
    }
    res.medewerkers = medewerkers;
    res.meldingen.push(
      `Medewerkers: ${medewerkers.length} gelezen uit tab '${wsM.name}' (waarvan ${medewerkers.filter((m) => m.koppeling === 'Aanname').length} met koppeling 'Aanname').`,
    );
  } else res.meldingen.push('Geen tab Medewerkers gevonden.');

  const wsF = zoekTab(wb, 'Feestdagen');
  if (wsF) {
    const rijen = leesTabel(wsF, 'Omschrijving');
    const feestdagen: Feestdag[] = [];
    for (const r of rijen) {
      const d = r['DATUM'];
      if (!(d instanceof Date)) continue;
      // exceljs levert datums als UTC-middernacht
      feestdagen.push({ datum: d.toISOString().slice(0, 10), omschrijving: tekst(r['OMSCHRIJVING']), meetellen: norm(tekst(r['MEETELLEN'])) === 'JA' });
    }
    res.feestdagen = feestdagen;
    res.meldingen.push(`Feestdagen: ${feestdagen.length} gelezen uit tab '${wsF.name}'.`);
  }
  return res;
}

export function pasImportToe(stam: Stamdata, imp: ImportResultaat): Stamdata {
  return {
    tarieven: imp.tarieven?.length ? imp.tarieven : stam.tarieven,
    medewerkers: imp.medewerkers?.length ? imp.medewerkers : stam.medewerkers,
    feestdagen: imp.feestdagen?.length ? imp.feestdagen : stam.feestdagen,
  };
}

// ---------- PACO-export ----------

const PACO_KOPPEN = ['Projectnummer', 'Projectnaam', 'Fasecode', 'Fase', 'Medewerker', 'PACO-medewerkernr', 'Functie', 'Rol', 'Jaar', 'Maand', 'Periode', 'Uren', 'Uurtarief', 'Bedrag'];

function pacoRijen(r: Resultaat['paco']) {
  return r.map((x) => [x.projectnummer, x.projectnaam, x.fasecode, x.fase, x.medewerker, x.pacoMedewerkernr, x.functie, x.rol, x.jaar, x.maand, x.periode, x.uren, x.uurtarief, x.bedrag]);
}

/** CSV: puntkomma, UTF-8 met BOM, decimale komma (§9). */
export function pacoCsv(rijen: Resultaat['paco']): string {
  const cel = (v: unknown) => {
    const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v ?? '');
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [PACO_KOPPEN, ...pacoRijen(rijen)].map((r) => r.map(cel).join(';')).join('\r\n') + '\r\n';
}

export async function pacoXlsx(rijen: Resultaat['paco']): Promise<ArrayBuffer> {
  const ExcelJS = await excel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('PACO-export');
  ws.addRow(PACO_KOPPEN).font = { bold: true };
  for (const r of pacoRijen(rijen)) ws.addRow(r);
  ws.getColumn(12).numFmt = '#,##0.00';
  ws.getColumn(13).numFmt = '€ #,##0';
  ws.getColumn(14).numFmt = '€ #,##0.00';
  ws.columns.forEach((c, i) => (c.width = [14, 28, 10, 24, 26, 16, 22, 22, 7, 7, 10, 9, 11, 13][i] ?? 12));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

// ---------- Project-back-up ----------

export interface ProjectBackup {
  formaat: 'fee-resourceplanner/project';
  versie: 1;
  geexporteerdOp: string;
  project: Project;
  /** Medewerkers waarnaar het project verwijst, zodat het elders terug te zetten is. */
  medewerkers: Medewerker[];
}

export function projectNaarJson(p: Project, stam: Stamdata): string {
  const ids = new Set(p.team.map((t) => t.medewerkerId));
  const b: ProjectBackup = {
    formaat: 'fee-resourceplanner/project',
    versie: 1,
    geexporteerdOp: new Date().toISOString(),
    project: p,
    medewerkers: stam.medewerkers.filter((m) => ids.has(m.id)),
  };
  return JSON.stringify(b, null, 2);
}

export function projectUitJson(tekstInhoud: string): ProjectBackup {
  const b = JSON.parse(tekstInhoud) as ProjectBackup;
  if (b?.formaat !== 'fee-resourceplanner/project' || !b.project?.id) throw new Error('Dit is geen project-back-up van de planningstool.');
  return b;
}
