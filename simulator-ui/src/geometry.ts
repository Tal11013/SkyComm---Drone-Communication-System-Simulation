import { circle, distance, featureCollection, intersect, point } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { DefenseUnit, LatLng } from './types';

export function coveragePolygon(unit: DefenseUnit): Feature<Polygon> {
  return circle(point([unit.position[1], unit.position[0]]), unit.coverageKm, {
    steps: 72,
    units: 'kilometers',
  }) as Feature<Polygon>;
}

export function overlapPolygons(units: DefenseUnit[]): Array<Feature<Polygon | MultiPolygon>> {
  const result: Array<Feature<Polygon | MultiPolygon>> = [];
  for (let i = 0; i < units.length; i += 1) {
    for (let j = i + 1; j < units.length; j += 1) {
      const a = coveragePolygon(units[i]);
      const b = coveragePolygon(units[j]);
      const overlap = intersect(featureCollection([a, b]));
      if (overlap) result.push(overlap as Feature<Polygon | MultiPolygon>);
    }
  }
  return result;
}

export function geoJsonToLeaflet(feature: Feature<Polygon | MultiPolygon>): LatLng[][][] {
  const geometry = feature.geometry;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LatLng)),
  );
}

export function isCovered(position: LatLng, units: DefenseUnit[]): boolean {
  return units.some((unit) => {
    const km = distance(point([position[1], position[0]]), point([unit.position[1], unit.position[0]]), {
      units: 'kilometers',
    });
    return km <= unit.coverageKm;
  });
}

export interface CoverageCell {
  center: LatLng;
  bounds: [LatLng, LatLng];
  coverageCount: number;
}

export function buildCoverageGrid(units: DefenseUnit[], rows = 14, cols = 18): CoverageCell[] {
  if (!units.length) return [];

  const lats = units.map((unit) => unit.position[0]);
  const lngs = units.map((unit) => unit.position[1]);
  const minLat = Math.min(...lats) - 1.8;
  const maxLat = Math.max(...lats) + 1.8;
  const minLng = Math.min(...lngs) - 2.3;
  const maxLng = Math.max(...lngs) + 2.3;
  const latStep = (maxLat - minLat) / rows;
  const lngStep = (maxLng - minLng) / cols;

  const cells: CoverageCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const south = minLat + row * latStep;
      const north = south + latStep;
      const west = minLng + col * lngStep;
      const east = west + lngStep;
      const center: LatLng = [(south + north) / 2, (west + east) / 2];
      const coverageCount = units.filter((unit) => {
        const km = distance(point([center[1], center[0]]), point([unit.position[1], unit.position[0]]), {
          units: 'kilometers',
        });
        return km <= unit.coverageKm;
      }).length;
      cells.push({ center, bounds: [[south, west], [north, east]], coverageCount });
    }
  }
  return cells;
}

export function remainingInventory(unit: DefenseUnit, simTime: number): number {
  const used = unit.usageEvents
    .filter((event) => event.t <= simTime)
    .reduce((sum, event) => sum + event.count, 0);
  return Math.max(0, unit.initialInventory - used);
}
