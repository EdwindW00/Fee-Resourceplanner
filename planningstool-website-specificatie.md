# Specificatie – Uren- en honorariumplanning (webversie)

> **Doel van dit document:** alles wat nodig is om de Excel-tool *Uren- en honorariumplanning v1.1* om te zetten naar een interne webapplicatie voor Drees & Sommer Nederland.
> **Referentie-implementatie:** `Uren- en honorariumplanning v1.1 - voorbeeld Politie Zwolle.xlsx` en `… - template.xlsx`. Bij twijfel geldt het gedrag van de Excel. De rekenregels in hoofdstuk 6 zijn daaruit overgenomen.
> **Status:** concept, 9 november 2026. Opsteller: Edwin de Weerd.

---

## 1. Context en probleem

- Planningen voor offertes worden nu met de hand gemaakt. Maanden, personen en uurtarieven worden handmatig ingevuld. Dat is foutgevoelig: in de calculatie Politie Zwolle stonden voor één persoon drie verschillende tarieven, en in de resourceregels stonden uren als vaste getallen.
- Finance boekt per **maand** in het interne systeem **PACO**. Het projectteam wil intern per **week** plannen. Finance wil vooral weten: **personen, tarieven en uren**.
- Het huidige visuele format (Gantt met gekleurde faserijen en uren per week) wordt gewaardeerd. Dat moet blijven.
- Gebruikers: **het hele interne Nederlandse bedrijf**. Prijsmodel: **vaste prijs**.

## 2. Scope

### In scope (v1 web)
1. Projecten aanmaken, bewerken, dupliceren en archiveren.
2. Per project: instellingen, fases, team (rol → medewerker), inzetregels.
3. Automatische berekening van urenverdeling, tarieven, kosten en aggregaties (hoofdstuk 6).
4. Weergaven: Planning (Gantt), Bezetting, Budget, PACO-export, Controles.
5. Beheer van stamdata: Medewerkers, Tarieven, Feestdagen.
6. Export: PACO-lijst (CSV en XLSX) en planning (XLSX en/of PDF).

### Buiten scope (later)
- Realisatie terughalen uit PACO (plan versus werkelijk).
- Bezetting over projecten heen (portfolio-capaciteit). Houd hier wél rekening mee in het datamodel.
- Directe API-koppeling met PACO.

## 3. Gebruikers en rechten

| Rol | Mag |
|---|---|
| Medewerker | Eigen projecten aanmaken en bewerken. Projecten bekijken die met hem/haar gedeeld zijn. |
| Projecteigenaar | Project delen met collega's (lezen of bewerken). |
| Beheerder (finance/bedrijfsbureau) | Medewerkers, tarieven, feestdagen en indexatie-standaard beheren. |

- Inloggen via de bestaande Microsoft-omgeving (SSO, Microsoft Entra ID). *Aanname: D&S gebruikt Microsoft 365; de medewerkerslijst komt uit de M365-directory. Afstemmen met IT.*
- Uurtarieven en namen zijn vertrouwelijk/persoonsgegevens: alleen toegankelijk voor ingelogde D&S-medewerkers, opslag binnen de EU, en een AVG-check met IT/privacy.

## 4. Datamodel

```
Medewerker   (id, naam, functie, businessLine, team, vestiging, email,
              tariefsleutel → Tarief, koppeling ['Bevestigd'|'Aanname'|'Plaatshouder'],
              onderbouwing, pacoMedewerkernr, actief)
Tarief       (sleutel PK, level, functie, tariefBasisjaar €, basisjaar, opmerking)
Feestdag     (datum, omschrijving, meetellen bool)

Project      (id, naam, opdrachtgever, pacoProjectnr, offertedatum, versie, opgesteldDoor,
              startdatum, urenPerDag=8, afronding [1|0.5|0.25], feestdagenMeenemen bool=false,
              basisjaarTarieven=2026, indexatieAan bool=true, indexatiePct=0.034,
              kantooropslagPct=0.05, vastePrijs €?, eigenaar, gedeeldMet[])
Fase         (id, projectId, volgnr 1..n, code, naam, pacoFasecode?, duurWeken, startdatumHandmatig?)
Teamlid      (id, projectId, rolNaam (uniek binnen project), medewerkerId,
              tariefHandmatig €?, beschikbaarUrenPerWeek?)
Inzetregel   (id, projectId, faseId, activiteit, teamlidId,
              methode ['TOTAAL'|'PER_WEEK'|'DAGEN_PER_WEEK'], waarde,
              profiel ['GELIJK'|'OPLOPEND'|'AFLOPEND'], vanafWeekInFase=1?, aantalWeken?, opmerking)
KalenderAfwijking (projectId, weekIndex, beschikbaarheidPct, opmerking)   // bv. kerstsluiting 0%
```

- In de web-versie verwijst een inzetregel **met een id** naar fase en teamlid, niet met een tekstcode. Daarmee verdwijnt de fout die in Excel optrad (zie 6.9).
- Er zijn geen vaste maxima meer. In Excel: 10 fases, 200 regels, 20 teamleden, 156 weken.
- Wijzigt een tarief in de stamdata, dan rekenen bestaande projecten automatisch mee. Een **verstuurde offerte** moet je kunnen "bevriezen" (snapshot van tarieven en uitkomsten), zodat die later niet meer verandert.

## 5. Schermen

1. **Projectenoverzicht:** lijst, zoeken, nieuw, dupliceren, archiveren.
2. **Project:** instellingen (velden uit `Project`) en een fasetabel met berekende startweek, eindweek, van, t/m, uren, honorarium en status.
3. **Team:** rol, medewerker (zoekbare keuzelijst), en daaruit afgeleid: functie, tariefsleutel, basistarief, tarief per jaar, projecttarief, totaal uren, honorarium en status.
4. **Inzet:** een bewerkbare tabel (spreadsheet-gevoel: tab/enter, plakken uit Excel). Berekende kolommen: medewerker, van, t/m, weken, uren totaal, gemiddeld per week, tarief, kosten, controle. Volgorde vrij; ook regels toevoegen, dupliceren en verslepen.
5. **Planning (Gantt):** de look & feel van hoofdstuk 8.
6. **Bezetting:** uren per teamlid per week, met overbezetting in rood.
7. **Budget:** honorarium per fase, uren per rol × fase, en uren en € per rol × maand (plus cumulatief).
8. **PACO-export:** tabel met filters en een download (CSV/XLSX).
9. **Controles:** lijst met meldingen. Een melding klikt door naar het veld waar het probleem zit.
10. **Beheer:** Medewerkers, Tarieven, Feestdagen. Plus import van de medewerkerslijst uit XLSX.

Elke wijziging herberekent direct (client-side). Bovenaan staat altijd de status: "✔ Geen meldingen" of "⚠ n meldingen".

## 6. Rekenregels (normatief)

### 6.1 Weekraster en kalender
- `projectMaandag = startdatum − (weekdag(startdatum) − maandag)`. Dat is de maandag van de week van de startdatum.
- Week `w` (1-based): `maandag(w) = projectMaandag + (w−1)·7` en `vrijdag(w) = maandag(w) + 4`.
- **ISO 8601:** een week hoort bij het jaar **en de maand** van zijn **donderdag** (`maandag(w) + 3`).
  - `isoWeek(w) = floor((dagVanHetJaar(donderdag) − 1) / 7) + 1`
  - `jaar(w) = jaar(donderdag)`; `maandsleutel(w) = jaar·100 + maand(donderdag)`
- Feestdagen per week: het aantal feestdagen met `meetellen = true` tussen maandag en vrijdag van die week.
- Beschikbaarheidsfactor:
  ```
  auto(w)   = feestdagenMeenemen ? (5 − feestdagen(w)) / 5 : 1
  factor(w) = kalenderAfwijking(w) ?? auto(w)        // een afwijking telt altijd
  ```
- Horizon: in Excel 156 weken. Web: onbeperkt, of tot het einde van de laatste fase.

### 6.2 Fases
- Een fase is actief als er een code én een duur > 0 is.
- `startWeek(p)`:
  - met een handmatige startdatum: `floor((maandagVan(startdatumHandmatig) − projectMaandag) / 7) + 1`
  - anders: `max(eindWeek van alle eerdere fases) + 1`, en `1` voor de eerste fase.
- `eindWeek(p) = startWeek(p) + duurWeken − 1`
- Fases mogen overlappen (via de handmatige startdatum).

### 6.3 Venster van een inzetregel
```
start = startWeek(fase) + max(1, vanafWeekInFase) − 1
eind  = aantalWeken ? start + aantalWeken − 1 : eindWeek(fase)
```
- Een venster dat doorloopt na het einde van de fase mag, maar geeft een waarschuwing.

### 6.4 Urenverdeling per week
Voor elke regel en week `w` in `[start, eind]`. `s` = afronding (1, 0,5 of 0,25).

**Methode PER_WEEK / DAGEN_PER_WEEK**
```
perWeek = methode == DAGEN_PER_WEEK ? waarde × urenPerDag : waarde
uren(w) = round(perWeek × factor(w) / s) × s
```

**Methode TOTAAL (cumulatieve afronding, het totaal klopt altijd exact)**
```
i = w − start + 1 ;  n = eind − start + 1
gewicht(w) = profielGewicht(i) × factor(w)
profielGewicht: GELIJK = 1 ; OPLOPEND = i ; AFLOPEND = n − i + 1
cum(w)  = Σ gewicht(start..w) ;  Wtot = cum(eind)
uren(w) = round(H·cum(w)/Wtot / s)·s − round(H·cum(w−1)/Wtot / s)·s      // H = waarde
```
- Als `Wtot = 0` (bijvoorbeeld het hele venster op 0%), zijn er geen uren: geef een foutmelding.
- `round` = afronden "half weg van nul", zoals Excel `ROUND`. **Let op:** JavaScript `Math.round` rondt −0,5 anders af. Gebruik een eigen functie, en reken in hele eenheden van `s` om floating-point-fouten te voorkomen.
- Regels zonder geldige fase, zonder geldig teamlid of met waarde ≤ 0 tellen niet mee.

### 6.5 Tarieven en indexatie
```
basistarief      = Tarief[medewerker.tariefsleutel].tariefBasisjaar       // 'GEEN' → 0
tariefJaar(y)    = basistarief × (indexatieAan ? (1+indexatiePct)^(y − basisjaar) : 1)
urenJaar(y)      = Σ uren(w) van het teamlid waarvoor jaar(w) = y            // ISO-jaar
projecttarief    = tariefHandmatig
                   ?? (Σ urenJaar(y)·tariefJaar(y) / Σ urenJaar(y), naar boven afgerond op hele €)
                   ?? roundUp(tariefJaar(eersteJaar))                        // als er nog geen uren zijn
```
Dit is dezelfde methode als in de bestaande calculatie Politie Zwolle.

### 6.6 Kosten en vaste prijs
- `kosten(regel) = urenTotaal(regel) × projecttarief(teamlid)`
- `honorarium = Σ kosten`; `kantooropslag = honorarium × kantooropslagPct`; `totaal = honorarium + kantooropslag`
- Per fase hetzelfde, plus het percentage van het totaal.
- Vaste prijs: `verschil = vastePrijs − totaal`. Gemiddeld uurtarief: `honorarium / uren`, en o.b.v. de vaste prijs: `vastePrijs / uren`.

### 6.7 Aggregaties
- Fase × week: de som van de regel-uren per fase (staat in de kopregel van de fase in de Gantt).
- Teamlid × week: Bezetting, met een totaalregel.
- Teamlid × fase × maand: PACO. Een maand is de `maandsleutel(w)` van 6.1.
- Totaal per week: bovenaan de Gantt.

### 6.8 PACO-export
Eén regel per **teamlid × fase × maand** met uren > 0, gesorteerd op teamlid, dan fase, dan maand.

| Kolom | Bron |
|---|---|
| Projectnummer | project.pacoProjectnr |
| Projectnaam | project.naam |
| Fasecode | fase.pacoFasecode, anders fase.code |
| Fase | fase.naam |
| Medewerker | medewerker.naam |
| PACO-medewerkernr | medewerker.pacoMedewerkernr |
| Functie | medewerker.functie |
| Rol | teamlid.rolNaam |
| Jaar, Maand, Periode | uit maandsleutel; Periode = `JJJJ-MM` |
| Uren | som |
| Uurtarief | projecttarief |
| Bedrag | uren × uurtarief |

**Controle:** het totaal van de export moet gelijk zijn aan het totaal van de Planning en het Budget.

### 6.9 Koppelen op codes (geleerde les uit Excel)
In Excel gaf de koppeling inzetregel → fase de melding "Fase bestaat niet" als de code een spatie of een getal bevatte. In de web-versie koppel je op **id**. Waar toch op tekst vergeleken wordt (bijvoorbeeld bij een import uit Excel): normaliseer met `trim`, hoofdletter-ongevoelig en als tekst.

## 7. Validaties

| # | Controle | Ernst | Melding |
|---|---|---|---|
| 1 | Inzetregel zonder fase / fase onbekend / fase zonder duur | Fout | "Kies een fase" / "Fase 'X' niet gevonden" / "Fase heeft geen duur" |
| 2 | Inzetregel zonder rol / rol niet in team | Fout | "Kies een rol" / "Rol staat niet in Team" |
| 3 | Waarde ≤ 0 | Fout | "Vul een waarde in" |
| 4 | Vanaf-week ligt na het einde van de fase (venster leeg) | Fout | "Startweek ligt na einde fase" |
| 5 | Methode TOTAAL met `Wtot = 0` | Fout | "Geen uren (beschikbaarheid 0%?)" |
| 6 | Teamlid zonder tarief (sleutel GEEN, geen handmatig tarief) | Fout | "Geen extern tarief – vul tarief handmatig in" |
| 7 | Rol dubbel in team / fasecode dubbel | Fout | "Rol staat dubbel" / "Code dubbel" |
| 8 | Fase start vóór de projectstart | Fout | "Start vóór projectstart" |
| 9 | Planning ≠ Budget ≠ PACO-totaal | Fout | "Totalen sluiten niet aan" |
| 10 | Venster loopt door na het einde van de fase | Waarschuwing | "Let op: loopt door na einde fase" |
| 11 | Medewerker met koppeling 'Aanname' | Waarschuwing | "Tariefniveau is een aanname" |
| 12 | Teamlid in een week boven de beschikbaarheid (of boven 5 × urenPerDag) | Waarschuwing | in Bezetting rood |
| 13 | Vaste prijs wijkt ≥ €1 af van het berekende totaal | Info | in Budget |

Alleen **fouten** tellen mee in de statusbalk bovenaan.

## 8. Look & feel

Overnemen uit het huidige D&S-format (zie de tab Planning van de referentie-Excel):

- **Lettertype:** Calibri (tekst 10pt, koppen Calibri Light 12pt). Weekcellen: Arial 8pt, gecentreerd.
- **Kopregels Gantt:** Jaar en Maand op `#F2F2F2`, Week en kolomkoppen op `#D9D9D9`. De kolomkoppen staan vet met een zwarte lijn eronder.
- **Linkerkolommen (vast bij scrollen):** Fase/activiteit · Code · Wie · Uren · Kosten (€). Daarna één kolom per week.
- **Faserij:** de hele rij in de fasekleur, tekst vet. De weekcellen tonen het fasetotaal per week. Label: `{fasenaam} ({mmm jjjj} – {mmm jjjj})`.
- **Fasekleuren** (achtergrond / tekst), in volgorde:
  1 `#ED7D31`/wit · 2 `#E278B0`/zwart · 3 `#8CCEBB`/zwart · 4 `#FFD966`/zwart · 5 `#00B050`/wit · 6 `#9966FF`/wit · 7 `#4595B1`/wit · 8 `#A5A5A5`/zwart · 9 `#F4B183`/zwart · 10 `#5B9BD5`/wit (daarna herhalen).
- **Activiteitregels:** weekcel met uren > 0 krijgt `#DAE3F3`. Nul = leeg. Dunne grijze lijn onder elke activiteitregel.
- **Maandgrenzen:** een verticale lijn links van de eerste week van elke maand.
- **Huidige week:** het weeknummer krijgt een oranje achtergrond (`#ED7D31`) met witte tekst.
- **Invoervelden** zijn visueel herkenbaar (Excel: lichtgeel `#FFF2CC` met blauwe tekst). Berekende velden zijn grijs (`#F2F2F2`) of alleen-lezen.
- **Statuskleuren:** fout `#F8CBAD`/`#9C0006`, waarschuwing `#FFEB9C`/`#9C5700`, OK `#C6EFCE`/`#006100`.
- Taal van de interface: Nederlands. Datums `dd-mm-jjjj`, bedragen `€ 1.234`.

## 9. Export

- **PACO:** CSV (puntkomma, UTF-8 met BOM, decimale komma) en XLSX. *Aanname: het exacte PACO-importformat is nog niet bekend; kolommen en scheidingsteken afstemmen met finance.*
- **Planning:** XLSX in het huidige format (voor klanten en archief) en PDF (A3 liggend).
- **Volledige back-up van een project:** JSON (import/export), zodat een project ook terug te zetten is.

## 10. Niet-functionele eisen

- Herberekening na een wijziging binnen ±200 ms, bij een project van 200 regels en 156 weken.
- Werkt in Edge en Chrome (desktop). Op mobiel alleen lezen is voldoende.
- Autosave, plus een versiegeschiedenis per project (wie heeft wat gewijzigd, en een versie terugzetten).
- Offerte "bevriezen" (zie 4).
- Hosting intern of in de D&S-cloudomgeving. Afstemmen met IT: hosting, back-ups, SSO, AVG.

## 11. Voorgestelde aanpak techniek (advies, geen eis)

- **Rekenkern** als losse, pure module (bijvoorbeeld TypeScript) zonder UI-afhankelijkheden, met unit tests op de cases uit hoofdstuk 12. Dat is het belangrijkste onderdeel: als de kern klopt, volgt de rest.
- **Frontend:** een framework met een goede data-grid voor de Inzet-tabel (spreadsheet-gedrag) en een eigen Gantt-render volgens hoofdstuk 8.
- **Backend:** een relationele database volgens hoofdstuk 4, plus SSO.
- **Fasering:** (1) rekenkern + tests → (2) invoerschermen + Planning met lokale opslag → (3) login, database en delen → (4) exports en beheer → (5) migratie-import vanuit de Excel-template.

## 12. Acceptatietests (verwachte uitkomsten uit de referentie-Excel)

### 12.1 Politie Zwolle (bestand "voorbeeld Politie Zwolle")
Instellingen: start 04-01-2027, afronding hele uren, feestdagen **uit**, basisjaar 2026, indexatie 3,4%, kantooropslag 5%.

| Fase | Duur | Handmatige start | Weken | Uren | Honorarium |
|---|---|---|---|---|---|
| SO | 5 | – | 1–5 | 128 | € 21.008 |
| VO | 8 | – | 6–13 | 240 | € 40.352 |
| DO | 13 | – | 14–26 | 326 | € 54.934 |
| TO | 13 | – | 27–39 | 298 | € 50.186 |
| PC | 13 | 06-09-2027 | 36–48 | 180 | € 29.588 |
| UO | 11 | 04-10-2027 | 40–50 | 122 | € 20.354 |
| RE | 52 | 03-01-2028 | 53–104 | 440 | € 72.776 |
| **Totaal** | | | | **1.734** | **€ 289.198** |

- Kantooropslag € 14.459,90 → totaal **€ 303.657,90**.
- Team:

  | Rol | Medewerker | Sleutel | Basis | Uren 2027 / 2028 | Projecttarief |
  |---|---|---|---|---|---|
  | Projectleider | Daphne Gielesen | SR-PM | € 163 | 728 / 328 | **€ 171** |
  | Projectcoördinator | Edwin de Weerd | MD-PM | € 142 | 186 / 112 | **€ 149** |
  | Bouwkostendeskundige | Rob van der Heiden | SR-CON | € 163 | 380 / 0 | **€ 169** |

  (Tarief 2027 = 163 × 1,034 = 168,542; tarief 2028 = 174,272428.)
- PACO-export: **78 regels**. De eerste regel is: Daphne Gielesen · SO · 2027-01 · 40 uur · € 171 · € 6.840. Februari 2027 (alleen week 5): 8 uur.
- Alle inzetregels staan op OK. Controles: 0 fouten, 3 waarschuwingen (tariefniveau 'Aanname').

### 12.2 Unit cases verdeling
| Case | Invoer | Verwacht per week |
|---|---|---|
| Cumulatief gelijk | 40 uur, 6 weken, hele uren | 7, 6, 7, 7, 6, 7 |
| Gelijk exact | 40 uur, 5 weken | 8, 8, 8, 8, 8 |
| Per week + feestdag | 12 u/wk, VO-weken 6–13, feestdagen aan, halve uren | 12 × 7, en week 13 (2e Paasdag 29-03-2027) = 9,5 |
| Oplopend + feestdagen | 40 uur, weken 14–19, feestdagen aan, halve uren (wk 17 Koningsdag, wk 18 Hemelvaart = 80%) | 2; 4,5; 6; 6,5; 8,5; 12,5 (som 40) |
| Aflopend + feestdagen | idem, Aflopend | 12; 10; 8; 5; 3; 2 (som 40) |
| Dagen per week | 2 dagen/wk, 4 weken, 8 u/dag | 16, 16, 16, 16 |
| Lange reeks | 328 uur over 52 weken, halve uren | grotendeels 6,5, soms 6; som exact 328 |
| Kerstsluiting | afwijking 0% in een week, methode TOTAAL | 0 in die week; de uren schuiven naar de andere weken, totaal gelijk |

### 12.3 Validatiecases
- Fase "XX" (bestaat niet) → fout. Rol "Architect" (niet in team) → fout. Vanaf-week 4 + 5 weken in een fase van 5 weken → waarschuwing "loopt door na einde fase".
- Code "VO " op Project en "vo" op Inzet (alleen bij tekstimport) → moet matchen.

## 13. Feestdagen (seed)
De officiële Nederlandse feestdagen 2026–2031 staan in de referentie-Excel (tab Feestdagen; Pasen is berekend). Standaardwaarden voor meetellen:
- Goede Vrijdag: **nee**.
- Bevrijdingsdag: **alleen in lustrumjaren** (2030).

*Aanname. Controleren aan de hand van de D&S-arbeidsvoorwaarden.* Koningsdag op zondag verschuift naar zaterdag 26 april.

## 14. Seed-data
- Medewerkers en tarieven: `DSNL_medewerkers_en_tarieven_2026.xlsx` (tabs "Medewerkers" en "Tarieven 2026"). Bij 33 medewerkers staat de tariefkoppeling op **'Aanname'**: behoud die vlag.
- Plaatshouders "NNB – {functie}" per tariefsleutel, voor als de persoon nog niet bekend is.
- PACO-medewerkernummers: nog aan te leveren door finance.

## 15. Open punten
1. Het exacte PACO-importformat (kolommen, scheidingsteken, fasecodes). Is de maandregel "maand van de donderdag" akkoord voor finance?
2. Wie beheert medewerkers en tarieven, en hoe vaak? Kan de lijst automatisch gesynchroniseerd worden met de M365-directory?
3. Hosting, SSO en AVG-akkoord (IT).
4. Moet de klantversie van de planning de tarieven verbergen?
5. Bevriezen van offertes: bij status "verstuurd", of handmatig?
6. Feestdagen- en kerstsluitingsbeleid van D&S.
