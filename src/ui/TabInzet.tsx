import { useRef, useState, type KeyboardEvent } from 'react';
import { fmtDatum } from '../core/dates';
import { nieuweRegel, nieuwId, zoekFaseOpCode, zoekTeamlidOpRol } from '../core/model';
import type { Inzetregel, Methode, Profiel, Project } from '../core/types';
import { fmtEuro, fmtUren, parseGetal } from './format';
import { Getal, Keuze, StatusCel, Tekst } from './inputs';
import { useFocus, type TabProps } from './ProjectScherm';
import { faseKleur } from './TabProject';

export const METHODES: { waarde: Methode; label: string }[] = [
  { waarde: 'TOTAAL', label: 'Totaal uren' },
  { waarde: 'PER_WEEK', label: 'Uren per week' },
  { waarde: 'DAGEN_PER_WEEK', label: 'Dagen per week' },
];
export const PROFIELEN: { waarde: Profiel; label: string }[] = [
  { waarde: 'GELIJK', label: 'Gelijk' },
  { waarde: 'OPLOPEND', label: 'Oplopend' },
  { waarde: 'AFLOPEND', label: 'Aflopend' },
];

// Invoerkolommen in de volgorde van de Excel-template (tab Inzet, kolom B t/m J).
const KOLOMMEN = ['fase', 'activiteit', 'rol', 'methode', 'waarde', 'verdeling', 'vanaf', 'aantal', 'opmerking'] as const;

function methodeUitTekst(s: string): Methode | undefined {
  const t = s.trim().toLowerCase();
  if (!t) return undefined;
  if (t.startsWith('dag')) return 'DAGEN_PER_WEEK';
  if (t.includes('per week') || t === 'per_week' || t.startsWith('uren p')) return 'PER_WEEK';
  if (t.startsWith('totaal')) return 'TOTAAL';
  return METHODES.find((m) => m.waarde === s.trim().toUpperCase())?.waarde;
}
function profielUitTekst(s: string): Profiel | undefined {
  const t = s.trim().toLowerCase();
  return PROFIELEN.find((p) => p.label.toLowerCase() === t || p.waarde.toLowerCase() === t)?.waarde;
}

/** Zet één geplakte celwaarde op een regel. Fase en rol koppelen op tekst (§6.9). */
function zetCel(p: Project, r: Inzetregel, kol: (typeof KOLOMMEN)[number], v: string, meldingen: string[]) {
  switch (kol) {
    case 'fase': {
      if (!v.trim()) return void (r.faseId = null);
      const f = zoekFaseOpCode(p, v);
      if (f) r.faseId = f.id;
      else meldingen.push(`Fase '${v.trim()}' niet gevonden`);
      return;
    }
    case 'rol': {
      if (!v.trim()) return void (r.teamlidId = null);
      const t = zoekTeamlidOpRol(p, v);
      if (t) r.teamlidId = t.id;
      else meldingen.push(`Rol '${v.trim()}' staat niet in Team`);
      return;
    }
    case 'activiteit':
      return void (r.activiteit = v.trim());
    case 'opmerking':
      return void (r.opmerking = v.trim());
    case 'methode':
      return void (r.methode = methodeUitTekst(v) ?? r.methode);
    case 'verdeling':
      return void (r.profiel = profielUitTekst(v) ?? r.profiel);
    case 'waarde':
      return void (r.waarde = parseGetal(v));
    case 'vanaf':
      return void (r.vanafWeekInFase = parseGetal(v));
    case 'aantal':
      return void (r.aantalWeken = parseGetal(v));
  }
}

/** Plakt een blok tab-gescheiden tekst (uit Excel) vanaf rij/kolom; maakt regels bij waar nodig. */
export function plakBlok(d: Project, tekst: string, rij: number, kol: number): string[] {
  const meldingen: string[] = [];
  const regels = tekst.replace(/\r/g, '').replace(/\n$/, '').split('\n');
  regels.forEach((lijn, i) => {
    const doel = rij + i;
    while (d.inzet.length <= doel) d.inzet.push(nieuweRegel());
    lijn.split('\t').forEach((cel, j) => {
      const k = KOLOMMEN[kol + j];
      if (k) zetCel(d, d.inzet[doel], k, cel, meldingen);
    });
  });
  return meldingen;
}

export function TabInzet({ p, r, wijzig, focus }: TabProps) {
  useFocus(focus);
  const sleep = useRef<number | null>(null);
  const [plakVenster, setPlakVenster] = useState(false);
  const [plakTekst, setPlakTekst] = useState('');
  const [meldingen, setMeldingen] = useState<string[]>([]);

  const faseOpties = p.fases.map((f, i) => ({ waarde: f.id, label: f.code ? `${f.code} – ${f.naam}` : `(fase ${i + 1})` }));
  const rolOpties = p.team.map((t, i) => ({ waarde: t.id, label: t.rolNaam || `(rol ${i + 1})` }));

  const verplaatsFocus = (rij: number, kol: number) =>
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-rij="${rij}"][data-col="${kol}"]`);
      el?.focus();
      if (el instanceof HTMLInputElement) el.select();
    }, 0);

  const toetsen = (e: KeyboardEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;
    const rij = Number(t.dataset.rij);
    const kol = Number(t.dataset.col);
    if (!Number.isFinite(rij) || !Number.isFinite(kol)) return;
    const isSelect = t.tagName === 'SELECT';
    if (e.key === 'Enter' || (!isSelect && e.key === 'ArrowDown')) {
      e.preventDefault();
      if (rij === p.inzet.length - 1 && e.key === 'Enter') wijzig((d) => void d.inzet.push(nieuweRegel()));
      verplaatsFocus(rij + 1, kol);
    } else if (!isSelect && e.key === 'ArrowUp') {
      e.preventDefault();
      verplaatsFocus(rij - 1, kol);
    }
  };

  const plakken = (e: React.ClipboardEvent<HTMLElement>) => {
    const tekst = e.clipboardData.getData('text/plain');
    if (!/[\t\n]/.test(tekst.replace(/\r?\n$/, ''))) return; // gewone plak in één cel
    const el = document.activeElement as HTMLElement | null;
    const rij = Number(el?.dataset.rij);
    const kol = Number(el?.dataset.col);
    if (!Number.isFinite(rij) || !Number.isFinite(kol)) return;
    e.preventDefault();
    setMeldingen(plakBlok(structuredClone(p), tekst, rij, kol)); // proefrun voor de meldingen
    wijzig((d) => void plakBlok(d, tekst, rij, kol));
  };

  const cel = (rij: number, kol: number) => ({ 'data-rij': rij, 'data-col': kol });

  return (
    <div className="kaart breed">
      <h2>Inzet per activiteit</h2>
      <p className="uitleg">
        Eén regel per activiteit; de volgorde is vrij (de Planning groepeert per fase). <b>Totaal uren</b> wordt over de weken verdeeld (Gelijk /
        Oplopend / Aflopend). <b>Uren per week</b> en <b>Dagen per week</b> gelden voor elke week. Vanaf week = week binnen de fase (leeg = 1).
        Aantal weken leeg = tot einde fase. Enter = volgende regel; plakken uit Excel kan direct in de tabel (kolommen zoals de template: Fase t/m
        Opmerking).
      </p>
      <div className="werkbalk">
        <button onClick={() => wijzig((d) => void d.inzet.push(nieuweRegel()))}>+ Regel</button>
        <button onClick={() => setPlakVenster((x) => !x)}>Plakken uit Excel…</button>
        <span className="vul" />
        <span className="sub">
          {p.inzet.length} regels · {fmtUren(r.urenTotaal)} uur · {fmtEuro(r.kostenTotaal)}
        </span>
      </div>
      {plakVenster && (
        <div className="plakvenster">
          <p>
            Plak hier regels uit de Excel-tab Inzet (kolommen Fase, Activiteit, Rol, Invoermethode, Waarde, Verdeling, Vanaf week, Aantal weken,
            Opmerking). Ze worden onderaan toegevoegd.
          </p>
          <textarea rows={6} value={plakTekst} onChange={(e) => setPlakTekst(e.target.value)} />
          <div>
            <button
              className="primair"
              onClick={() => {
                const lijst = plakTekst
                  .split(/\r?\n/)
                  .filter((l) => l.replace(/\t/g, '').trim())
                  .join('\n');
                setMeldingen(plakBlok(structuredClone(p), lijst, p.inzet.length, 0));
                wijzig((d) => void plakBlok(d, lijst, d.inzet.length, 0));
                setPlakTekst('');
                setPlakVenster(false);
              }}
            >
              Toevoegen
            </button>
            <button onClick={() => setPlakVenster(false)}>Annuleren</button>
          </div>
        </div>
      )}
      {meldingen.length > 0 && (
        <div className="melding st-let">
          Bij het plakken: {meldingen.slice(0, 8).join('; ')}
          {meldingen.length > 8 && ` (+${meldingen.length - 8})`}. <button onClick={() => setMeldingen([])}>Sluiten</button>
        </div>
      )}
      <div className="scroll-x">
        <table className="tabel invoertabel inzet" onKeyDown={toetsen} onPaste={plakken}>
          <thead>
            <tr>
              <th />
              <th>#</th>
              <th>Fase</th>
              <th>Activiteit</th>
              <th>Rol</th>
              <th>Invoermethode</th>
              <th>Waarde</th>
              <th>Verdeling</th>
              <th>Vanaf wk</th>
              <th>Aantal wk</th>
              <th>Opmerking</th>
              <th>Medewerker</th>
              <th>Van</th>
              <th>T/m</th>
              <th className="num">Wkn</th>
              <th className="num">Uren</th>
              <th className="num">Gem/wk</th>
              <th className="num">Tarief</th>
              <th className="num">Kosten</th>
              <th>Controle</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.inzet.map((regel, i) => {
              const rr = r.regels[i];
              const zet = (fn: (x: Inzetregel) => void) => wijzig((d) => fn(d.inzet[i]));
              const kleur = rr.faseIdx >= 0 ? faseKleur(rr.faseIdx)[0] : 'transparent';
              return (
                <tr
                  key={regel.id}
                  id={`rij-${regel.id}`}
                  onDragOver={(e) => sleep.current != null && e.preventDefault()}
                  onDrop={() => {
                    const van = sleep.current;
                    sleep.current = null;
                    if (van == null || van === i) return;
                    wijzig((d) => d.inzet.splice(i, 0, d.inzet.splice(van, 1)[0]));
                  }}
                >
                  <td className="greep" draggable onDragStart={() => (sleep.current = i)} title="Slepen om te verplaatsen" style={{ borderLeft: `4px solid ${kleur}` }}>
                    ⠿
                  </td>
                  <td>{i + 1}</td>
                  <td>
                    <Keuze {...cel(i, 0)} waarde={regel.faseId} leeg="–" opties={faseOpties} onWijzig={(v) => zet((x) => void (x.faseId = v))} />
                  </td>
                  <td>
                    <Tekst {...cel(i, 1)} className="breed" waarde={regel.activiteit} onWijzig={(v) => zet((x) => void (x.activiteit = v))} />
                  </td>
                  <td>
                    <Keuze {...cel(i, 2)} waarde={regel.teamlidId} leeg="–" opties={rolOpties} onWijzig={(v) => zet((x) => void (x.teamlidId = v))} />
                  </td>
                  <td>
                    <Keuze {...cel(i, 3)} waarde={regel.methode} opties={METHODES} onWijzig={(v) => zet((x) => void (x.methode = v ?? 'TOTAAL'))} />
                  </td>
                  <td>
                    <Getal {...cel(i, 4)} className="smal" waarde={regel.waarde} onWijzig={(v) => zet((x) => void (x.waarde = v))} />
                  </td>
                  <td>
                    <Keuze
                      {...cel(i, 5)}
                      waarde={regel.profiel}
                      opties={PROFIELEN}
                      disabled={regel.methode !== 'TOTAAL'}
                      onWijzig={(v) => zet((x) => void (x.profiel = v ?? 'GELIJK'))}
                    />
                  </td>
                  <td>
                    <Getal {...cel(i, 6)} className="smal" waarde={regel.vanafWeekInFase} onWijzig={(v) => zet((x) => void (x.vanafWeekInFase = v))} />
                  </td>
                  <td>
                    <Getal {...cel(i, 7)} className="smal" waarde={regel.aantalWeken} onWijzig={(v) => zet((x) => void (x.aantalWeken = v))} />
                  </td>
                  <td>
                    <Tekst {...cel(i, 8)} waarde={regel.opmerking} onWijzig={(v) => zet((x) => void (x.opmerking = v))} />
                  </td>
                  <td className="berekend">{rr.teamIdx >= 0 ? r.team[rr.teamIdx].medewerker?.naam ?? '' : ''}</td>
                  <td className="berekend">{rr.start != null && r.projectMaandag != null ? fmtDatum(r.projectMaandag + (rr.start - 1) * 7) : ''}</td>
                  <td className="berekend">{rr.eind != null && r.projectMaandag != null ? fmtDatum(r.projectMaandag + (rr.eind - 1) * 7 + 4) : ''}</td>
                  <td className="berekend num">{rr.weken ?? ''}</td>
                  <td className="berekend num">{rr.actief ? fmtUren(rr.urenTotaal) : ''}</td>
                  <td className="berekend num">{rr.gemPerWeek != null ? fmtUren(rr.gemPerWeek) : ''}</td>
                  <td className="berekend num">{rr.actief && rr.tarief ? fmtEuro(rr.tarief) : ''}</td>
                  <td className="berekend num">{rr.actief ? fmtEuro(rr.kosten) : ''}</td>
                  <StatusCel tekst={rr.status} ernst={rr.ernst} />
                  <td className="acties">
                    <button title="Dupliceren" onClick={() => wijzig((d) => void d.inzet.splice(i + 1, 0, { ...structuredClone(d.inzet[i]), id: nieuwId() }))}>
                      ⧉
                    </button>
                    <button className="gevaar" title="Verwijderen" onClick={() => wijzig((d) => void d.inzet.splice(i, 1))}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
