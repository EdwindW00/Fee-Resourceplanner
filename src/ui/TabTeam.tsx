import { useMemo } from 'react';
import { nieuwTeamlid } from '../core/model';
import { fmtEuro, fmtUren } from './format';
import { Getal, StatusCel, Tekst } from './inputs';
import { useFocus, type TabProps } from './ProjectScherm';

export function TabTeam({ p, r, stam, wijzig, focus }: TabProps) {
  useFocus(focus);
  const jaren = useMemo(() => [...new Set(r.team.flatMap((t) => t.jaren))].sort(), [r.team]);
  const medewerkers = useMemo(() => [...stam.medewerkers].filter((m) => m.actief).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')), [stam.medewerkers]);

  return (
    <div className="kaart breed">
      <h2>Team &amp; tarieven</h2>
      <p className="uitleg">
        Koppel per rol een medewerker. In Inzet kies je de rol; wissel je hier van persoon, dan rekent alles mee. Projecttarief = gewogen gemiddelde
        van het geïndexeerde tarief per (ISO-)jaar over de geplande uren, naar boven afgerond op hele euro’s.
      </p>
      <datalist id="medewerkerlijst">
        {medewerkers.map((m) => (
          <option key={m.id} value={m.naam}>
            {m.functie} · {m.tariefsleutel}
          </option>
        ))}
      </datalist>
      <div className="scroll-x">
        <table className="tabel invoertabel">
          <thead>
            <tr>
              <th rowSpan={2}>#</th>
              <th rowSpan={2}>Rol in project</th>
              <th rowSpan={2}>Medewerker</th>
              <th rowSpan={2}>Functie</th>
              <th rowSpan={2}>Tarief&shy;sleutel</th>
              <th rowSpan={2} className="num">Basis&shy;tarief</th>
              <th rowSpan={2}>Tarief hand&shy;matig</th>
              <th rowSpan={2}>Beschikb. u/wk</th>
              {jaren.length > 0 && <th colSpan={jaren.length}>Uren per jaar</th>}
              {jaren.length > 0 && <th colSpan={jaren.length}>Tarief per jaar</th>}
              <th rowSpan={2} className="num">Project&shy;tarief</th>
              <th rowSpan={2} className="num">Totaal uren</th>
              <th rowSpan={2} className="num">Honorarium</th>
              <th rowSpan={2}>Status</th>
              <th rowSpan={2} />
            </tr>
            <tr>
              {jaren.map((j) => (
                <th key={`u${j}`} className="num">
                  {j}
                </th>
              ))}
              {jaren.map((j) => (
                <th key={`t${j}`} className="num">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.team.map((t, i) => {
              const tr = r.team[i];
              const zet = (fn: (x: typeof t) => void) => wijzig((d) => fn(d.team[i]));
              const gebruikt = p.inzet.filter((x) => x.teamlidId === t.id).length;
              return (
                <tr key={t.id} id={`rij-${t.id}`}>
                  <td>{i + 1}</td>
                  <td>
                    <Tekst waarde={t.rolNaam} onWijzig={(v) => zet((x) => void (x.rolNaam = v))} />
                  </td>
                  <td>
                    <Tekst
                      className="breed"
                      list="medewerkerlijst"
                      placeholder="Zoek medewerker…"
                      waarde={tr.medewerker?.naam ?? (t.medewerkerId ? '(onbekend)' : '')}
                      onWijzig={(v) => {
                        const m = stam.medewerkers.find((x) => x.naam.toLowerCase() === v.trim().toLowerCase());
                        zet((x) => void (x.medewerkerId = m ? m.id : v.trim() ? x.medewerkerId : null));
                      }}
                    />
                  </td>
                  <td className="berekend">{tr.functie}</td>
                  <td className="berekend">{tr.tariefsleutel}</td>
                  <td className="berekend num">{tr.basistarief ? fmtEuro(tr.basistarief) : ''}</td>
                  <td>
                    <Getal className="smal" waarde={t.tariefHandmatig} onWijzig={(v) => zet((x) => void (x.tariefHandmatig = v))} />
                  </td>
                  <td>
                    <Getal className="smal" waarde={t.beschikbaarUrenPerWeek} onWijzig={(v) => zet((x) => void (x.beschikbaarUrenPerWeek = v))} />
                  </td>
                  {jaren.map((j) => (
                    <td key={`u${j}`} className="berekend num">
                      {fmtUren(tr.urenPerJaar[j] ?? 0, true)}
                    </td>
                  ))}
                  {jaren.map((j) => (
                    <td key={`t${j}`} className="berekend num" title={tr.tariefPerJaar[j] != null ? String(tr.tariefPerJaar[j]) : ''}>
                      {tr.basistarief ? (tr.basistarief * (p.indexatieAan ? Math.pow(1 + p.indexatiePct, j - p.basisjaarTarieven) : 1)).toLocaleString('nl-NL', { maximumFractionDigits: 2 }) : ''}
                    </td>
                  ))}
                  <td className="berekend num vet">{tr.projecttarief ? fmtEuro(tr.projecttarief) : ''}</td>
                  <td className="berekend num">{fmtUren(tr.urenTotaal, true)}</td>
                  <td className="berekend num">{tr.honorarium ? fmtEuro(tr.honorarium) : ''}</td>
                  <StatusCel tekst={tr.status} ernst={tr.ernst} />
                  <td className="acties">
                    <button
                      className="gevaar"
                      title="Verwijderen"
                      onClick={() => (!gebruikt || confirm(`Rol '${t.rolNaam}' wordt gebruikt in ${gebruikt} inzetregel(s). Toch verwijderen?`)) && wijzig((d) => void d.team.splice(i, 1))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={() => wijzig((d) => void d.team.push(nieuwTeamlid()))}>+ Rol toevoegen</button>
      {stam.medewerkers.every((m) => m.koppeling === 'Plaatshouder') && (
        <p className="melding st-let">
          Er staan alleen plaatshouders (NNB) in de medewerkerslijst. Importeer de medewerkers onder <a href="#/beheer/medewerkers">Beheer → Medewerkers</a>.
        </p>
      )}
    </div>
  );
}
