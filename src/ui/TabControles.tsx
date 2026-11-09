import { type TabProps } from './ProjectScherm';

const VOLGORDE = { fout: 0, waarschuwing: 1, info: 2 } as const;
const LABEL = { fout: 'Actie', waarschuwing: 'Let op', info: 'Info' } as const;
const SCHERM = { project: 'Project', team: 'Team', inzet: 'Inzet', bezetting: 'Bezetting', budget: 'Budget', paco: 'PACO-export' } as const;

export function TabControles({ p, r }: TabProps) {
  const lijst = [...r.meldingen].sort((a, b) => VOLGORDE[a.ernst] - VOLGORDE[b.ernst]);
  return (
    <div className="kaart breed">
      <h2>Controles</h2>
      <p className="uitleg">Rood = actie nodig (telt mee in de status bovenaan). Geel = let op. Klik op een melding om naar de plek te gaan.</p>
      <p className={`statusbalk ${r.aantalFouten ? 'st-fout' : 'st-ok'}`}>
        {r.aantalFouten ? `⚠ ${r.aantalFouten} ${r.aantalFouten === 1 ? 'fout' : 'fouten'}` : '✔ Geen fouten'} · {r.aantalWaarschuwingen}{' '}
        {r.aantalWaarschuwingen === 1 ? 'waarschuwing' : 'waarschuwingen'}
      </p>
      {lijst.length > 0 && (
        <table className="tabel">
          <thead>
            <tr>
              <th>Status</th>
              <th>Melding</th>
              <th>Waar oplossen</th>
            </tr>
          </thead>
          <tbody>
            {lijst.map((m, i) => (
              <tr key={i}>
                <td className={`status ${m.ernst === 'fout' ? 'st-fout' : m.ernst === 'waarschuwing' ? 'st-let' : 'st-info'}`}>{LABEL[m.ernst]}</td>
                <td>
                  <a href={`#/p/${p.id}/${m.scherm}${m.id ? `/${m.id}` : m.veld ? `/${m.veld}` : ''}`}>{m.tekst}</a>
                </td>
                <td>{SCHERM[m.scherm]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
