import type { LatLng, PotentialRoute, Scenario, ScenarioScore } from './types';

/**
 * Adapter boundary for the future Data team service.
 * The demo implementation below is intentionally synthetic and non-operational:
 * it exists only so the UI can be exercised end-to-end.
 */
export interface DataAlgorithmsProvider {
  getSuggestedDeployment(scenario: Scenario): Promise<LatLng[]>;
  getPotentialRoutes(scenario: Scenario): Promise<PotentialRoute[]>;
  scoreScenario(scenario: Scenario, finalTime: number): Promise<ScenarioScore>;
}

export class DemoDataAlgorithmsProvider implements DataAlgorithmsProvider {
  async getSuggestedDeployment(scenario: Scenario): Promise<LatLng[]> {
    return scenario.defenseUnits.map((unit, index) => [
      unit.position[0] + (index % 2 === 0 ? 0.18 : -0.18),
      unit.position[1] + (index % 2 === 0 ? -0.12 : 0.12),
    ] as LatLng);
  }

  async getPotentialRoutes(scenario: Scenario): Promise<PotentialRoute[]> {
    return scenario.potentialRoutes;
  }

  async scoreScenario(scenario: Scenario, finalTime: number): Promise<ScenarioScore> {
    const initial = scenario.defenseUnits.reduce((sum, unit) => sum + unit.initialInventory, 0);
    const used = scenario.defenseUnits.reduce(
      (sum, unit) =>
        sum + unit.usageEvents.filter((event) => event.t <= finalTime).reduce((acc, event) => acc + event.count, 0),
      0,
    );
    const reserveRatio = initial === 0 ? 0 : Math.max(0, (initial - used) / initial);
    const activeRatio = scenario.defenseUnits.length === 0
      ? 0
      : scenario.defenseUnits.filter((unit) => unit.status !== 'offline').length / scenario.defenseUnits.length;
    const total = Math.round((reserveRatio * 0.55 + activeRatio * 0.45) * 100);

    return {
      total,
      summary: 'ציון דמה המבוסס על שרידות משאבים וזמינות מערכות לצורך הדגמת ה-UI בלבד.',
      strengths: [
        activeRatio >= 0.8 ? 'רוב המערכות נשארו זמינות לאורך התרחיש.' : 'נשמרה זמינות חלקית של המערכות.',
        reserveRatio >= 0.35 ? 'נותר מלאי משמעותי בסיום הריצה.' : 'המערכת הצליחה להשלים את הריצה תחת מלאי מצומצם.',
      ],
      weaknesses: [
        reserveRatio < 0.25 ? 'המלאי בסיום הריצה נמוך.' : 'קיימים פערים מקומיים שכדאי לבחון בתרחיש נוסף.',
      ],
      suggestions: [
        'להריץ את אותו תרחיש עם וריאציות מלאי ולבחון רגישות.',
        'להשוות את התוצאה מול תרחיש בסיס ולבדוק אילו שכבות השתנו.',
      ],
    };
  }
}

export const dataAlgorithms = new DemoDataAlgorithmsProvider();
