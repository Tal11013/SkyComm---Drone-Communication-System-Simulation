import { useEffect, useMemo, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  Rectangle,
  TileLayer,
} from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import {
  buildCoverageGrid,
  coveragePolygon,
  geoJsonToLeaflet,
  overlapPolygons,
  remainingInventory,
} from './geometry';
import { dataAlgorithms } from './dataAlgorithms';
import { buildLayerPayload, hatzotAdapter } from './hatzotAdapter';
import { useSimulatorStore } from './store';
import type { LatLng, LayerKey, Scenario, ScenarioScore } from './types';

const layerLabels: Record<LayerKey, string> = {
  coverage: 'כיסוי מערכות',
  overlaps: 'פוליגוני חפיפה',
  assets: 'נכסים רגישים',
  threats: 'נ״צ איומים',
  openAreas: 'שטחים פתוחים',
  uncovered: 'אזורים לא מכוסים',
  historicalTracks: 'מסלולים קודמים',
  potentialRoutes: 'נתיבי כניסה פוטנציאליים',
  suggestedDeployment: 'פריסה מוצעת (דמו)',
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function ScenarioSidebar() {
  const {
    scenarios,
    activeScenarioId,
    selectScenario,
    duplicateScenario,
    replaceScenario,
    addScenario,
  } = useSimulatorStore();

  const createScenario = () => {
    const name = window.prompt('שם התרחיש החדש', 'תרחיש חדש');
    if (!name) return;
    const durationText = window.prompt('משך תרחיש בשניות', '180');
    const parsedDuration = Number(durationText);
    const now = new Date().toISOString();
    const scenario: Scenario = {
      id: `scenario-${Date.now()}`,
      name,
      createdAt: now,
      updatedAt: now,
      durationSec: Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 180,
      defenseUnits: [],
      threats: [],
      assets: [],
      openAreas: [],
      historicalTracks: [],
      potentialRoutes: [],
      notes: 'תרחיש חדש שנוצר דרך ה-UI.',
    };
    addScenario(scenario);
  };

  const editScenario = (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);
    if (!scenario) return;
    const name = window.prompt('שם התרחיש', scenario.name);
    if (!name) return;
    const durationText = window.prompt('משך תרחיש בשניות', String(scenario.durationSec));
    const duration = Number(durationText);
    replaceScenario({
      ...scenario,
      name,
      durationSec: Number.isFinite(duration) && duration > 0 ? duration : scenario.durationSec,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>Scenario Lab</strong>
          <small>Synthetic simulator</small>
        </div>
      </div>

      <button type="button" className="new-scenario-button" onClick={createScenario}>
        + תרחיש חדש
      </button>

      <div className="sidebar-section-title">היסטוריית תרחישים</div>
      <div className="scenario-list">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`scenario-card ${activeScenarioId === scenario.id ? 'active' : ''}`}
            onClick={() => selectScenario(scenario.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') selectScenario(scenario.id);
            }}
            role="button"
            tabIndex={0}
          >
            <span className="scenario-name">{scenario.name}</span>
            <span className="scenario-meta">עודכן {new Date(scenario.updatedAt).toLocaleString('he-IL')}</span>
            <span className="scenario-actions" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => duplicateScenario(scenario.id)}>שכפול</button>
              <button type="button" onClick={() => editScenario(scenario.id)}>עריכה</button>
            </span>
          </div>
        ))}
      </div>

      <div className="sidebar-tip">
        התרחישים נשמרים מקומית בדפדפן, כך שאפשר לסגור את האפליקציה ולחזור להרצות קודמות.
      </div>
    </aside>
  );
}

function LayersPanel() {
  const { layers, toggleLayer } = useSimulatorStore();
  return (
    <div className="floating-panel layers-panel">
      <div className="panel-title">שכבות מפה</div>
      {Object.entries(layerLabels).map(([key, label]) => {
        const layer = key as LayerKey;
        return (
          <label key={key} className="layer-row">
            <input type="checkbox" checked={layers[layer]} onChange={() => toggleLayer(layer)} />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

function InventoryDashboard() {
  const { scenarios, activeScenarioId, simTime } = useSimulatorStore();
  const scenario = scenarios.find((item) => item.id === activeScenarioId);
  if (!scenario) return null;

  const totalInitial = scenario.defenseUnits.reduce((sum, unit) => sum + unit.initialInventory, 0);
  const totalRemaining = scenario.defenseUnits.reduce(
    (sum, unit) => sum + remainingInventory(unit, simTime),
    0,
  );

  return (
    <div className="floating-panel inventory-panel">
      <div className="panel-title">מלאי בזמן הרצה</div>
      <div className="inventory-total">
        <strong>{totalRemaining}</strong>
        <span>מתוך {totalInitial} נותרו</span>
      </div>
      <div className="inventory-list">
        {scenario.defenseUnits.length === 0 && <span className="empty-hint">אין מערכות בתרחיש.</span>}
        {scenario.defenseUnits.map((unit) => {
          const remaining = remainingInventory(unit, simTime);
          const percent = unit.initialInventory ? Math.round((remaining / unit.initialInventory) * 100) : 0;
          return (
            <div key={unit.id} className="inventory-item">
              <div className="inventory-line">
                <span>{unit.name}</span>
                <b>{remaining}/{unit.initialInventory}</b>
              </div>
              <div className="progress"><span style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Timeline() {
  const { scenarios, activeScenarioId, simTime, setTime, isPlaying, setPlaying, speed, setSpeed } = useSimulatorStore();
  const scenario = scenarios.find((item) => item.id === activeScenarioId);
  if (!scenario) return null;

  return (
    <div className="timeline-shell">
      <div className="timeline-controls">
        <button type="button" onClick={() => setTime(0)} title="התחלה">⏮</button>
        <button type="button" className="play-button" onClick={() => setPlaying(!isPlaying)}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" onClick={() => setTime(Math.min(scenario.durationSec, simTime + 10))}>+10s</button>
        <span className="time-readout">{formatTime(simTime)} / {formatTime(scenario.durationSec)}</span>
        <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          <option value={0.5}>×0.5</option>
          <option value={1}>×1</option>
          <option value={2}>×2</option>
          <option value={5}>×5</option>
        </select>
      </div>
      <input
        className="timeline-range"
        type="range"
        min={0}
        max={scenario.durationSec}
        step={0.25}
        value={simTime}
        onChange={(event) => setTime(Number(event.target.value))}
      />
      <div className="timeline-events">
        {scenario.threats.map((threat) => (
          <span
            key={threat.id}
            className="timeline-event"
            style={{ right: `${(threat.spawnAt / scenario.durationSec) * 100}%` }}
            title={`${threat.label} @ ${formatTime(threat.spawnAt)}`}
          />
        ))}
      </div>
    </div>
  );
}

function SimulatorMap({ suggestedDeployment }: { suggestedDeployment: LatLng[] }) {
  const { scenarios, activeScenarioId, simTime, layers } = useSimulatorStore();
  const scenario = scenarios.find((item) => item.id === activeScenarioId);

  const overlaps = useMemo(
    () => (scenario ? overlapPolygons(scenario.defenseUnits) : []),
    [scenario],
  );
  const grid = useMemo(
    () => (scenario ? buildCoverageGrid(scenario.defenseUnits) : []),
    [scenario],
  );

  if (!scenario) return null;

  return (
    <MapContainer center={[37.35, -96.25]} zoom={6} className="map" zoomControl={true}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {layers.uncovered && grid.map((cell, index) => (
        <Rectangle
          key={`grid-${index}`}
          bounds={cell.bounds as [LatLngExpression, LatLngExpression]}
          pathOptions={{
            color: cell.coverageCount === 0 ? '#ef4444' : '#22c55e',
            weight: 0.2,
            fillOpacity: cell.coverageCount === 0 ? 0.25 : 0.06,
          }}
        />
      ))}

      {layers.openAreas && scenario.openAreas.map((area) => (
        <Polygon
          key={area.id}
          positions={area.points as LatLngExpression[]}
          pathOptions={{ color: '#22c55e', weight: 1.5, fillOpacity: 0.12 }}
        >
          <Popup>{area.name}</Popup>
        </Polygon>
      ))}

      {layers.coverage && scenario.defenseUnits.map((unit) => (
        <Polygon
          key={`coverage-${unit.id}`}
          positions={geoJsonToLeaflet(coveragePolygon(unit))[0] as unknown as LatLngExpression[][]}
          pathOptions={{ color: '#38bdf8', weight: 1.5, fillOpacity: 0.08 }}
        />
      ))}

      {layers.overlaps && overlaps.flatMap((feature, featureIndex) =>
        geoJsonToLeaflet(feature).map((polygon, polygonIndex) => (
          <Polygon
            key={`overlap-${featureIndex}-${polygonIndex}`}
            positions={polygon as unknown as LatLngExpression[][]}
            pathOptions={{ color: '#a855f7', weight: 2, fillOpacity: 0.22 }}
          />
        )),
      )}

      {scenario.defenseUnits.map((unit) => (
        <CircleMarker
          key={unit.id}
          center={unit.position as LatLngExpression}
          radius={9}
          pathOptions={{ color: unit.status === 'degraded' ? '#f59e0b' : '#0ea5e9', fillOpacity: 0.95 }}
        >
          <Popup>
            <strong>{unit.name}</strong><br />
            כיסוי דמה: {unit.coverageKm} ק״מ<br />
            מלאי נוכחי: {remainingInventory(unit, simTime)}
          </Popup>
        </CircleMarker>
      ))}

      {layers.assets && scenario.assets.map((asset) => (
        <CircleMarker
          key={asset.id}
          center={asset.position as LatLngExpression}
          radius={7 + asset.level * 2}
          pathOptions={{ color: asset.level === 3 ? '#ef4444' : asset.level === 2 ? '#f59e0b' : '#eab308', fillOpacity: 0.9 }}
        >
          <Popup><strong>{asset.name}</strong><br />רמת רגישות: {asset.level}</Popup>
        </CircleMarker>
      ))}

      {layers.threats && scenario.threats
        .filter((threat) => threat.spawnAt <= simTime)
        .map((threat) => (
          <CircleMarker
            key={threat.id}
            center={threat.position as LatLngExpression}
            radius={6}
            pathOptions={{ color: '#dc2626', fillOpacity: 1 }}
          >
            <Popup>
              <strong>{threat.label}</strong><br />
              כיוון סינתטי: {threat.directionDeg}°<br />
              הופיע ב-{formatTime(threat.spawnAt)}
            </Popup>
          </CircleMarker>
        ))}

      {layers.historicalTracks && scenario.historicalTracks.map((track) => (
        <Polyline
          key={track.id}
          positions={track.points.map((point) => point.position) as LatLngExpression[]}
          pathOptions={{ color: '#64748b', weight: 3, dashArray: '7 7', opacity: 0.75 }}
        >
          <Popup>{track.name}</Popup>
        </Polyline>
      ))}

      {layers.potentialRoutes && scenario.potentialRoutes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.points as LatLngExpression[]}
          pathOptions={{ color: '#f97316', weight: 3, dashArray: '3 8', opacity: 0.85 }}
        >
          <Popup>{route.name} · confidence {route.confidenceLabel}</Popup>
        </Polyline>
      ))}

      {layers.suggestedDeployment && suggestedDeployment.map((position, index) => (
        <Circle
          key={`suggestion-${index}`}
          center={position as LatLngExpression}
          radius={18000}
          pathOptions={{ color: '#8b5cf6', weight: 2, dashArray: '4 5', fillOpacity: 0.08 }}
        >
          <Popup>נקודת פריסה מוצעת #{index + 1} — Demo Provider</Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}

function AnalysisPanel({ score }: { score: ScenarioScore | null }) {
  if (!score) return null;
  return (
    <div className="analysis-card">
      <div className="analysis-score">{score.total}</div>
      <div>
        <strong>ציון ריצה — דמו</strong>
        <p>{score.summary}</p>
        <div className="analysis-columns">
          <div><b>מה עבד</b><ul>{score.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><b>לשיפור</b><ul>{score.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><b>המשך</b><ul>{score.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const {
    scenarios,
    activeScenarioId,
    simTime,
    isPlaying,
    speed,
    setTime,
    setPlaying,
  } = useSimulatorStore();
  const scenario = scenarios.find((item) => item.id === activeScenarioId);
  const [suggestedDeployment, setSuggestedDeployment] = useState<LatLng[]>([]);
  const [score, setScore] = useState<ScenarioScore | null>(null);
  const [syncStatus, setSyncStatus] = useState('לא סונכרן');

  useEffect(() => {
    if (!scenario) return;
    void dataAlgorithms.getSuggestedDeployment(scenario).then(setSuggestedDeployment);
    setScore(null);
  }, [scenario?.id]);

  useEffect(() => {
    if (!scenario || !isPlaying) return undefined;
    const id = window.setInterval(() => {
      const state = useSimulatorStore.getState();
      const next = Math.min(scenario.durationSec, state.simTime + 0.5 * speed);
      setTime(next);
      if (next >= scenario.durationSec) setPlaying(false);
    }, 500);
    return () => window.clearInterval(id);
  }, [isPlaying, scenario?.id, scenario?.durationSec, speed, setPlaying, setTime]);

  if (!scenario) return <div>לא נמצא תרחיש.</div>;

  const runScore = async () => {
    setScore(await dataAlgorithms.scoreScenario(scenario, simTime));
  };

  const pushToHatzot = async () => {
    const payload = buildLayerPayload(scenario, Object.keys(layerLabels) as LayerKey[]);
    await hatzotAdapter.pushLayers(payload);
    setSyncStatus(`נשלח ל-Mock ב-${new Date().toLocaleTimeString('he-IL')}`);
  };

  const pullFromHatzot = async () => {
    const payload = await hatzotAdapter.pullLayers(scenario.id);
    setSyncStatus(`נמשכו ${Object.keys(payload.layers).length} שכבות מ-Mock`);
  };

  return (
    <div className="app-shell" dir="rtl">
      <ScenarioSidebar />
      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="eyebrow">תרחיש פעיל</div>
            <h1>{scenario.name}</h1>
          </div>
          <div className="topbar-actions">
            <span className="sync-status">חצות: {syncStatus}</span>
            <button type="button" onClick={pullFromHatzot}>משוך שכבות</button>
            <button type="button" onClick={pushToHatzot}>שלח שכבות</button>
            <button type="button" onClick={() => { setTime(0); setPlaying(false); }}>הרצה מחדש</button>
            <button type="button" className="primary" onClick={runScore}>חשב ציון</button>
          </div>
        </header>

        <section className="workspace">
          <SimulatorMap suggestedDeployment={suggestedDeployment} />
          <LayersPanel />
          <InventoryDashboard />
          <div className="safety-banner">דמו סינתטי לפיתוח UI בלבד · אלגוריתמי Data מחוברים דרך Adapter נפרד</div>
        </section>

        <Timeline />
        <AnalysisPanel score={score} />
      </main>
    </div>
  );
}
