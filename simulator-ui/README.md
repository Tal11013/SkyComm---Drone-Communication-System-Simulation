# Scenario Simulator UI (TypeScript)

React + TypeScript prototype for a synthetic scenario simulation workspace.

> The demo data and the Data-algorithm provider are intentionally synthetic. The project is structured so real organization-specific algorithms and external layer APIs can be connected behind adapters later.

## What is implemented

- Dark RTL UI shell and map workspace.
- Map layers for system coverage, overlap polygons, sensitive assets, threat points, open areas, uncovered grid cells, historical tracks, potential routes and suggested deployment demo points.
- Live inventory dashboard driven by the simulation timeline.
- Scenario history persisted in browser `localStorage`.
- Scenario selection, duplicate and edit name/duration.
- YouTube-style timeline: play, pause, seek, speed and restart.
- Historical path visualization.
- Synthetic Data-team adapter for suggested deployment, potential routes and run scoring.
- Run-score panel with strengths, weaknesses and follow-up suggestions.
- Hatzot layer exchange contract plus a local mock adapter until the real API/schema is available.
- Coverage/uncovered grid visualization and overlap polygon calculation using Turf.

## Run on Windows

### Prerequisites

Install Node.js 20+ (Node 22 LTS is recommended) and Git.

Open **PowerShell**:

```powershell
git clone https://github.com/Tal11013/SkyComm---Drone-Communication-System-Simulation.git
cd SkyComm---Drone-Communication-System-Simulation
git checkout feature/simulator-ui-typescript
cd simulator-ui
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

### Production build

```powershell
npm run build
npm run preview
```

## Structure

```text
simulator-ui/
  src/
    App.tsx              # main UI, map, dashboard, timeline
    dataAlgorithms.ts    # adapter for future Data algorithms
    demoData.ts          # synthetic scenarios
    geometry.ts          # coverage, overlap and grid calculations
    hatzotAdapter.ts     # layer exchange contract + local mock
    store.ts             # scenario history + persisted UI state
    types.ts             # domain schemas
    styles.css
```

## Connecting the Data team

Replace `DemoDataAlgorithmsProvider` with an implementation of `DataAlgorithmsProvider`:

```ts
export interface DataAlgorithmsProvider {
  getSuggestedDeployment(scenario: Scenario): Promise<LatLng[]>;
  getPotentialRoutes(scenario: Scenario): Promise<PotentialRoute[]>;
  scoreScenario(scenario: Scenario, finalTime: number): Promise<ScenarioScore>;
}
```

The UI does not need to change when the provider is replaced.

## Connecting Hatzot

The real Hatzot protocol/API was not supplied, so the current implementation uses `LocalMockHatzotAdapter` and stores the exported payload in local browser storage.

Implement this interface when the real endpoint and schemas are known:

```ts
export interface HatzotLayerAdapter {
  pullLayers(scenarioId: string): Promise<LayerExchangePayload>;
  pushLayers(payload: LayerExchangePayload): Promise<void>;
}
```

This keeps the map and UI independent from the transport/authentication details.
