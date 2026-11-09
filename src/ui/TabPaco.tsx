import { useMemo, useState } from 'react';
import { download, pacoCsv, pacoXlsx, veiligeNaam } from '../io';
import { fmtEuro, fmtEuro2, fmtUren } from './format';
import { type TabProps } from './ProjectScherm';

export function TabPaco({ p, r }: TabProps) {
  const [medewerker, setMedewerker] = useState('');
  const [fase, setFase] = useState('');
  const [periode, setPeriode] = useState('');

  const rijen = useMemo(
    () => r.paco.filter((x) => (!medewerker || x.medewerker === medewerker) && (!fase || x.fasecode === fase) && (!periode || x.periode.startsWith(periode))),
    [r.paco, medewerker, fase, periode],
  );
  const uniek = (f: (x: (typeof r.paco)[number]) => string) => [...new Set(r.paco.map(f))];
  const totUren = rijen.reduce((s, x) => s + x.uren, 0);
  const totBedrag = rijen.reduce((s, x) => s + x.bedrag, 0);
  const sluitAan = Math.abs(r.paco.reduce((s, x) => s + x.uren, 0) - r.urenTotaal) < 0.01;
  const naam = `PACO ${veiligeNaam(p.pacoProjectnr || p.naam)}`;

  return (
    <div className="kaart breed">
      <h2>PACO-export</h2>
      <p className="uitleg">
        Eén regel per medewerker × fase × maand (alleen regels met uren). Een week die over een maandgrens valt, telt mee in de maand van zijn
        donderdag (ISO 8601).
      </p>
      <div className="werkbalk">
        <select value={medewerker} onChange={(e) => setMedewerker(e.target.value)}>
          <option value="">Alle medewerkers</option>
          {uniek((x) => x.medewerker).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select value={fase} onChange={(e) => setFase(e.target.value)}>
          <option value="">Alle fases</option>
          {uniek((x) => x.fasecode).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select value={periode} onChange={(e) => setPeriode(e.target.value)}>
          <option value="">Alle jaren</option>
          {uniek((x) => String(x.jaar)).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <span className="vul" />
        <span className={`pil ${sluitAan ? 'st-ok' : 'st-fout'}`}>{sluitAan ? '✔ Sluit aan op Planning' : '✖ Wijkt af van Planning'}</span>
        <button onClick={() => download(`${naam}.csv`, pacoCsv(rijen), 'text/csv;charset=utf-8')} disabled={!rijen.length}>
          Download CSV
        </button>
        <button
          onClick={async () => download(`${naam}.xlsx`, await pacoXlsx(rijen), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
          disabled={!rijen.length}
        >
          Download XLSX
        </button>
      </div>
      <p className="sub">
        {rijen.length} regels · {fmtUren(totUren)} uur · {fmtEuro2(totBedrag)}
        {rijen.length !== r.paco.length && ` (gefilterd uit ${r.paco.length})`}
      </p>
      <div className="scroll-x">
        <table className="tabel compact">
          <thead>
            <tr>
              <th>#</th>
              <th>Projectnr</th>
              <th>Projectnaam</th>
              <th>Fasecode</th>
              <th>Fase</th>
              <th>Medewerker</th>
              <th>PACO-nr</th>
              <th>Functie</th>
              <th>Rol</th>
              <th>Jaar</th>
              <th>Maand</th>
              <th>Periode</th>
              <th className="num">Uren</th>
              <th className="num">Uurtarief</th>
              <th className="num">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {rijen.map((x, i) => (
              <tr key={`${x.teamIdx}-${x.faseIdx}-${x.periode}`}>
                <td>{i + 1}</td>
                <td>{x.projectnummer}</td>
                <td>{x.projectnaam}</td>
                <td>{x.fasecode}</td>
                <td>{x.fase}</td>
                <td>{x.medewerker}</td>
                <td>{x.pacoMedewerkernr}</td>
                <td>{x.functie}</td>
                <td>{x.rol}</td>
                <td>{x.jaar}</td>
                <td>{x.maand}</td>
                <td>{x.periode}</td>
                <td className="num">{fmtUren(x.uren)}</td>
                <td className="num">{fmtEuro(x.uurtarief)}</td>
                <td className="num">{fmtEuro(x.bedrag)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="voetnoot">
        Aanname (spec §9): het exacte PACO-importformaat is nog niet bekend. CSV = puntkomma, UTF-8 met BOM, decimale komma. Kolommen afstemmen met
        finance.
      </p>
    </div>
  );
}
