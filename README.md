# Fee-Resourceplanner – Uren- en honorariumplanning (webversie)

Webversie van de Excel-tool *Uren- en honorariumplanning v1.1*, gebouwd volgens
[`planningstool-website-specificatie.md`](planningstool-website-specificatie.md).

**Status: stap 1 + 2 uit §11 van de specificatie** – rekenkern met tests, invoerschermen en
alle weergaven, met opslag in de browser. Inloggen, een centrale database en delen volgen later.

## Starten

Vereist Node.js 20 of hoger.

```bash
npm install
npm run dev        # ontwikkelserver op http://localhost:5173
npm test           # unit tests van de rekenkern
npm run build      # statische site in dist/ (te hosten op elke webserver)
```

## Website

Bij elke push naar `main` test en bouwt GitHub Actions de app en zet hem op GitHub Pages
(`.github/workflows/pages.yml`): https://edwindw00.github.io/Fee-Resourceplanner/

Eenmalig nodig: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Let op: de site is openbaar, maar bevat zelf geen medewerkers of tarieven van projecten; die staan
alleen in de browser van wie ze importeert.

## Wat er in zit

| Onderdeel (spec) | Status |
|---|---|
| Rekenkern §6 (weekraster ISO 8601, fases, vensters, verdeling met cumulatieve afronding, tarieven + indexatie, kosten, aggregaties, PACO) | ✔ `src/core/calc.ts` |
| Validaties §7 (alle 13) | ✔ |
| Unit tests §12.2 en §12.3, projecttarieven §12.1 (171 / 149 / 169), feestdagen 2026–2031 tegen de template, prestatie §10 | ✔ `src/core/calc.test.ts` |
| Projectenoverzicht: zoeken, nieuw, dupliceren, archiveren | ✔ |
| Project: instellingen, fasetabel, kalenderafwijkingen (bijv. kerstsluiting) | ✔ |
| Team: rol → medewerker (zoekbaar), tarief per jaar, projecttarief, status | ✔ |
| Inzet: bewerkbare tabel, Enter/pijltjes, plakken uit Excel, dupliceren, slepen | ✔ |
| Planning (Gantt) in D&S-stijl §8, Bezetting, Budget, Controles (klikt door) | ✔ |
| PACO-export: tabel, filters, CSV (puntkomma, BOM, decimale komma) en XLSX | ✔ |
| Beheer: medewerkers, tarieven, feestdagen; import uit de Excel-template | ✔ |
| Autosave (browser) en project-back-up als JSON (export/import) | ✔ |
| Login (SSO), database, delen, versiegeschiedenis, offerte bevriezen | ✘ volgt (§11 fase 3) |
| Planning exporteren naar XLSX/PDF | ✘ volgt (§11 fase 4); afdrukken via de browser werkt |
| Import van een ingevulde Excel-planning (Project/Team/Inzet) | ✘ volgt (§11 fase 5) |

## Aannames en keuzes

- **Opslag:** alles staat in `localStorage` van de browser. Een ander apparaat of een andere browser
  ziet dus andere gegevens. Gebruik *Exporteren (JSON)* om een project over te zetten.
- **Stamdata:** de app start met de tarieven uit tab *Tarieven* van de template, plaatshouders
  "NNB – …" per tariefsleutel en berekende feestdagen 2026–2035. Echte medewerkers importeer je onder
  **Beheer → Importeren uit Excel** (bijv. de template zelf). Er staan geen medewerkersnamen in de code.
- **Feestdagen:** berekend (Pasen volgens Meeus), met de standaard uit §13: Goede Vrijdag telt niet,
  Bevrijdingsdag alleen in lustrumjaren. De test controleert dat dit gelijk is aan tab *Feestdagen* van
  de template.
- **Afronden:** zoals Excel `ROUND` (half weg van nul), na het wegwerken van drijvende-kommaruis tot 12
  significante cijfers.
- **Projecttarief zonder uren:** het tarief van het ISO-jaar van week 1, naar boven afgerond (§6.5).
- **Bezetting:** de grens is *Beschikbaar u/week* of anders 5 × uren per dag, zoals in de Excel; de
  grens houdt (net als in de Excel) geen rekening met feestdagen.
- **Acceptatietest §12.1 (Politie Zwolle):** het bestand `… voorbeeld Politie Zwolle.xlsx` zit niet in de
  repo. De fasestructuur en de projecttarieven zijn getest; de volledige uitkomst (1.734 uur, € 289.198,
  78 PACO-regels) nog niet, omdat de inzetregels ontbreken.

## Structuur

```
src/core/      rekenkern (puur TypeScript, geen UI) + tests
src/ui/        schermen (React)
src/io.ts      import/export (Excel via exceljs, CSV, JSON)
src/store.ts   opslag in de browser + standaard-stamdata
```
