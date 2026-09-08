import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoScenario, secondScenario } from './demoData';
import type { LayerKey, Scenario } from './types';

interface SimulatorState {
  scenarios: Scenario[];
  activeScenarioId: string;
  simTime: number;
  isPlaying: boolean;
  speed: number;
  layers: Record<LayerKey, boolean>;
  selectScenario: (id: string) => void;
  setTime: (time: number) => void;
  setPlaying: (value: boolean) => void;
  setSpeed: (speed: number) => void;
  toggleLayer: (layer: LayerKey) => void;
  duplicateScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  replaceScenario: (scenario: Scenario) => void;
  addScenario: (scenario: Scenario) => void;
}

const defaultLayers: Record<LayerKey, boolean> = {
  coverage: true,
  overlaps: true,
  assets: true,
  threats: true,
  openAreas: true,
  uncovered: false,
  historicalTracks: true,
  potentialRoutes: true,
  suggestedDeployment: true,
};

export const useSimulatorStore = create<SimulatorState>()(
  persist(
    (set) => ({
      scenarios: [demoScenario, secondScenario],
      activeScenarioId: demoScenario.id,
      simTime: 0,
      isPlaying: false,
      speed: 1,
      layers: defaultLayers,
      selectScenario: (id) => set({ activeScenarioId: id, simTime: 0, isPlaying: false }),
      setTime: (simTime) => set({ simTime }),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setSpeed: (speed) => set({ speed }),
      toggleLayer: (layer) =>
        set((state) => ({ layers: { ...state.layers, [layer]: !state.layers[layer] } })),
      duplicateScenario: (id) =>
        set((state) => {
          const source = state.scenarios.find((scenario) => scenario.id === id);
          if (!source) return state;
          const now = new Date().toISOString();
          const copy: Scenario = {
            ...structuredClone(source),
            id: `${source.id}-copy-${Date.now()}`,
            name: `${source.name} - עותק`,
            createdAt: now,
            updatedAt: now,
          };
          return {
            scenarios: [copy, ...state.scenarios],
            activeScenarioId: copy.id,
            simTime: 0,
            isPlaying: false,
          };
        }),
      renameScenario: (id, name) =>
        set((state) => ({
          scenarios: state.scenarios.map((scenario) =>
            scenario.id === id
              ? { ...scenario, name, updatedAt: new Date().toISOString() }
              : scenario,
          ),
        })),
      replaceScenario: (scenario) =>
        set((state) => ({
          scenarios: state.scenarios.map((item) => (item.id === scenario.id ? scenario : item)),
        })),
      addScenario: (scenario) =>
        set((state) => ({
          scenarios: [scenario, ...state.scenarios],
          activeScenarioId: scenario.id,
          simTime: 0,
          isPlaying: false,
        })),
    }),
    {
      name: 'scenario-simulator-store-v1',
      partialize: (state) => ({
        scenarios: state.scenarios,
        activeScenarioId: state.activeScenarioId,
        layers: state.layers,
      }),
    },
  ),
);
