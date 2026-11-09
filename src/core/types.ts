// Datamodel volgens specificatie §4. Datums zijn ISO-strings 'JJJJ-MM-DD'.

export type Koppeling = 'Bevestigd' | 'Aanname' | 'Plaatshouder';
export type Methode = 'TOTAAL' | 'PER_WEEK' | 'DAGEN_PER_WEEK';
export type Profiel = 'GELIJK' | 'OPLOPEND' | 'AFLOPEND';
export type Afronding = 1 | 0.5 | 0.25;

export interface Medewerker {
  id: string;
  naam: string;
  functie: string;
  businessLine?: string;
  team?: string;
  vestiging?: string;
  email?: string;
  tariefsleutel: string; // → Tarief.sleutel, 'GEEN' = geen extern tarief
  koppeling: Koppeling;
  onderbouwing?: string;
  pacoMedewerkernr?: string;
  actief: boolean;
}

export interface Tarief {
  sleutel: string;
  level?: string;
  functie: string;
  tariefBasisjaar: number | null; // € per uur in het basisjaar
  basisjaar?: number;
  opmerking?: string;
}

export interface Feestdag {
  datum: string;
  omschrijving: string;
  meetellen: boolean;
}

export interface Stamdata {
  medewerkers: Medewerker[];
  tarieven: Tarief[];
  feestdagen: Feestdag[];
}

export interface Fase {
  id: string;
  code: string;
  naam: string;
  pacoFasecode?: string;
  duurWeken: number | null;
  startdatumHandmatig?: string | null;
}

export interface Teamlid {
  id: string;
  rolNaam: string;
  medewerkerId: string | null;
  tariefHandmatig?: number | null;
  beschikbaarUrenPerWeek?: number | null;
}

export interface Inzetregel {
  id: string;
  faseId: string | null;
  activiteit: string;
  teamlidId: string | null;
  methode: Methode;
  waarde: number | null;
  profiel: Profiel;
  vanafWeekInFase?: number | null;
  aantalWeken?: number | null;
  opmerking?: string;
}

export interface KalenderAfwijking {
  weekIndex: number; // 1-based projectweek
  beschikbaarheidPct: number; // 0..1
  opmerking?: string;
}

export interface Project {
  id: string;
  naam: string;
  opdrachtgever?: string;
  pacoProjectnr?: string;
  offertedatum?: string | null;
  versie?: string;
  opgesteldDoor?: string;
  startdatum: string | null;
  urenPerDag: number;
  afronding: Afronding;
  feestdagenMeenemen: boolean;
  basisjaarTarieven: number;
  indexatieAan: boolean;
  indexatiePct: number;
  kantooropslagPct: number;
  vastePrijs?: number | null;
  gearchiveerd?: boolean;
  gewijzigdOp?: string;
  fases: Fase[];
  team: Teamlid[];
  inzet: Inzetregel[];
  kalenderAfwijkingen: KalenderAfwijking[];
}
