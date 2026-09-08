export type LatLng = [number, number];

export type AssetLevel = 1 | 2 | 3;

export interface UsageEvent {
  t: number;
  count: number;
}

export interface DefenseUnit {
  id: string;
  name: string;
  position: LatLng;
  coverageKm: number;
  initialInventory: number;
  usageEvents: UsageEvent[];
  status: 'active' | 'degraded' | 'offline';
}

export interface ThreatPoint {
  id: string;
  label: string;
  position: LatLng;
  directionDeg: number;
  spawnAt: number;
}

export interface SensitiveAsset {
  id: string;
  name: string;
  level: AssetLevel;
  position: LatLng;
}

export interface PolygonArea {
  id: string;
  name: string;
  points: LatLng[];
}

export interface HistoricalTrackPoint {
  t: number;
  position: LatLng;
}

export interface HistoricalTrack {
  id: string;
  name: string;
  points: HistoricalTrackPoint[];
}

export interface PotentialRoute {
  id: string;
  name: string;
  confidenceLabel: 'low' | 'medium' | 'high';
  points: LatLng[];
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  durationSec: number;
  defenseUnits: DefenseUnit[];
  threats: ThreatPoint[];
  assets: SensitiveAsset[];
  openAreas: PolygonArea[];
  historicalTracks: HistoricalTrack[];
  potentialRoutes: PotentialRoute[];
  notes?: string;
}

export type LayerKey =
  | 'coverage'
  | 'overlaps'
  | 'assets'
  | 'threats'
  | 'openAreas'
  | 'uncovered'
  | 'historicalTracks'
  | 'potentialRoutes'
  | 'suggestedDeployment';

export interface LayerExchangePayload {
  version: 1;
  scenarioId: string;
  exportedAt: string;
  layers: Partial<Record<LayerKey, unknown>>;
}

export interface ScenarioScore {
  total: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}
