import { useMemo, useRef, useState } from 'react';
import { dagNr, isGeldigeDatum } from '../core/dates';
import { nlFeestdagen } from '../core/feestdagen';
import { nieuwId } from '../core/model';
import type { Koppeling, Medewerker, Project, Stamdata } from '../core/types';
import { importeerStamdataXlsx, pasImportToe, type ImportResultaat } from '../io';
import { standaardStamdata } from '../store';
import { Datum, Getal, Keuze, Tekst } from './inputs';

export type BeheerTab = 'medewerkers' | 'tarieven' | 'feestdagen';

interface Props {
  tab: BeheerTab;
  stam: Stamdata;
  setStam: (f: (s: Stamdata) => Stamdata) => void;
  projecten: Project[];
}

const KOPPELINGEN: { waarde: Koppeling; label: string }[] = [
  { waarde: 'Bevestigd', label: 'Bevestigd' },
  { waarde: 'Aanname', label: 'Aanname' },
  { waarde: 'Plaatshouder', label: 'Plaatshouder' },
];

export function Beheer({ tab, stam, setStam, projecten }: Props) {
  const bestandRef = useRef<HTMLInputElement>(null);
  const [imp, setImp] = useState<{ res: ImportResultaat; naam: string } | null>(null);
  const [bezig, setBezig] = useState(false);

  const kiesBestand = async (f: File) => {
    setBezig(true);
    try {
      setImp({ res: await importeerStamdataXlsx(f), naam: f.name });
    } catch (e) {
      alert(`Inlezen mislukt: ${(e as Error).message}`);
    } finally {
      setBezig(false);
    }
  };

  return (
    <section className="pagina">
      <h1>Beheer</h1>
      <p className="uitleg">
        Stamdata voor alle projecten in deze browser. Wijzigt een tarief, dan rekenen bestaande projecten automatisch mee. In de definitieve versie
        beheert finance/bedrijfsbureau dit centraal (spec §3).
      </p>
      <div className="werkbalk">
        <nav className="tabs klein">
          <a href="#/beheer/medewerkers" className={tab === 'medewerkers' ? 'actief' : ''}>
            Medewerkers ({stam.medewerkers.length})
          </a>
          <a href="#/beheer/tarieven" className={tab === 'tarieven' ? 'actief' : ''}>
            Tarieven ({stam.tarieven.length})
          </a>
          <a href="#/beheer/feestdagen" className={tab === 'feestdagen' ? 'actief' : ''}>
            Feestdagen ({stam.feestdagen.length})
          </a>
        </nav>
        <span className="vul" />
        <button className="primair" disabled={bezig} onClick={() => bestandRef.current?.click()}>
          {bezig ? 'Bezig met inlezen…' : 'Importeren uit Excel…'}
        </button>
        <input
          ref={bestandRef}
          type="file"
          accept=".xlsx"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) kiesBestand(f);
            e.target.value = '';
          }}
        />
      </div>

      {imp && (
        <div className="plakvenster">
          <p>
            <b>{imp.naam}</b>
          </p>
          <ul>
            {imp.res.meldingen.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p>Toepassen vervangt de bestaande lijsten die in het bestand gevonden zijn. Teamleden blijven gekoppeld zolang de naam gelijk is.</p>
          <button
            className="primair"
            onClick={() => {
              setStam((s) => pasImportToe(s, imp.res));
              setImp(null);
            }}
          >
            Toepassen
          </button>
          <button onClick={() => setImp(null)}>Annuleren</button>
        </div>
      )}

      {tab === 'medewerkers' && <Medewerkers stam={stam} setStam={setStam} projecten={projecten} />}
      {tab === 'tarieven' && <Tarieven stam={stam} setStam={setStam} />}
      {tab === 'feestdagen' && <Feestdagen stam={stam} setStam={setStam} />}

      <p className="voetnoot">
        Importeren werkt met de template (‘Uren- en honorariumplanning v1.1’) of een bestand met dezelfde tabs en kolomkoppen: Medewerkers,
        Tarieven en Feestdagen.{' '}
        <button
          className="link"
          onClick={() => confirm('Alle stamdata terugzetten naar de standaard (alleen plaatshouders, standaardtarieven en feestdagen)?') && setStam(() => standaardStamdata())}
        >
          Standaard herstellen
        </button>
      </p>
    </section>
  );
}

function Medewerkers({ stam, setStam, projecten }: Omit<Props, 'tab'>) {
  const [zoek, setZoek] = useState('');
  const gebruikt = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projecten) for (const t of p.team) if (t.medewerkerId) m.set(t.medewerkerId, (m.get(t.medewerkerId) ?? 0) + 1);
    return m;
  }, [projecten]);
  const sleutels = stam.tarieven.map((t) => ({ waarde: t.sleutel, label: t.sleutel }));
  const zet = (id: string, f: (m: Medewerker) => void) =>
    setStam((s) => ({ ...s, medewerkers: s.medewerkers.map((m) => (m.id === id ? (() => { const c = { ...m }; f(c); return c; })() : m)) }));
  const z = zoek.trim().toLowerCase();
  const lijst = stam.medewerkers.filter((m) => !z || [m.naam, m.functie, m.tariefsleutel, m.team, m.vestiging].some((v) => (v ?? '').toLowerCase().includes(z)));

  return (
    <div className="kaart breed">
      <div className="werkbalk">
        <input className="zoek" placeholder="Zoeken" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        <button
          onClick={() =>
            setStam((s) => ({ ...s, medewerkers: [...s.medewerkers, { id: nieuwId(), naam: '', functie: '', tariefsleutel: 'GEEN', koppeling: 'Bevestigd', actief: true }] }))
          }
        >
          + Medewerker
        </button>
      </div>
      <div className="scroll-x">
        <table className="tabel invoertabel">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Functie</th>
              <th>Business line</th>
              <th>Team</th>
              <th>Vestiging</th>
              <th>Tariefsleutel</th>
              <th>Koppeling</th>
              <th>Onderbouwing</th>
              <th>PACO-nr</th>
              <th>Actief</th>
              <th>In projecten</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lijst.map((m) => (
              <tr key={m.id}>
                <td>
                  <Tekst className="breed" waarde={m.naam} onWijzig={(v) => zet(m.id, (x) => void (x.naam = v))} />
                </td>
                <td>
                  <Tekst waarde={m.functie} onWijzig={(v) => zet(m.id, (x) => void (x.functie = v))} />
                </td>
                <td>
                  <Tekst waarde={m.businessLine} onWijzig={(v) => zet(m.id, (x) => void (x.businessLine = v))} />
                </td>
                <td>
                  <Tekst waarde={m.team} onWijzig={(v) => zet(m.id, (x) => void (x.team = v))} />
                </td>
                <td>
                  <Tekst className="smal" waarde={m.vestiging} onWijzig={(v) => zet(m.id, (x) => void (x.vestiging = v))} />
                </td>
                <td>
                  <Keuze waarde={m.tariefsleutel} opties={sleutels} onWijzig={(v) => zet(m.id, (x) => void (x.tariefsleutel = v ?? 'GEEN'))} />
                </td>
                <td className={m.koppeling === 'Aanname' ? 'st-let' : ''}>
                  <Keuze waarde={m.koppeling} opties={KOPPELINGEN} onWijzig={(v) => zet(m.id, (x) => void (x.koppeling = v ?? 'Bevestigd'))} />
                </td>
                <td>
                  <Tekst waarde={m.onderbouwing} onWijzig={(v) => zet(m.id, (x) => void (x.onderbouwing = v))} />
                </td>
                <td>
                  <Tekst className="smal" waarde={m.pacoMedewerkernr} onWijzig={(v) => zet(m.id, (x) => void (x.pacoMedewerkernr = v))} />
                </td>
                <td>
                  <input type="checkbox" checked={m.actief} onChange={(e) => zet(m.id, (x) => void (x.actief = e.target.checked))} />
                </td>
                <td className="num">{gebruikt.get(m.id) ?? ''}</td>
                <td>
                  <button
                    className="gevaar"
                    disabled={gebruikt.has(m.id)}
                    title={gebruikt.has(m.id) ? 'In gebruik; zet op niet-actief' : 'Verwijderen'}
                    onClick={() => setStam((s) => ({ ...s, medewerkers: s.medewerkers.filter((x) => x.id !== m.id) }))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Tarieven({ stam, setStam }: Pick<Props, 'stam' | 'setStam'>) {
  const zet = (i: number, f: (t: Stamdata['tarieven'][number]) => void) =>
    setStam((s) => ({ ...s, tarieven: s.tarieven.map((t, j) => (j === i ? (() => { const c = { ...t }; f(c); return c; })() : t)) }));
  return (
    <div className="kaart breed">
      <p className="uitleg">Tarieven in het basisjaar (excl. kantooropslag). Sleutel ‘GEEN’ = geen extern tarief; dan is een handmatig tarief in Team nodig.</p>
      <table className="tabel invoertabel">
        <thead>
          <tr>
            <th>Sleutel</th>
            <th>Level</th>
            <th>Functie</th>
            <th>Tarief basisjaar (€/uur)</th>
            <th>Opmerking</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {stam.tarieven.map((t, i) => (
            <tr key={i}>
              <td>
                <Tekst className="smal" waarde={t.sleutel} onWijzig={(v) => zet(i, (x) => void (x.sleutel = v.trim().toUpperCase()))} />
              </td>
              <td>
                <Tekst className="smal" waarde={t.level} onWijzig={(v) => zet(i, (x) => void (x.level = v))} />
              </td>
              <td>
                <Tekst className="breed" waarde={t.functie} onWijzig={(v) => zet(i, (x) => void (x.functie = v))} />
              </td>
              <td>
                <Getal className="smal" waarde={t.tariefBasisjaar} onWijzig={(v) => zet(i, (x) => void (x.tariefBasisjaar = v))} />
              </td>
              <td>
                <Tekst className="breed" waarde={t.opmerking} onWijzig={(v) => zet(i, (x) => void (x.opmerking = v))} />
              </td>
              <td>
                <button
                  className="gevaar"
                  disabled={stam.medewerkers.some((m) => m.tariefsleutel === t.sleutel)}
                  title="Alleen te verwijderen als geen medewerker deze sleutel heeft"
                  onClick={() => setStam((s) => ({ ...s, tarieven: s.tarieven.filter((_, j) => j !== i) }))}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => setStam((s) => ({ ...s, tarieven: [...s.tarieven, { sleutel: '', functie: '', tariefBasisjaar: null }] }))}>+ Tariefgroep</button>
    </div>
  );
}

function Feestdagen({ stam, setStam }: Pick<Props, 'stam' | 'setStam'>) {
  const gesorteerd = [...stam.feestdagen].map((f, i) => ({ f, i })).sort((a, b) => a.f.datum.localeCompare(b.f.datum));
  const laatsteJaar = Math.max(0, ...stam.feestdagen.map((f) => Number(f.datum.slice(0, 4))));
  const zet = (i: number, f: (x: Stamdata['feestdagen'][number]) => void) =>
    setStam((s) => ({ ...s, feestdagen: s.feestdagen.map((t, j) => (j === i ? (() => { const c = { ...t }; f(c); return c; })() : t)) }));
  return (
    <div className="kaart breed">
      <p className="uitleg">
        Officiële Nederlandse feestdagen (Pasen berekend). ‘Meetellen’ bepaalt of een dag de beschikbaarheid verlaagt. Standaard: Goede Vrijdag
        nee, Bevrijdingsdag alleen in lustrumjaren. <i>Aanname uit spec §13 – controleren aan de hand van de D&amp;S-arbeidsvoorwaarden.</i>
      </p>
      <div className="werkbalk">
        <button onClick={() => setStam((s) => ({ ...s, feestdagen: [...s.feestdagen, ...nlFeestdagen(laatsteJaar + 1)] }))}>+ Jaar {laatsteJaar + 1} toevoegen</button>
        <button onClick={() => setStam((s) => ({ ...s, feestdagen: [...s.feestdagen, { datum: '', omschrijving: '', meetellen: true }] }))}>+ Losse dag</button>
      </div>
      <table className="tabel invoertabel">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Dag</th>
            <th>Omschrijving</th>
            <th>Meetellen</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {gesorteerd.map(({ f, i }) => (
            <tr key={i}>
              <td>
                <Datum waarde={f.datum} onWijzig={(v) => zet(i, (x) => void (x.datum = v ?? ''))} />
              </td>
              <td className="berekend">
                {isGeldigeDatum(f.datum) ? ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'][(((dagNr(f.datum) + 3) % 7) + 7) % 7] : ''}
              </td>
              <td>
                <Tekst waarde={f.omschrijving} onWijzig={(v) => zet(i, (x) => void (x.omschrijving = v))} />
              </td>
              <td>
                <input type="checkbox" checked={f.meetellen} onChange={(e) => zet(i, (x) => void (x.meetellen = e.target.checked))} />
              </td>
              <td>
                <button className="gevaar" onClick={() => setStam((s) => ({ ...s, feestdagen: s.feestdagen.filter((_, j) => j !== i) }))}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
