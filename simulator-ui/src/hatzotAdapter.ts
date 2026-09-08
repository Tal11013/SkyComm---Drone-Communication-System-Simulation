import type { LayerExchangePayload, LayerKey, Scenario } from './types';

/**
 * Contract placeholder for the future "Hatzot" layer integration.
 * No real endpoint/schema was provided, so this module keeps the boundary explicit
 * and offers a local mock for development.
 */
export interface HatzotLayerAdapter {
  pullLayers(scenarioId: string): Promise<LayerExchangePayload>;
  pushLayers(payload: LayerExchangePayload): Promise<void>;
}

export function buildLayerPayload(scenario: Scenario, requestedLayers: LayerKey[]): LayerExchangePayload {
  const layers: Partial<Record<LayerKey, unknown>> = {};

  for (const layer of requestedLayers) {
    switch (layer) {
      case 'coverage':
      case 'overlaps':
      case 'uncovered':
      case 'suggestedDeployment':
        layers[layer] = { source: 'simulator', scenarioId: scenario.id };
        break;
      case 'assets':
        layers[layer] = scenario.assets;
        break;
      case 'threats':
        layers[layer] = scenario.threats;
        break;
      case 'openAreas':
        layers[layer] = scenario.openAreas;
        break;
      case 'historicalTracks':
        layers[layer] = scenario.historicalTracks;
        break;
      case 'potentialRoutes':
        layers[layer] = scenario.potentialRoutes;
        break;
    }
  }

  return {
    version: 1,
    scenarioId: scenario.id,
    exportedAt: new Date().toISOString(),
    layers,
  };
}

const mockStorageKey = 'hatzot-layer-exchange-mock-v1';

export class LocalMockHatzotAdapter implements HatzotLayerAdapter {
  async pullLayers(scenarioId: string): Promise<LayerExchangePayload> {
    const raw = localStorage.getItem(mockStorageKey);
    if (!raw) {
      return { version: 1, scenarioId, exportedAt: new Date().toISOString(), layers: {} };
    }
    return JSON.parse(raw) as LayerExchangePayload;
  }

  async pushLayers(payload: LayerExchangePayload): Promise<void> {
    localStorage.setItem(mockStorageKey, JSON.stringify(payload));
  }
}

export const hatzotAdapter = new LocalMockHatzotAdapter();
