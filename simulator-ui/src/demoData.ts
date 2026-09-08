import type { Scenario } from './types';

export const demoScenario: Scenario = {
  id: 'scenario-demo-001',
  name: 'תרחיש דמה - עומס רב שכבתי',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  durationSec: 180,
  notes: 'נתוני דמה בלבד לצורך פיתוח UI וסימולציה סינתטית.',
  defenseUnits: [
    {
      id: 'd1',
      name: 'מערכת A',
      position: [37.85, -96.6],
      coverageKm: 110,
      initialInventory: 24,
      status: 'active',
      usageEvents: [
        { t: 18, count: 1 },
        { t: 33, count: 2 },
        { t: 67, count: 3 },
        { t: 115, count: 2 },
      ],
    },
    {
      id: 'd2',
      name: 'מערכת B',
      position: [37.1, -95.2],
      coverageKm: 95,
      initialInventory: 18,
      status: 'active',
      usageEvents: [
        { t: 28, count: 1 },
        { t: 49, count: 2 },
        { t: 88, count: 2 },
        { t: 132, count: 3 },
      ],
    },
    {
      id: 'd3',
      name: 'מערכת C',
      position: [36.6, -97.25],
      coverageKm: 90,
      initialInventory: 16,
      status: 'degraded',
      usageEvents: [
        { t: 40, count: 1 },
        { t: 73, count: 1 },
        { t: 101, count: 2 },
        { t: 150, count: 2 },
      ],
    },
  ],
  threats: [
    { id: 't1', label: 'איום 01', position: [38.65, -97.8], directionDeg: 140, spawnAt: 12 },
    { id: 't2', label: 'איום 02', position: [38.25, -94.5], directionDeg: 225, spawnAt: 25 },
    { id: 't3', label: 'איום 03', position: [35.9, -95.0], directionDeg: 315, spawnAt: 58 },
    { id: 't4', label: 'איום 04', position: [36.1, -98.2], directionDeg: 30, spawnAt: 92 },
  ],
  assets: [
    { id: 'a1', name: 'נכס רגיש אלפא', level: 3, position: [37.45, -96.05] },
    { id: 'a2', name: 'נכס רגיש בטא', level: 2, position: [36.95, -96.45] },
    { id: 'a3', name: 'נכס רגיש גמא', level: 1, position: [37.7, -95.4] },
  ],
  openAreas: [
    {
      id: 'o1',
      name: 'שטח פתוח מערבי',
      points: [
        [36.7, -98.5],
        [38.1, -98.4],
        [38.0, -97.45],
        [36.8, -97.55],
      ],
    },
  ],
  historicalTracks: [
    {
      id: 'h1',
      name: 'מסלול עבר 01',
      points: [
        { t: 0, position: [38.7, -98.1] },
        { t: 20, position: [38.2, -97.4] },
        { t: 40, position: [37.7, -96.8] },
        { t: 60, position: [37.45, -96.05] },
      ],
    },
    {
      id: 'h2',
      name: 'מסלול עבר 02',
      points: [
        { t: 0, position: [35.85, -94.75] },
        { t: 25, position: [36.45, -95.2] },
        { t: 55, position: [36.95, -96.0] },
      ],
    },
  ],
  potentialRoutes: [
    {
      id: 'r1',
      name: 'נתיב דמה צפוני',
      confidenceLabel: 'medium',
      points: [
        [38.8, -97.6],
        [38.15, -97.0],
        [37.55, -96.4],
      ],
    },
    {
      id: 'r2',
      name: 'נתיב דמה דרומי',
      confidenceLabel: 'low',
      points: [
        [35.7, -95.0],
        [36.25, -95.5],
        [36.9, -96.1],
      ],
    },
  ],
};

export const secondScenario: Scenario = {
  ...demoScenario,
  id: 'scenario-demo-002',
  name: 'תרחיש דמה - מלאי מצומצם',
  createdAt: new Date(Date.now() - 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
  defenseUnits: demoScenario.defenseUnits.map((unit) => ({
    ...unit,
    initialInventory: Math.max(8, unit.initialInventory - 7),
  })),
};
