import { useMemo, useRef, useState } from 'react';
import { bereken } from '../core/calc';
import { dagNr, fmtDatum, isGeldigeDatum } from '../core/dates';
import { dupliceerProject, nieuwProject } from '../core/model';
import type { Project, Stamdata } from '../core/types';
import { projectUitJson } from '../io';
import { fmtEuro, fmtUren } from './format';

interface Props {
  projecten: Project[];
  setProjecten: (f: (p: Project[]) => Project[]) => void;
  stam: Stamdata;
  setStam: (f: (s: Stamdata) => Stamdata) => void;
}

export function Overzicht({ projecten, setProjecten, stam, setStam }: Props) {
  const [zoek, setZoek] = useState('');
  const [toonArchief, setToonArchief] = useState(false);
  const bestandRef = useRef<HTMLInputElement>(null);

  const lijst = useMemo(() => {
    const z = zoek.trim().toLowerCase();
    return projecten
      .filter((p) => !!p.gearchiveerd === toonArchief)
      .filter((p) => !z || [p.naam, p.opdrachtgever, p.pacoProjectnr].some((v) => (v ?? '').toLowerCase().includes(z)))
      .sort((a, b) => (b.gewijzigdOp ?? '').localeCompare(a.gewijzigdOp ?? ''));
  }, [projecten, zoek, toonArchief]);

  const nieuw = () => {
    const p = nieuwProject({ gewijzigdOp: new Date().toISOString() });
    setProjecten((l) => [...l, p]);
    location.hash = `/p/${p.id}/project`;
  };

  const importeer = async (f: File) => {
    try {
      const b = projectUitJson(await f.text());
      // Ontbrekende medewerkers toevoegen aan de stamdata
      setStam((s) => {
        const ids = new Set(s.medewerkers.map((m) => m.id));
        const extra = b.medewerkers.filter((m) => !ids.has(m.id));
        return extra.length ? { ...s, medewerkers: [...s.medewerkers, ...extra] } : s;
      });
      const bestaat = projecten.some((p) => p.id === b.project.id);
      const p = bestaat && !confirm(`Project '${b.project.naam}' bestaat al. Overschrijven? (Annuleren = als kopie importeren)`) ? dupliceerProject(b.project) : b.project;
      setProjecten((l) => [...l.filter((x) => x.id !== p.id), { ...p, gewijzigdOp: new Date().toISOString() }]);
    } catch (e) {
      alert(`Importeren mislukt: ${(e as Error).message}`);
    }
  };

  return (
    <section className="pagina">
      <h1>Projecten</h1>
      <div className="werkbalk">
        <button className="primair" onClick={nieuw}>
          + Nieuw project
        </button>
        <input className="zoek" placeholder="Zoeken op naam, opdrachtgever of projectnummer" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        <label className="vink">
          <input type="checkbox" checked={toonArchief} onChange={(e) => setToonArchief(e.target.checked)} /> Archief tonen
        </label>
        <span className="vul" />
        <button onClick={() => bestandRef.current?.click()}>Project importeren (JSON)</button>
        <input
          ref={bestandRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importeer(f);
            e.target.value = '';
          }}
        />
      </div>
      {lijst.length === 0 ? (
        <p className="leeg">{toonArchief ? 'Geen gearchiveerde projecten.' : 'Nog geen projecten. Klik op “Nieuw project”.'}</p>
      ) : (
        <table className="tabel">
          <thead>
            <tr>
              <th>Project</th>
              <th>Opdrachtgever</th>
              <th>PACO-nr</th>
              <th>Start</th>
              <th className="num">Uren</th>
              <th className="num">Totaal incl. opslag</th>
              <th>Status</th>
              <th>Gewijzigd</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lijst.map((p) => {
              const r = bereken(p, stam);
              return (
                <tr key={p.id}>
                  <td>
                    <a href={`#/p/${p.id}/planning`}>{p.naam || '(naamloos)'}</a>
                  </td>
                  <td>{p.opdrachtgever}</td>
                  <td>{p.pacoProjectnr}</td>
                  <td>{isGeldigeDatum(p.startdatum) ? fmtDatum(dagNr(p.startdatum)) : ''}</td>
                  <td className="num">{fmtUren(r.urenTotaal)}</td>
                  <td className="num">{fmtEuro(r.budget.totaal)}</td>
                  <td className={r.aantalFouten ? 'st-fout status' : 'st-ok status'}>{r.aantalFouten ? `⚠ ${r.aantalFouten}` : '✔'}</td>
                  <td>{p.gewijzigdOp ? new Date(p.gewijzigdOp).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td>
                  <td className="acties">
                    <button
                      onClick={() => {
                        const k = { ...dupliceerProject(p), gewijzigdOp: new Date().toISOString() };
                        setProjecten((l) => [...l, k]);
                      }}
                    >
                      Dupliceren
                    </button>
                    <button onClick={() => setProjecten((l) => l.map((x) => (x.id === p.id ? { ...x, gearchiveerd: !x.gearchiveerd } : x)))}>
                      {p.gearchiveerd ? 'Terugzetten' : 'Archiveren'}
                    </button>
                    {p.gearchiveerd && (
                      <button
                        className="gevaar"
                        onClick={() => confirm(`'${p.naam}' definitief verwijderen?`) && setProjecten((l) => l.filter((x) => x.id !== p.id))}
                      >
                        Verwijderen
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="voetnoot">
        Projecten worden automatisch opgeslagen in deze browser (lokale opslag). Maak met “Exporteren (JSON)” in een project een back-up of
        deel een project met een collega. Inloggen, delen en een centrale database volgen in een volgende stap.
      </p>
    </section>
  );
}
