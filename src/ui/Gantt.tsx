import { useMemo } from 'react';
import type { Week } from '../core/calc';
import { dagNr, fmtDatum, isGeldigeDatum, MAANDEN_KORT } from '../core/dates';
import { fmtEuro, fmtUren } from './format';
import { useFocus, type TabProps } from './ProjectScherm';
import { faseKleur } from './TabProject';

/** Lokale datum van vandaag als dagnummer. */
const vandaag = () => {
  const d = new Date();
  return dagNr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
};

/** Kopregels Jaar / Maand / Week boven de weekkolommen (§8). */
function WeekKop({ weken, links }: { weken: Week[]; links: string[] }) {
  const nu = vandaag();
  const leeg = links.slice(1).map((_, i) => <th key={i} className="vast-cel" />);
  return (
    <thead>
      <tr className="kop-jaar">
        <th className="vast vast-0">Jaar</th>
        {leeg}
        {weken.map((w, i) => (
          <th key={w.w} className={grens(weken, i)}>
            {i === 0 || weken[i - 1].jaar !== w.jaar ? w.jaar : ''}
          </th>
        ))}
      </tr>
      <tr className="kop-maand">
        <th className="vast vast-0">Maand</th>
        {leeg}
        {weken.map((w, i) => (
          <th key={w.w} className={grens(weken, i)}>
            {i === 0 || weken[i - 1].maandsleutel !== w.maandsleutel ? MAANDEN_KORT[w.maand - 1] : ''}
          </th>
        ))}
      </tr>
      <tr className="kop-week">
        <th className="vast vast-0">Week</th>
        {leeg}
        {weken.map((w, i) => (
          <th
            key={w.w}
            className={`${grens(weken, i)} ${nu >= w.maandag && nu < w.maandag + 7 ? 'huidig' : ''} ${w.factor < 1 ? 'minder' : ''}`}
            title={`Projectweek ${w.w} · ${fmtDatum(w.maandag)} – ${fmtDatum(w.vrijdag)}${w.feestdagen ? ` · ${w.feestdagen} feestdag(en)` : ''}${w.factor !== 1 ? ` · beschikbaarheid ${Math.round(w.factor * 100)}%` : ''}`}
          >
            {w.isoWeek}
          </th>
        ))}
      </tr>
      <tr className="kop-kolom">
        {links.map((l, i) => (
          <th key={l} className={`vast vast-${i}`}>
            {l}
          </th>
        ))}
        {weken.map((w, i) => (
          <th key={w.w} className={grens(weken, i)} />
        ))}
      </tr>
    </thead>
  );
}

const grens = (weken: Week[], i: number) => (i > 0 && weken[i - 1].maandsleutel !== weken[i].maandsleutel ? 'mgrens' : '');

function GeenWeken({ p }: { p: TabProps['p'] }) {
  return (
    <p className="leeg">
      {isGeldigeDatum(p.startdatum) ? 'Nog geen fases met code en duur. ' : 'Vul eerst een startdatum in. '}
      <a href={`#/p/${p.id}/project`}>Naar Project</a>
    </p>
  );
}

export function Gantt({ p, r }: TabProps) {
  const groepen = useMemo(
    () =>
      r.fases
        .map((fr, fi) => ({ fr, fi, regels: r.regels.filter((rr) => rr.actief && rr.faseIdx === fi) }))
        .filter((g) => g.fr.actief && g.fr.startWeek != null),
    [r],
  );
  if (!r.weken.length) return <GeenWeken p={p} />;
  const links = ['Fase / activiteit D&S', 'Code', 'Wie', 'Uren', 'Kosten (€)'];

  return (
    <div className="gantt-wrap">
      <div className="gantt-titel">
        <div>
          <div className="vet">
            Project: {p.naam}
            {p.pacoProjectnr ? ` – ${p.pacoProjectnr}` : ''}
          </div>
          <div>
            Datum: {isGeldigeDatum(p.offertedatum) ? fmtDatum(dagNr(p.offertedatum)) : ''}
            {p.versie ? ` – ${p.versie}` : ''}
          </div>
        </div>
        <table className="kerncijfers">
          <tbody>
            <tr>
              <td>Honorarium</td>
              <td className="num vet">{fmtEuro(r.budget.honorarium)}</td>
            </tr>
            <tr>
              <td>Incl. kantooropslag</td>
              <td className="num vet">{fmtEuro(r.budget.totaal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="gantt-scroll">
        <table className="gantt">
          <WeekKop weken={r.weken} links={links} />
          <tbody>
            <tr className="totaalrij">
              <td className="vast vast-0">Totaal per week</td>
              <td className="vast vast-1" />
              <td className="vast vast-2" />
              <td className="vast vast-3 num">{fmtUren(r.urenTotaal)}</td>
              <td className="vast vast-4 num">{fmtEuro(r.kostenTotaal)}</td>
              {r.totaalPerWeek.map((u, i) => (
                <td key={i} className={`wk ${grens(r.weken, i)}`}>
                  {fmtUren(u, true)}
                </td>
              ))}
            </tr>
            {groepen.map(({ fr, fi, regels }) => {
              const [bg, fg] = faseKleur(fi);
              const stijl = { background: bg, color: fg };
              return [
                <tr key={fr.fase.id} className="faserij" style={stijl}>
                  <td className="vast vast-0" style={stijl}>
                    {fr.label}
                  </td>
                  <td className="vast vast-1" style={stijl}>
                    {fr.fase.code}
                  </td>
                  <td className="vast vast-2" style={stijl} />
                  <td className="vast vast-3 num" style={stijl}>
                    {fmtUren(fr.uren)}
                  </td>
                  <td className="vast vast-4 num" style={stijl}>
                    {fmtEuro(fr.honorarium)}
                  </td>
                  {fr.perWeek.map((u, i) => (
                    <td key={i} className={`wk ${grens(r.weken, i)}`}>
                      {fmtUren(u, true)}
                    </td>
                  ))}
                </tr>,
                ...regels.map((rr) => (
                  <tr key={rr.regel.id} className="activiteit">
                    <td className="vast vast-0">
                      <a href={`#/p/${p.id}/inzet/${rr.regel.id}`}>{rr.regel.activiteit || '(geen omschrijving)'}</a>
                    </td>
                    <td className="vast vast-1">{fr.fase.code}</td>
                    <td className="vast vast-2">{p.team[rr.teamIdx]?.rolNaam}</td>
                    <td className="vast vast-3 num">{fmtUren(rr.urenTotaal)}</td>
                    <td className="vast vast-4 num">{fmtEuro(rr.kosten)}</td>
                    {rr.perWeek.map((u, i) => (
                      <td key={i} className={`wk ${grens(r.weken, i)} ${u > 0 ? 'gevuld' : ''}`}>
                        {fmtUren(u, true)}
                      </td>
                    ))}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="voetnoot">
        Weeknummers volgen ISO 8601; een week hoort bij de maand en het jaar van zijn donderdag. Oranje = huidige week. Schuine weeknummers = minder
        beschikbaarheid (feestdag of afwijking); houd de muis erboven voor details.
      </p>
    </div>
  );
}

export function Bezetting({ p, r, focus }: TabProps) {
  useFocus(focus);
  if (!r.weken.length) return <GeenWeken p={p} />;
  const links = ['Rol', 'Medewerker', 'Beschikb. u/wk', 'Totaal uren', 'Wkn boven'];
  return (
    <div className="gantt-wrap">
      <p className="uitleg">Uren per teamlid per week. Rood = meer dan ‘Beschikbaar u/week’ (Team) of meer dan 5 werkdagen.</p>
      <div className="gantt-scroll">
        <table className="gantt bezetting">
          <WeekKop weken={r.weken} links={links} />
          <tbody>
            {r.team.map((t) => (
              <tr key={t.lid.id} id={`rij-${t.lid.id}`} className="activiteit">
                <td className="vast vast-0">{t.lid.rolNaam}</td>
                <td className="vast vast-1">{t.medewerker?.naam ?? ''}</td>
                <td className="vast vast-2 num">{t.lid.beschikbaarUrenPerWeek ? fmtUren(t.lid.beschikbaarUrenPerWeek) : ''}</td>
                <td className="vast vast-3 num">{fmtUren(t.urenTotaal, true)}</td>
                <td className={`vast vast-4 num ${t.wekenOver ? 'st-fout' : ''}`}>{t.wekenOver || ''}</td>
                {t.perWeek.map((u, i) => (
                  <td key={i} className={`wk ${grens(r.weken, i)} ${u > t.grens + 1e-9 ? 'over' : u > 0 ? 'gevuld' : ''}`}>
                    {fmtUren(u, true)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="totaalrij">
              <td className="vast vast-0">Totaal</td>
              <td className="vast vast-1" />
              <td className="vast vast-2" />
              <td className="vast vast-3 num">{fmtUren(r.urenTotaal)}</td>
              <td className="vast vast-4" />
              {r.totaalPerWeek.map((u, i) => (
                <td key={i} className={`wk ${grens(r.weken, i)}`}>
                  {fmtUren(u, true)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

