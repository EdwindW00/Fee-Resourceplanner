import { useCallback, useEffect, useMemo } from 'react';
import { bereken, type Resultaat } from '../core/calc';
import type { Project, Stamdata } from '../core/types';
import { download, projectNaarJson, veiligeNaam } from '../io';
import { TabProject } from './TabProject';
import { TabTeam } from './TabTeam';
import { TabInzet } from './TabInzet';
import { Gantt, Bezetting } from './Gantt';
import { TabBudget } from './TabBudget';
import { TabPaco } from './TabPaco';
import { TabControles } from './TabControles';

export type ProjectTab = 'project' | 'team' | 'inzet' | 'planning' | 'bezetting' | 'budget' | 'paco' | 'controles';

const TABS: { id: ProjectTab; label: string }[] = [
  { id: 'project', label: 'Project' },
  { id: 'team', label: 'Team' },
  { id: 'inzet', label: 'Inzet' },
  { id: 'planning', label: 'Planning' },
  { id: 'bezetting', label: 'Bezetting' },
  { id: 'budget', label: 'Budget' },
  { id: 'paco', label: 'PACO-export' },
  { id: 'controles', label: 'Controles' },
];

export interface TabProps {
  p: Project;
  r: Resultaat;
  stam: Stamdata;
  wijzig: (f: (d: Project) => void) => void;
  focus?: string;
}

/** Scrollt naar en markeert de rij met id `rij-{focus}`. */
export function useFocus(focus?: string) {
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`rij-${focus}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('focus');
    const t = setTimeout(() => el.classList.remove('focus'), 2500);
    return () => clearTimeout(t);
  }, [focus]);
}

export function ProjectScherm({ project, stam, tab, focus, onWijzig }: { project: Project; stam: Stamdata; tab: ProjectTab; focus?: string; onWijzig: (id: string, f: (d: Project) => void) => void }) {
  // Herberekening bij elke wijziging (client-side, §5)
  const r = useMemo(() => bereken(project, stam), [project, stam]);
  const wijzig = useCallback((f: (d: Project) => void) => onWijzig(project.id, f), [project.id, onWijzig]);
  const props: TabProps = { p: project, r, stam, wijzig, focus };

  return (
    <section className="pagina project">
      <div className="projectkop">
        <div>
          <a href="#/" className="terug">
            ← Projecten
          </a>
          <h1>{project.naam || '(naamloos project)'}</h1>
          <div className="sub">
            {[project.opdrachtgever, project.pacoProjectnr, project.versie].filter(Boolean).join(' · ')}
            {project.gearchiveerd && <span className="pil">Gearchiveerd</span>}
          </div>
        </div>
        <div className="statusblok">
          <a href={`#/p/${project.id}/controles`} className={`statusbalk ${r.aantalFouten ? 'st-fout' : 'st-ok'}`}>
            {r.aantalFouten ? `⚠ ${r.aantalFouten} ${r.aantalFouten === 1 ? 'melding' : 'meldingen'}` : '✔ Geen meldingen'}
          </a>
          <button onClick={() => download(`${veiligeNaam(project.naam)}.json`, projectNaarJson(project, stam), 'application/json')}>Exporteren (JSON)</button>
        </div>
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t.id} href={`#/p/${project.id}/${t.id}`} className={tab === t.id ? 'actief' : ''}>
            {t.label}
            {t.id === 'controles' && r.meldingen.length > 0 && <span className={`teller ${r.aantalFouten ? 'st-fout' : 'st-let'}`}>{r.meldingen.length}</span>}
          </a>
        ))}
      </nav>
      <div className="tabinhoud">
        {tab === 'project' && <TabProject {...props} />}
        {tab === 'team' && <TabTeam {...props} />}
        {tab === 'inzet' && <TabInzet {...props} />}
        {tab === 'planning' && <Gantt {...props} />}
        {tab === 'bezetting' && <Bezetting {...props} />}
        {tab === 'budget' && <TabBudget {...props} />}
        {tab === 'paco' && <TabPaco {...props} />}
        {tab === 'controles' && <TabControles {...props} />}
      </div>
    </section>
  );
}
