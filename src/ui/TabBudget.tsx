import { useState } from 'react';
import { MAANDEN_KORT } from '../core/dates';
import { fmtEuro, fmtEuro2, fmtPct, fmtUren } from './format';
import { type TabProps } from './ProjectScherm';
import { faseKleur } from './TabProject';

const maandLabel = (ms: number) => `${MAANDEN_KORT[(ms % 100) - 1]} ${Math.floor(ms / 100)}`;

export function TabBudget({ p, r }: TabProps) {
  const b = r.budget;
  const [cumulatief, setCumulatief] = useState(false);
  const actieveFases = b.perFase.map((x) => x.faseIdx);
  const cum = (rij: number[]) => (cumulatief ? rij.reduce<number[]>((acc, x) => [...acc, (acc.at(-1) ?? 0) + x], []) : rij);
  const kolomSom = (m: number[][]) => m[0]?.map((_, j) => m.reduce((s, rij) => s + rij[j], 0)) ?? [];

  return (
    <div className="kolommen">
      <div className="kaart breed">
        <h2>1. Honorarium per fase</h2>
        <table className="tabel">
          <thead>
            <tr>
              <th>Code</th>
              <th>Fase</th>
              <th>Periode</th>
              <th className="num">Uren</th>
              <th className="num">Honorarium</th>
              <th className="num">%</th>
              <th className="num">Kantooropslag</th>
              <th className="num">Totaal incl. opslag</th>
            </tr>
          </thead>
          <tbody>
            {b.perFase.map((x) => {
              const fr = r.fases[x.faseIdx];
              const [bg, fg] = faseKleur(x.faseIdx);
              return (
                <tr key={fr.fase.id}>
                  <td style={{ background: bg, color: fg, fontWeight: 700 }}>{fr.fase.code}</td>
                  <td>{fr.fase.naam}</td>
                  <td>{fr.periode}</td>
                  <td className="num">{fmtUren(x.uren)}</td>
                  <td className="num">{fmtEuro(x.honorarium)}</td>
                  <td className="num">{fmtPct(x.pct)}</td>
                  <td className="num">{fmtEuro2(x.opslag)}</td>
                  <td className="num">{fmtEuro2(x.totaal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Totaal</td>
              <td className="num">{fmtUren(b.uren)}</td>
              <td className="num">{fmtEuro(b.honorarium)}</td>
              <td className="num">{b.honorarium ? fmtPct(1) : ''}</td>
              <td className="num">{fmtEuro2(b.kantooropslag)}</td>
              <td className="num">{fmtEuro2(b.totaal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="kaart">
        <h2>Vaste prijs</h2>
        <table className="tabel samenvatting">
          <tbody>
            <tr>
              <td>Berekend honorarium incl. kantooropslag ({fmtPct(p.kantooropslagPct)})</td>
              <td className="num vet">{fmtEuro2(b.totaal)}</td>
            </tr>
            <tr>
              <td>Aangeboden vaste prijs</td>
              <td className="num">{b.vastePrijs != null ? fmtEuro2(b.vastePrijs) : <a href={`#/p/${p.id}/project`}>invullen</a>}</td>
            </tr>
            <tr className={b.verschil != null && Math.abs(b.verschil) >= 1 ? 'st-let' : ''}>
              <td>Verschil vaste prijs – berekend</td>
              <td className="num">{b.verschil != null ? fmtEuro2(b.verschil) : ''}</td>
            </tr>
            <tr>
              <td>Gemiddeld uurtarief berekend (excl. opslag)</td>
              <td className="num">{fmtEuro2(b.gemTarief)}</td>
            </tr>
            <tr>
              <td>Gemiddeld uurtarief o.b.v. vaste prijs</td>
              <td className="num">{fmtEuro2(b.gemTariefVastePrijs)}</td>
            </tr>
          </tbody>
        </table>
        <p className="voetnoot">Termijnen per fase: gebruik de kolom ‘Totaal incl. opslag’ (of % × vaste prijs).</p>
      </div>

      <div className="kaart breed">
        <h2>2. Uren per rol × fase</h2>
        <div className="scroll-x">
          <table className="tabel">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Medewerker</th>
                {actieveFases.map((fi) => (
                  <th key={fi} className="num">
                    {r.fases[fi].fase.code}
                  </th>
                ))}
                <th className="num">Totaal</th>
                <th className="num">Tarief</th>
                <th className="num">Honorarium</th>
              </tr>
            </thead>
            <tbody>
              {r.team.map((t, ti) => (
                <tr key={t.lid.id}>
                  <td>{t.lid.rolNaam}</td>
                  <td>{t.medewerker?.naam}</td>
                  {actieveFases.map((fi) => (
                    <td key={fi} className="num">
                      {fmtUren(b.rolFaseUren[ti][fi], true)}
                    </td>
                  ))}
                  <td className="num vet">{fmtUren(t.urenTotaal, true)}</td>
                  <td className="num">{fmtEuro(t.projecttarief)}</td>
                  <td className="num">{fmtEuro(t.honorarium)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Totaal</td>
                {actieveFases.map((fi) => (
                  <td key={fi} className="num">
                    {fmtUren(r.fases[fi].uren, true)}
                  </td>
                ))}
                <td className="num">{fmtUren(b.uren)}</td>
                <td />
                <td className="num">{fmtEuro(b.honorarium)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {(['uren', 'bedrag'] as const).map((soort) => {
        const m = soort === 'uren' ? b.rolMaandUren : b.rolMaandBedrag;
        const fmt = (x: number) => (soort === 'uren' ? fmtUren(x, true) : x ? fmtEuro(x) : '');
        return (
          <div className="kaart breed" key={soort}>
            <h2>
              {soort === 'uren' ? '3. Uren per rol × maand' : '4. Honorarium (€) per rol × maand'}
              {soort === 'uren' && (
                <label className="vink rechts">
                  <input type="checkbox" checked={cumulatief} onChange={(e) => setCumulatief(e.target.checked)} /> Cumulatief
                </label>
              )}
            </h2>
            <div className="scroll-x">
              <table className="tabel compact">
                <thead>
                  <tr>
                    <th>Rol</th>
                    {b.maanden.map((ms) => (
                      <th key={ms} className="num">
                        {maandLabel(ms)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.team.map((t, ti) => (
                    <tr key={t.lid.id}>
                      <td>{t.lid.rolNaam}</td>
                      {cum(m[ti] ?? []).map((x, j) => (
                        <td key={j} className="num">
                          {fmt(x)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Totaal</td>
                    {cum(kolomSom(m)).map((x, j) => (
                      <td key={j} className="num">
                        {fmt(x)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
      <p className="voetnoot breed">Alle bedragen excl. btw. Maanden volgen de donderdag van elke week (ISO 8601), net als de PACO-export.</p>
    </div>
  );
}
