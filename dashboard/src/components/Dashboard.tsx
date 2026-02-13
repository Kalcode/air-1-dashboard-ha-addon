import type { Component } from 'solid-js';
import { For, Show, createSignal, onMount } from 'solid-js';
import { ParticleBreakdown, StatusPanel, WHOBars } from './AnalysisComponents';
import { GaugeBar, VocQualityBadge } from './GaugeComponents';
import HADataSource from './HADataSource';
import { HistoryCard } from './HistoryCard';
import { clearAllStorage, deleteReading, exportHistory, importHistory, loadHistory, saveReading } from './storage';
import {
  MANUAL_FIELDS,
  cToF,
  cardStyle,
  emptyData,
  formatUptime,
  getRssiInfo,
  inputStyle,
  labelStyle,
  mono,
  timeAgo,
} from './thresholds';
import type { Reading, SensorData } from './types';

const Dashboard: Component = () => {
  const [data, setData] = createSignal<SensorData>({ ...emptyData });
  const [history, setHistory] = createSignal<Reading[]>([]);
  const [compareId, setCompareId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal('');
  const [showManual, setShowManual] = createSignal(false);
  const [ts, setTs] = createSignal<string | null>(null);
  const [room, setRoom] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [viewingId, setViewingId] = createSignal<string | null>(null);
  const [snapshotName, setSnapshotName] = createSignal('');

  // Derived signals
  const hasData = () => data().pm25 || data().co2 || data().humidity;
  const compareReading = () => {
    const cid = compareId();
    return cid ? (history().find((h) => h.id === cid) ?? null) : null;
  };
  const compData = () => compareReading()?.data ?? null;

  onMount(async () => {
    const hist = await loadHistory();
    setHistory(hist);
    if (hist.length > 0) {
      const latest = hist[hist.length - 1];
      if (latest) {
        setData({ ...emptyData, ...latest.data });
        setRoom(latest.room || '');
        setTs(latest.time);
        setViewingId(latest.id);
        if (hist.length > 1) {
          const prev = hist[hist.length - 2];
          if (prev) setCompareId(prev.id);
        }
        setStatus(`✓ Loaded latest: ${latest.date} ${latest.time}${latest.room ? ` (${latest.room})` : ''}`);
      }
    }
    setLoading(false);
  });

  const handleDataUpdate = (data: Partial<SensorData>, room: string) => {
    const mergedData = { ...emptyData, ...data };
    setData(mergedData);
    setTs(new Date().toLocaleTimeString());
    setRoom(room);
    setViewingId(null); // Clear viewing state - showing live data now
    setStatus('✓ Auto-updated from Home Assistant');
    // Don't auto-save to history - user will manually snapshot when needed
  };

  const handleError = (error: string) => {
    setStatus(`✕ ${error}`);
  };

  const handleView = (entry: Reading) => {
    setData({ ...emptyData, ...entry.data });
    setRoom(entry.room || '');
    setTs(entry.time);
    setViewingId(entry.id);
    const idx = history().findIndex((h) => h.id === entry.id);
    if (idx > 0) {
      const prev = history()[idx - 1];
      if (prev) setCompareId(prev.id);
    } else {
      setCompareId(null);
    }
    setStatus(`✓ Viewing: ${entry.date} ${entry.time}${entry.room ? ` (${entry.room})` : ''}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const hist = await deleteReading(id);
      setHistory(hist);
      if (id === viewingId() && hist.length > 0) {
        const latest = hist[hist.length - 1];
        if (latest) {
          setData({ ...emptyData, ...latest.data });
          setViewingId(latest.id);
          setTs(latest.time);
          setRoom(latest.room || '');
        }
      } else if (hist.length === 0) {
        setData({ ...emptyData });
        setViewingId(null);
        setTs(null);
      }
      if (id === compareId()) setCompareId(null);
    } catch (e) {
      setStatus(`✕ ${e instanceof Error ? e.message : 'Delete failed'}`);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllStorage();
      setData({ ...emptyData });
      setHistory([]);
      setTs(null);
      setRoom('');
      setStatus('Cleared all data.');
      setCompareId(null);
      setViewingId(null);
    } catch (e) {
      setStatus(`✕ ${e instanceof Error ? e.message : 'Clear failed'}`);
    }
  };

  const handleExport = async () => {
    try {
      await exportHistory();
      setStatus(`✓ Exported ${history().length} readings`);
    } catch (e) {
      setStatus(`✕ ${e instanceof Error ? e.message : 'Export failed'}`);
    }
  };

  let fileInput!: HTMLInputElement;

  const handleImport = async (file: File) => {
    try {
      const hist = await importHistory(file);
      setHistory(hist);
      if (hist.length > 0) {
        const latest = hist[hist.length - 1];
        if (latest) {
          setData({ ...emptyData, ...latest.data });
          setRoom(latest.room || '');
          setTs(latest.time);
          setViewingId(latest.id);
          if (hist.length > 1) {
            const prev = hist[hist.length - 2];
            if (prev) setCompareId(prev.id);
          }
        }
      }
      setStatus(`✓ Imported! ${hist.length} total readings`);
    } catch (e) {
      setStatus(`✕ ${e instanceof Error ? e.message : 'Import failed'}`);
    }
  };

  const handleTakeSnapshot = async () => {
    if (!hasData()) {
      setStatus('✕ No sensor data available to snapshot');
      return;
    }
    try {
      const name = snapshotName().trim() || room() || 'Snapshot';
      const hist = await saveReading(data(), name);
      const newSnapshot = hist[hist.length - 1];
      if (newSnapshot) {
        setHistory(hist);
        setViewingId(newSnapshot.id);
        if (hist.length > 1) {
          const prev = hist[hist.length - 2];
          if (prev) setCompareId(prev.id);
        }
        setStatus(`✓ Snapshot saved: ${name}`);
        setSnapshotName(''); // Clear input after saving
      }
    } catch (e) {
      setStatus(`✕ ${e instanceof Error ? e.message : 'Save failed'}`);
    }
  };

  return (
    <Show
      when={!loading()}
      fallback={
        <div
          style={{
            'min-height': '100vh',
            background: '#020617',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
          }}
        >
          <div style={{ color: '#475569', ...mono, 'font-size': '13px' }}>Loading...</div>
        </div>
      }
    >
      <div
        style={{
          'min-height': '100vh',
          background: '#020617',
          color: '#e2e8f0',
          padding: '20px 16px 40px',
          'max-width': '480px',
          margin: '0 auto',
          'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ 'text-align': 'center', 'margin-bottom': '20px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              'border-radius': '20px',
              'font-size': '10px',
              color: '#64748b',
              ...mono,
              'letter-spacing': '0.15em',
              'text-transform': 'uppercase',
              'margin-bottom': '8px',
            }}
          >
            Apollo AIR-1
          </div>
          <h1
            style={{
              'font-size': '24px',
              'font-weight': '700',
              margin: '0',
              color: '#f1f5f9',
            }}
          >
            Air Quality Dashboard
          </h1>
          <div
            style={{
              display: 'flex',
              'justify-content': 'center',
              gap: '6px',
              'margin-top': '8px',
              'flex-wrap': 'wrap',
            }}
          >
            <Show when={ts()}>
              <span
                style={{
                  'font-size': '10px',
                  color: '#475569',
                  ...mono,
                  background: '#0f172a',
                  padding: '2px 8px',
                  'border-radius': '4px',
                }}
              >
                {ts()}
              </span>
            </Show>
            <Show when={data().uptime}>
              <span
                style={{
                  'font-size': '10px',
                  color: '#475569',
                  ...mono,
                  background: '#0f172a',
                  padding: '2px 8px',
                  'border-radius': '4px',
                }}
              >
                ↑{formatUptime(data().uptime)}
              </span>
            </Show>
            <Show when={data().rssi && getRssiInfo(data().rssi)}>
              {(() => {
                const info = () => getRssiInfo(data().rssi)!;
                return (
                  <span
                    style={{
                      'font-size': '10px',
                      color: info().color,
                      ...mono,
                      background: '#0f172a',
                      padding: '2px 8px',
                      'border-radius': '4px',
                      display: 'inline-flex',
                      'align-items': 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        'align-items': 'flex-end',
                        gap: '1px',
                        height: '12px',
                      }}
                    >
                      {[4, 7, 10, 12].map((h, i) => (
                        <span
                          style={{
                            width: '3px',
                            height: `${h}px`,
                            'border-radius': '1px',
                            background: i < info().bars ? info().color : '#334155',
                          }}
                        />
                      ))}
                    </span>
                    {info().label}
                  </span>
                );
              })()}
            </Show>
            <Show when={room()}>
              <span
                style={{
                  'font-size': '10px',
                  color: '#94a3b8',
                  ...mono,
                  background: '#1e293b',
                  padding: '2px 8px',
                  'border-radius': '4px',
                }}
              >
                📍 {room()}
              </span>
            </Show>
          </div>
        </div>

        {/* Home Assistant Data Source */}
        <div style={{ ...cardStyle, padding: '14px', 'margin-bottom': '12px' }}>
          <HADataSource onDataUpdate={handleDataUpdate} onError={handleError} />
          <Show when={status()}>
            <div
              style={{
                'margin-top': '8px',
                'font-size': '11px',
                ...mono,
                color: status().startsWith('✓') ? '#22c55e' : status().startsWith('✕') ? '#ef4444' : '#94a3b8',
              }}
            >
              {status()}
            </div>
          </Show>
        </div>

        {/* Take Snapshot */}
        <div style={{ ...cardStyle, padding: '14px', 'margin-bottom': '12px' }}>
          <div style={{ 'margin-bottom': '8px' }}>
            <span style={labelStyle}>Take Snapshot</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Snapshot name (optional)"
              value={snapshotName()}
              onInput={(e) => setSnapshotName(e.currentTarget.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleTakeSnapshot}
              disabled={!hasData()}
              style={{
                padding: '8px 16px',
                background: hasData() ? '#3b82f6' : '#1e293b',
                border: '1px solid',
                'border-color': hasData() ? '#2563eb' : '#334155',
                'border-radius': '6px',
                color: hasData() ? '#f1f5f9' : '#475569',
                'font-size': '12px',
                ...mono,
                cursor: hasData() ? 'pointer' : 'not-allowed',
                'white-space': 'nowrap',
              }}
            >
              Save
            </button>
          </div>
          <div
            style={{
              'margin-top': '6px',
              'font-size': '10px',
              color: '#64748b',
              ...mono,
            }}
          >
            Capture current sensor readings with a custom name
          </div>
        </div>

        {/* Manual Entry */}
        <Show when={showManual()}>
          <div style={{ ...cardStyle, padding: '14px', 'margin-bottom': '12px' }}>
            <div
              style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                'margin-bottom': '8px',
              }}
            >
              <span style={labelStyle}>Manual Entry (Backup)</span>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  'font-size': '14px',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                'grid-template-columns': '1fr 1fr',
                gap: '8px',
              }}
            >
              <For each={MANUAL_FIELDS}>
                {([key, label]) => (
                  <label style={{ display: 'block' }}>
                    <span
                      style={{
                        display: 'block',
                        'font-size': '10px',
                        color: '#64748b',
                        ...mono,
                        'margin-bottom': '3px',
                      }}
                    >
                      {label}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={data()[key]}
                      onInput={(e) => {
                        setData((p) => ({
                          ...p,
                          [key]: e.currentTarget.value,
                        }));
                        if (!ts()) setTs(new Date().toLocaleTimeString());
                      }}
                      style={inputStyle}
                    />
                  </label>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Manual Entry Toggle */}
        <Show when={!showManual()}>
          <button
            type="button"
            onClick={() => setShowManual(true)}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1e293b',
              border: '1px solid #334155',
              'border-radius': '6px',
              color: '#94a3b8',
              'font-size': '12px',
              ...mono,
              cursor: 'pointer',
              'margin-bottom': '12px',
            }}
          >
            Manual Entry (Backup)
          </button>
        </Show>

        {/* Compare Indicator */}
        <Show when={compareReading() && hasData()}>
          <div
            style={{
              background: '#0c1629',
              border: '1px solid #1e3a5f',
              'border-radius': '8px',
              padding: '10px',
              'margin-bottom': '4px',
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
            }}
          >
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <span
                style={{
                  'font-size': '10px',
                  color: '#38bdf8',
                  ...mono,
                  'text-transform': 'uppercase',
                  'letter-spacing': '0.08em',
                }}
              >
                Comparing vs
              </span>
              <span style={{ 'font-size': '11px', color: '#94a3b8', ...mono }}>
                {compareReading()?.room || compareReading()?.date} · {compareReading()?.time}
              </span>
              <span style={{ 'font-size': '9px', color: '#475569', ...mono }}>
                {compareReading()?.timestamp ? timeAgo(compareReading()!.timestamp) : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCompareId(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#475569',
                'font-size': '14px',
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          </div>
        </Show>

        {/* Dashboard */}
        <Show when={hasData()}>
          <StatusPanel data={data()} />
          <div
            style={{
              ...cardStyle,
              'margin-top': '12px',
              display: 'flex',
              'flex-direction': 'column',
              gap: '16px',
            }}
          >
            <Show when={data().pm25}>
              <GaugeBar
                value={data().pm25}
                thresholdKey="pm25"
                label="PM2.5"
                unit="µg/m³"
                prevValue={compData()?.pm25}
              />
            </Show>
            <Show when={data().pm10}>
              <GaugeBar
                value={data().pm10}
                thresholdKey="pm10"
                label="PM10"
                unit="µg/m³"
                prevValue={compData()?.pm10}
              />
            </Show>
            <Show when={data().co2}>
              <GaugeBar value={data().co2} thresholdKey="co2" label="CO₂" unit="ppm" prevValue={compData()?.co2} />
            </Show>
            <Show when={data().voc}>
              <GaugeBar value={data().voc} thresholdKey="voc" label="VOC" unit="index" prevValue={compData()?.voc} />
            </Show>
            <VocQualityBadge quality={data().vocQuality} />
            <Show when={data().humidity}>
              <GaugeBar
                value={data().humidity}
                thresholdKey="humidity"
                label="Humidity"
                unit="%"
                prevValue={compData()?.humidity}
              />
            </Show>
            <Show when={data().temperature}>
              <GaugeBar
                value={data().temperature}
                thresholdKey="temperature"
                label="Temperature"
                unit={`°C (${cToF(data().temperature)}°F)`}
                prevValue={compData()?.temperature}
              />
            </Show>
          </div>
          <Show when={data().pm_1um && data().pm25 && data().pm10}>
            <ParticleBreakdown data={data()} />
          </Show>
          <WHOBars data={data()} />
          <Show when={data().pressure || data().nox}>
            <div
              style={{
                'margin-top': '12px',
                display: 'flex',
                'flex-wrap': 'wrap',
                gap: '8px',
              }}
            >
              <Show when={data().pressure}>
                <div
                  style={{
                    ...cardStyle,
                    padding: '8px 12px',
                    'font-size': '11px',
                    ...mono,
                  }}
                >
                  <span style={{ color: '#64748b' }}>Pressure </span>
                  <span style={{ color: '#94a3b8' }}>{data().pressure} hPa</span>
                </div>
              </Show>
              <Show when={data().nox}>
                <div
                  style={{
                    ...cardStyle,
                    padding: '8px 12px',
                    'font-size': '11px',
                    ...mono,
                  }}
                >
                  <span style={{ color: '#64748b' }}>NOx </span>
                  <span style={{ color: '#94a3b8' }}>{data().nox}</span>
                </div>
              </Show>
            </div>
          </Show>
        </Show>

        {/* Empty State */}
        <Show when={!hasData() && history().length === 0}>
          <div
            style={{
              'text-align': 'center',
              padding: '50px 20px',
              color: '#334155',
            }}
          >
            <div
              style={{
                'font-size': '48px',
                'margin-bottom': '16px',
                opacity: '0.4',
              }}
            >
              ◉
            </div>
            <div
              style={{
                ...mono,
                'font-size': '13px',
                color: '#475569',
                'line-height': '1.8',
              }}
            >
              Waiting for sensor data
              <br />
              from Home Assistant
            </div>
          </div>
        </Show>

        {/* Hidden file input for import */}
        <input
          ref={fileInput}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) handleImport(file);
            e.currentTarget.value = '';
          }}
        />

        {/* History */}
        <div style={{ 'margin-top': '20px' }}>
          <div
            style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              'margin-bottom': '8px',
            }}
          >
            <span style={labelStyle}>History ({history().length})</span>
            <div style={{ display: 'flex', gap: '6px', 'align-items': 'center' }}>
              <button
                type="button"
                onClick={() => fileInput.click()}
                style={{
                  background: 'none',
                  border: '1px solid #1e293b',
                  'border-radius': '4px',
                  color: '#94a3b8',
                  'font-size': '10px',
                  ...mono,
                  padding: '3px 8px',
                  cursor: 'pointer',
                }}
              >
                Import
              </button>
              <Show when={history().length > 0}>
                <button
                  type="button"
                  onClick={handleExport}
                  style={{
                    background: 'none',
                    border: '1px solid #1e293b',
                    'border-radius': '4px',
                    color: '#94a3b8',
                    'font-size': '10px',
                    ...mono,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Export
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: '1px solid #331111',
                    'border-radius': '4px',
                    color: '#7f1d1d',
                    'font-size': '10px',
                    ...mono,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Clear All
                </button>
              </Show>
            </div>
          </div>
          <Show when={history().length > 0}>
            <div
              style={{
                display: 'flex',
                'flex-direction': 'column',
                gap: '4px',
              }}
            >
              <For each={[...history()].reverse()}>
                {(entry) => (
                  <HistoryCard
                    entry={entry}
                    isViewing={entry.id === viewingId()}
                    isComparing={entry.id === compareId()}
                    onView={() => handleView(entry)}
                    onCompare={() => setCompareId(entry.id)}
                    onClearCompare={() => setCompareId(null)}
                    onDelete={() => handleDelete(entry.id)}
                    readOnly={false}
                  />
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default Dashboard;
