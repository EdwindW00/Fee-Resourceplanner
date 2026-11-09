import { fmtDatum } from '../core/dates';
import { nieuweFase } from '../core/model';
import type { Afronding } from '../core/types';
import { fmtEuro, fmtUren } from './format';
import { Datum, Getal, Keuze, StatusCel, Tekst } from './inputs';
import { useFocus, type TabProps } from './ProjectScherm';

export const FASEKLEUREN: [string, string][] = [
  ['#ED7D31', '#fff'], ['#E278B0', '#000'], ['#8CCEBB', '#000'], ['#FFD966', '#000'], ['#00B050', '#fff'],
  ['#9966FF', '#fff'], ['#4595B1', '#fff'], ['#A5A5A5', '#000'], ['#F4B183', '#000'], ['#5B9BD5', '#fff'],
];
export const faseKleur = (idx: number) => FASEKLEUREN[idx % FASEKLEUREN.length];

const JANEE = [
  { waarde: 'ja', label: 'Ja' },
  { waarde: 'nee', label: 'Nee' },
] as const;

export function TabProject({ p, r, wijzig, focus }: TabProps) {
  useFocus(focus);
  const veld = (label: string, invoer: React.ReactNode, uitleg?: string, id?: string) => (
    <div className="veld" id={id ? `rij-${id}` : undefined}>
      <label>{label}</label>
      <div>{invoer}</div>
      {uitleg && <small>{uitleg}</small>}
    </div>
  );

  return (
    <div className="kolommen">
      <div className="kaart">
        <h2>Projectgegevens</h2>
        {veld('Projectnaam', <Tekst waarde={p.naam} onWijzig={(v) => wijzig((d) => void (d.naam = v))} />)}
        {veld('Opdrachtgever', <Tekst waarde={p.opdrachtgever} onWijzig={(v) => wijzig((d) => void (d.opdrachtgever = v))} />)}
        {veld('PACO-projectnummer', <Tekst waarde={p.pacoProjectnr} onWijzig={(v) => wijzig((d) => void (d.pacoProjectnr = v))} />)}
        {veld('Offertedatum', <Datum waarde={p.offertedatum} onWijzig={(v) => wijzig((d) => void (d.offertedatum = v))} />)}
        {veld('Versie / status', <Tekst waarde={p.versie} onWijzig={(v) => wijzig((d) => void (d.versie = v))} />)}
        {veld('Opgesteld door', <Tekst waarde={p.opgesteldDoor} onWijzig={(v) => wijzig((d) => void (d.opgesteldDoor = v))} />)}
      </div>

      <div className="kaart">
        <h2>Planning</h2>
        {veld(
          'Startdatum project',
          <Datum waarde={p.startdatum} onWijzig={(v) => wijzig((d) => void (d.startdatum = v))} />,
          'Elke datum mag; de planning start op de maandag van die week.',
          'startdatum',
        )}
        {veld('Maandag van week 1', <span className="berekend">{fmtDatum(r.projectMaandag)}</span>)}
        {veld('Uren per werkdag', <Getal waarde={p.urenPerDag} onWijzig={(v) => wijzig((d) => void (d.urenPerDag = v ?? 8))} />, "Gebruikt bij 'Dagen per week'.")}
        {veld(
          'Uren afronden op',
          <Keuze
            waarde={String(p.afronding)}
            opties={[
              { waarde: '1', label: 'Hele uren' },
              { waarde: '0.5', label: 'Halve uren' },
              { waarde: '0.25', label: 'Kwartieren' },
            ]}
            onWijzig={(v) => wijzig((d) => void (d.afronding = Number(v ?? 1) as Afronding))}
          />,
          'Afronding per week; het totaal per regel blijft exact.',
        )}
        {veld(
          'Feestdagen meenemen',
          <Keuze waarde={p.feestdagenMeenemen ? 'ja' : 'nee'} opties={[...JANEE]} onWijzig={(v) => wijzig((d) => void (d.feestdagenMeenemen = v === 'ja'))} />,
          'Ja = een week met 1 feestdag krijgt 80%. Afwijkingen hieronder tellen altijd.',
        )}
      </div>

      <div className="kaart">
        <h2>Tarieven</h2>
        {veld('Basisjaar tarieven', <Getal waarde={p.basisjaarTarieven} onWijzig={(v) => wijzig((d) => void (d.basisjaarTarieven = v ?? 2026))} />)}
        {veld('Indexatie toepassen', <Keuze waarde={p.indexatieAan ? 'ja' : 'nee'} opties={[...JANEE]} onWijzig={(v) => wijzig((d) => void (d.indexatieAan = v === 'ja'))} />)}
        {veld(
          'Indexatie per jaar (%)',
          <Getal procent waarde={p.indexatiePct} onWijzig={(v) => wijzig((d) => void (d.indexatiePct = v ?? 0))} />,
          'Template: gem. CBS 711 Architecten/ingenieurs (85817NED) 2023–2025 = 3,4%.',
        )}
        {veld('Kantooropslag (%)', <Getal procent waarde={p.kantooropslagPct} onWijzig={(v) => wijzig((d) => void (d.kantooropslagPct = v ?? 0))} />)}
        {veld(
          'Aangeboden vaste prijs (excl. btw)',
          <Getal waarde={p.vastePrijs} onWijzig={(v) => wijzig((d) => void (d.vastePrijs = v))} />,
          'Optioneel. Budget toont het verschil met het berekende totaal.',
        )}
      </div>

      <div className="kaart breed">
        <h2>Fases</h2>
        <p className="uitleg">Fases lopen standaard achter elkaar. Vul alleen een startdatum in als een fase overlapt of later start.</p>
        <table className="tabel invoertabel">
          <thead>
            <tr>
              <th>Nr</th>
              <th>Code</th>
              <th>Fasenaam</th>
              <th>PACO-fasecode</th>
              <th>Duur (wk)</th>
              <th>Startdatum handmatig</th>
              <th>Startweek</th>
              <th>Eindweek</th>
              <th>Van</th>
              <th>T/m</th>
              <th className="num">Uren</th>
              <th className="num">Honorarium</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.fases.map((f, i) => {
              const fr = r.fases[i];
              const [bg, fg] = faseKleur(i);
              const zet = (fn: (x: typeof f) => void) => wijzig((d) => fn(d.fases[i]));
              return (
                <tr key={f.id} id={`rij-${f.id}`}>
                  <td style={{ background: bg, color: fg, fontWeight: 700 }}>{i + 1}</td>
                  <td>
                    <Tekst className="smal" waarde={f.code} onWijzig={(v) => zet((x) => void (x.code = v))} />
                  </td>
                  <td>
                    <Tekst waarde={f.naam} onWijzig={(v) => zet((x) => void (x.naam = v))} />
                  </td>
                  <td>
                    <Tekst className="smal" waarde={f.pacoFasecode} onWijzig={(v) => zet((x) => void (x.pacoFasecode = v))} />
                  </td>
                  <td>
                    <Getal className="smal" waarde={f.duurWeken} onWijzig={(v) => zet((x) => void (x.duurWeken = v))} />
                  </td>
                  <td>
                    <Datum waarde={f.startdatumHandmatig} onWijzig={(v) => zet((x) => void (x.startdatumHandmatig = v))} />
                  </td>
                  <td className="berekend num">{fr.startWeek ?? ''}</td>
                  <td className="berekend num">{fr.eindWeek ?? ''}</td>
                  <td className="berekend">{fmtDatum(fr.van)}</td>
                  <td className="berekend">{fmtDatum(fr.tm)}</td>
                  <td className="berekend num">{fr.actief ? fmtUren(fr.uren) : ''}</td>
                  <td className="berekend num">{fr.actief ? fmtEuro(fr.honorarium) : ''}</td>
                  <StatusCel tekst={fr.status} ernst={fr.ernst} />
                  <td className="acties">
                    <button title="Omhoog" disabled={i === 0} onClick={() => wijzig((d) => d.fases.splice(i - 1, 0, d.fases.splice(i, 1)[0]))}>
                      ↑
                    </button>
                    <button title="Omlaag" disabled={i === p.fases.length - 1} onClick={() => wijzig((d) => d.fases.splice(i + 1, 0, d.fases.splice(i, 1)[0]))}>
                      ↓
                    </button>
                    <button
                      className="gevaar"
                      title="Verwijderen"
                      onClick={() => {
                        const n = p.inzet.filter((x) => x.faseId === f.id).length;
                        if (!n || confirm(`Fase ${f.code} heeft ${n} inzetregel(s). Die verliezen hun fase. Doorgaan?`)) wijzig((d) => void d.fases.splice(i, 1));
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={() => wijzig((d) => void d.fases.push(nieuweFase()))}>+ Fase toevoegen</button>
      </div>

      <div className="kaart breed">
        <h2>Kalenderafwijkingen</h2>
        <p className="uitleg">
          Bijvoorbeeld een kerstsluiting: zet een projectweek op 0%. Bij ‘Totaal uren’ schuiven de uren dan naar de andere weken; het totaal blijft
          gelijk.
        </p>
        <table className="tabel invoertabel">
          <thead>
            <tr>
              <th>Projectweek</th>
              <th>Maandag</th>
              <th>ISO-week</th>
              <th>Beschikbaarheid (%)</th>
              <th>Opmerking</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {p.kalenderAfwijkingen.map((a, i) => {
              const wk = r.weken[a.weekIndex - 1];
              return (
                <tr key={i}>
                  <td>
                    <Getal className="smal" waarde={a.weekIndex} onWijzig={(v) => wijzig((d) => void (d.kalenderAfwijkingen[i].weekIndex = Math.max(1, Math.floor(v ?? 1))))} />
                  </td>
                  <td className="berekend">{wk ? fmtDatum(wk.maandag) : ''}</td>
                  <td className="berekend">{wk ? `${wk.jaar}-W${String(wk.isoWeek).padStart(2, '0')}` : ''}</td>
                  <td>
                    <Getal procent className="smal" waarde={a.beschikbaarheidPct} onWijzig={(v) => wijzig((d) => void (d.kalenderAfwijkingen[i].beschikbaarheidPct = v ?? 0))} />
                  </td>
                  <td>
                    <Tekst waarde={a.opmerking} onWijzig={(v) => wijzig((d) => void (d.kalenderAfwijkingen[i].opmerking = v))} />
                  </td>
                  <td>
                    <button className="gevaar" onClick={() => wijzig((d) => void d.kalenderAfwijkingen.splice(i, 1))}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={() => wijzig((d) => void d.kalenderAfwijkingen.push({ weekIndex: 1, beschikbaarheidPct: 0, opmerking: '' }))}>+ Afwijking toevoegen</button>
      </div>
    </div>
  );
}
