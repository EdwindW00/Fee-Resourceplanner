import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Project, Stamdata } from './core/types';
import { bewaarProjecten, bewaarStamdata, laadProjecten, laadStamdata } from './store';
import { Overzicht } from './ui/Overzicht';
import { ProjectScherm, type ProjectTab } from './ui/ProjectScherm';
import { Beheer, type BeheerTab } from './ui/Beheer';

type Route = { naam: 'overzicht' } | { naam: 'project'; id: string; tab: ProjectTab; focus?: string } | { naam: 'beheer'; tab: BeheerTab };

function leesRoute(): Route {
  const delen = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (delen[0] === 'p' && delen[1]) return { naam: 'project', id: delen[1], tab: (delen[2] as ProjectTab) || 'project', focus: delen[3] };
  if (delen[0] === 'beheer') return { naam: 'beheer', tab: (delen[1] as BeheerTab) || 'medewerkers' };
  return { naam: 'overzicht' };
}

export function ga(pad: string) {
  location.hash = pad;
}

export default function App() {
  const [route, setRoute] = useState<Route>(leesRoute);
  const [projecten, setProjecten] = useState<Project[]>(laadProjecten);
  const [stam, setStam] = useState<Stamdata>(laadStamdata);
  const [opslagFout, setOpslagFout] = useState(false);

  useEffect(() => {
    const h = () => setRoute(leesRoute());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  // Autosave (§10)
  useEffect(() => setOpslagFout(!bewaarProjecten(projecten)), [projecten]);
  useEffect(() => setOpslagFout(!bewaarStamdata(stam)), [stam]);

  // Wijzigingen werken altijd op de nieuwste versie, zodat snel opeenvolgende wijzigingen elkaar niet overschrijven.
  const wijzigProject = useCallback((id: string, f: (d: Project) => void) => {
    setProjecten((lijst) =>
      lijst.map((x) => {
        if (x.id !== id) return x;
        const d = structuredClone(x);
        f(d);
        d.gewijzigdOp = new Date().toISOString();
        return d;
      }),
    );
  }, []);

  const project = useMemo(() => (route.naam === 'project' ? projecten.find((p) => p.id === route.id) : undefined), [route, projecten]);

  return (
    <div className="app">
      <header className="kop">
        <a href="#/" className="merk">
          Uren- en honorariumplanning
        </a>
        <nav>
          <a href="#/" className={route.naam === 'overzicht' ? 'actief' : ''}>
            Projecten
          </a>
          <a href="#/beheer" className={route.naam === 'beheer' ? 'actief' : ''}>
            Beheer
          </a>
        </nav>
        {opslagFout && <span className="st-fout pil">Opslaan in de browser mislukt</span>}
      </header>
      <main>
        {route.naam === 'overzicht' && <Overzicht projecten={projecten} setProjecten={setProjecten} stam={stam} setStam={setStam} />}
        {route.naam === 'project' &&
          (project ? (
            <ProjectScherm project={project} stam={stam} tab={route.tab} focus={route.focus} onWijzig={wijzigProject} />
          ) : (
            <p className="leeg">
              Project niet gevonden. <a href="#/">Terug naar projecten</a>
            </p>
          ))}
        {route.naam === 'beheer' && <Beheer tab={route.tab} stam={stam} setStam={setStam} projecten={projecten} />}
      </main>
    </div>
  );
}
