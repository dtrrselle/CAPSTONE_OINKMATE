import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Image,
  Animated,
  LayoutAnimation,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// How often to silently re-poll the API for fresh sensor readings.
const POLL_INTERVAL_MS = 8000;

// ─── API Config ──────────────────────────────────────────────────────────────
// Same host used by signin.tsx / signup.tsx (farmer_login.php / farmer_register.php).
const API_BASE_URL = 'https://oinkmate.online/oinkmate-api/api';
const ENVIRONMENT_ENDPOINT = `${API_BASE_URL}/iot/environment/get_latest_environment.php`;
// Existing history endpoint (same API group as the live-reading endpoint above).
const HISTORY_ENDPOINT = `${API_BASE_URL}/iot/environment/get_environment._history.php`;

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusLabel = 'Low' | 'Normal' | 'High' | 'Safe' | 'Warning' | 'Critical' | 'No Data' | string;
type Severity = 'ok' | 'warn' | 'critical' | 'none';

interface FeedContainer {
  name: string;
  percentage: number | null;
}

interface PigPen {
  pen_id: number;
  pen_name: string;
  device_code: string | null;
  temperature: number | null;
  temperature_status: StatusLabel;
  humidity: number | null;
  humidity_status: StatusLabel;
  ammonia: number | null;
  ammonia_status: StatusLabel;
  feed_level_1: number | null;
  feed_level_2: number | null;
  feed_level_3: number | null;
  overall_level: number | null;
  last_updated: string | null;
}

interface MetricDef {
  id: 'temperature' | 'humidity' | 'ammonia';
  label: string;
  unit: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}

// ─── Static Metric Config (visuals only — values now come from the API) ──────

const METRIC_DEFS: MetricDef[] = [
  {
    id: 'temperature',
    label: 'Temp',
    unit: '°C',
    iconName: 'thermometer-outline',
    iconBg: '#FFF0EE',
    iconColor: '#E05C3A',
  },
  {
    id: 'humidity',
    label: 'Humidity',
    unit: '%',
    iconName: 'water-outline',
    iconBg: '#EEF4FF',
    iconColor: '#4A80F0',
  },
  {
    id: 'ammonia',
    label: 'Ammonia',
    unit: '',
    iconName: 'cloud-outline',
    iconBg: '#F2F2F7',
    iconColor: '#8E8EA0',
  },
];

// Full-length sensor names used in the Environmental Trends section (the
// mini stat cards above keep the shorter METRIC_DEFS.label as-is).
const SENSOR_FULL_LABEL: Record<MetricDef['id'], string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  ammonia: 'Ammonia',
};

const SEVERITY_DOT: Record<Severity, string> = {
  ok: '#2ECC71',
  warn: '#F39C12',
  critical: '#E74C3C',
  none: '#C7C9CC',
};

const SEVERITY_LABEL_COLOR: Record<Severity, string> = {
  ok: '#2E7D52',
  warn: '#E07B39',
  critical: '#C0392B',
  none: '#8E8EA0',
};

// Maps the exact status strings returned by get_latest_environment.php to a
// severity used for dot/text coloring. Temperature & humidity use Low/Normal/
// High; ammonia uses Safe/Warning/Critical (see the PHP for the thresholds).
function severityFromLabel(metricId: MetricDef['id'], label: StatusLabel): Severity {
  if (!label || label === 'No Data') return 'none';
  if (metricId === 'ammonia') {
    if (label === 'Safe') return 'ok';
    if (label === 'Warning') return 'warn';
    if (label === 'Critical') return 'critical';
    return 'none';
  }
  // temperature / humidity
  if (label === 'Normal') return 'ok';
  if (label === 'Low' || label === 'High') return 'warn';
  return 'none';
}

// ─── Status thresholds ────────────────────────────────────────────────────────
// NOTE: mirrors the ranges implied by the original mock data. Adjust to match
// whatever thresholds the backend considers Normal / Warning / Critical.

// ─── Feed severity ────────────────────────────────────────────────────────
// The API doesn't compute a status for feed levels, so it's derived here
// from overall_level. Adjust thresholds to match however "low feed" should
// be defined for your farm.

function computeFeedSeverity(value: number | null): Severity {
  if (value === null || value === undefined || isNaN(value)) return 'none';
  if (value <= 20) return 'critical';
  if (value <= 50) return 'warn';
  return 'ok';
}

// Hardware now reports only 2 feed containers. The main Feed value is the
// average of Container 1 and Container 2 only - never feed_level_3, and
// never the backend's overall_level (which may still be computed from 3
// readings until the API is updated). Returns null (not NaN) whenever
// either container reading is unavailable, so the existing "No Data"
// handling takes over.
function computeAverageFeedLevel(
  feedLevel1: number | null,
  feedLevel2: number | null
): number | null {
  if (feedLevel1 === null || feedLevel2 === null) return null;
  return (feedLevel1 + feedLevel2) / 2;
}

const FEED_VALUE_COLOR = (s: Severity) =>
  s === 'critical' ? '#C0392B' : s === 'warn' ? '#E07B39' : s === 'none' ? '#8E8EA0' : '#2E7D52';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function normalizePen(raw: any): PigPen {
  return {
    pen_id: numOrNull(raw?.pen_id) ?? 0,
    pen_name: raw?.pen_name ?? 'Unnamed Pen',
    device_code: raw?.device_code ?? null,
    temperature: numOrNull(raw?.temperature),
    temperature_status: raw?.temperature_status ?? 'No Data',
    humidity: numOrNull(raw?.humidity),
    humidity_status: raw?.humidity_status ?? 'No Data',
    ammonia: numOrNull(raw?.ammonia),
    ammonia_status: raw?.ammonia_status ?? 'No Data',
    feed_level_1: numOrNull(raw?.feed_level_1),
    feed_level_2: numOrNull(raw?.feed_level_2),
    feed_level_3: numOrNull(raw?.feed_level_3),
    overall_level: numOrNull(raw?.overall_level),
    last_updated: raw?.last_updated ?? null,
  };
}

// signin.tsx saves the whole logged-in user object as JSON under the "user"
// key (not a separate "farmer_id" key) — see: AsyncStorage.setItem("user", ...).
// Pull the farmer id back out of it here, checking the field names most
// likely to be used by farmer_login.php.
async function getStoredFarmerId(): Promise<string | null> {
  const raw = await AsyncStorage.getItem('user');
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    const id = user?.farmer_id ?? user?.id ?? user?.farmerId ?? user?.user_id;
    return id !== undefined && id !== null ? String(id) : null;
  } catch {
    return null;
  }
}

async function fetchPigPens(farmerId: string): Promise<PigPen[]> {
  const url = `${ENVIRONMENT_ENDPOINT}?farmer_id=${encodeURIComponent(farmerId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      // Without this, ngrok's free-tier domains return an HTML interstitial
      // page instead of the actual API response for non-browser requests.
      'ngrok-skip-browser-warning': 'true',
    },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${bodyText.slice(0, 200)}`);
  }

  let json: any;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new Error(`Server did not return valid JSON: ${bodyText.slice(0, 200)}`);
  }

  if (json?.success === false) {
    throw new Error(json?.message || 'Server reported an error.');
  }

  const rawPens = Array.isArray(json?.data) ? json.data : [];
  return rawPens.map(normalizePen);
}

// ─── History / Environmental Trends Helpers ───────────────────────────────────
// The history section is independent from the live-polling pen cards above:
// it fetches raw readings for one selected pen from the existing
// get_environment._history.php endpoint, then groups/averages them on the
// client into a small number of chart-friendly points.

type RangeOption = '24h' | '7d' | '30d';

const RANGE_OPTIONS: { value: RangeOption; label: string }[] = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
];

const RANGE_LABELS: Record<RangeOption, string> = {
  '24h': 'Last 24 Hours',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
};

const RANGE_MS: Record<RangeOption, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Grouping interval per range, so the chart stays readable no matter how
// many raw readings come back: hourly for 24h, 6-hour buckets for 7d, and
// daily for 30d, as requested.
const BUCKET_MS: Record<RangeOption, number> = {
  '24h': 60 * 60 * 1000,
  '7d': 6 * 60 * 60 * 1000,
  '30d': 24 * 60 * 60 * 1000,
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface HistoryRecord {
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  recorded_at: string | null;
}

interface TrendPoint {
  value: number;
  label: string;
}

// MySQL DATETIME strings ("YYYY-MM-DD HH:MM:SS") aren't reliably parsed by
// `new Date()` on every JS engine unless converted to an ISO-ish string first.
function parseRecordedAt(value: string | null): number | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}

function formatBucketLabel(timestampMs: number, range: RangeOption): string {
  const d = new Date(timestampMs);
  if (range === '24h') {
    let hours = d.getHours();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}${suffix}`;
  }
  if (range === '7d') {
    return WEEKDAY_LABELS[d.getDay()];
  }
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`;
}

// Groups raw sensor readings into fixed-size time buckets and averages each
// bucket. Buckets with zero readings are skipped entirely rather than
// fabricated as zero/interpolated values, per requirements.
function buildTrendPoints(
  records: HistoryRecord[],
  range: RangeOption,
  sensor: MetricDef['id']
): TrendPoint[] {
  if (!records.length) return [];

  const now = Date.now();
  const rangeMs = RANGE_MS[range];
  const bucketMs = BUCKET_MS[range];
  const cutoff = now - rangeMs;
  const numBuckets = Math.round(rangeMs / bucketMs);

  const sums = new Array(numBuckets).fill(0);
  const counts = new Array(numBuckets).fill(0);

  records.forEach((r) => {
    const t = parseRecordedAt(r.recorded_at);
    if (t === null || t < cutoff || t > now) return;

    const value = r[sensor];
    if (value === null || value === undefined || isNaN(value)) return;

    let idx = Math.floor((t - cutoff) / bucketMs);
    if (idx < 0) idx = 0;
    if (idx > numBuckets - 1) idx = numBuckets - 1;

    sums[idx] += value;
    counts[idx] += 1;
  });

  const points: TrendPoint[] = [];
  for (let i = 0; i < numBuckets; i++) {
    if (counts[i] === 0) continue;
    const bucketEnd = cutoff + (i + 1) * bucketMs;
    points.push({
      value: sums[i] / counts[i],
      label: formatBucketLabel(bucketEnd, range),
    });
  }
  return points;
}

async function fetchPenHistory(penId: number): Promise<HistoryRecord[]> {
  const url = `${HISTORY_ENDPOINT}?pen_id=${encodeURIComponent(String(penId))}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${bodyText.slice(0, 200)}`);
  }

  let json: any;
  try {
    json = JSON.parse(bodyText);
  } catch {
    throw new Error(`Server did not return valid JSON: ${bodyText.slice(0, 200)}`);
  }

  if (json?.success === false) {
    throw new Error(json?.message || 'Server reported an error.');
  }

  const rawRows = Array.isArray(json?.data) ? json.data : [];
  return rawRows.map((row: any) => ({
    temperature: numOrNull(row?.temperature),
    humidity: numOrNull(row?.humidity),
    ammonia: numOrNull(row?.ammonia),
    recorded_at: row?.recorded_at ?? null,
  }));
}

// ─── Mini Stat Card (Temperature / Humidity / Ammonia) ────────────────────────

function MiniStatCard({
  metric,
  value,
  status,
  cardWidth,
}: {
  metric: MetricDef;
  value: number | null;
  status: StatusLabel;
  cardWidth: number;
}) {
  const severity = severityFromLabel(metric.id, status);
  const hasData = value !== null;
  const valColor = severity === 'critical' ? '#C0392B' : severity === 'warn' ? '#E07B39' : '#1A2B22';

  return (
    <View style={[card.wrap, { width: cardWidth }]}>
      <View style={[card.iconCircle, { backgroundColor: metric.iconBg }]}>
        <Ionicons name={metric.iconName} size={18} color={metric.iconColor} />
      </View>

      {hasData ? (
        <Text style={[card.value, { color: valColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
          <Text style={card.unit}>{metric.unit}</Text>
        </Text>
      ) : (
        <Text style={card.noData} numberOfLines={1} adjustsFontSizeToFit>
          No Data
        </Text>
      )}

      <Text style={card.label} numberOfLines={1}>{metric.label}</Text>

      {hasData && (
        <View style={card.statusRow}>
          <View style={[card.dot, { backgroundColor: SEVERITY_DOT[severity] }]} />
          <Text style={[card.statusText, { color: SEVERITY_LABEL_COLOR[severity] }]} numberOfLines={1} adjustsFontSizeToFit>
            {status}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Feed Mini Card (collapsed state shown inside the grid) ──────────────────

function FeedMiniCard({
  overallLevel,
  cardWidth,
  expanded,
  onToggle,
  rotateAnim,
}: {
  overallLevel: number | null;
  cardWidth: number;
  expanded: boolean;
  onToggle: () => void;
  rotateAnim: Animated.Value;
}) {
  const hasData = overallLevel !== null;
  const severity = computeFeedSeverity(overallLevel);
  const valColor = FEED_VALUE_COLOR(severity);
  const barColor =
    severity === 'critical' ? '#E74C3C' : severity === 'warn' ? '#F39C12' : '#2ECC71';
  const severityLabel = severity === 'critical' ? 'Critical' : severity === 'warn' ? 'Warning' : 'Normal';

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onToggle}
      style={[card.wrap, { width: cardWidth }]}
    >
      <View style={[card.iconCircle, { backgroundColor: '#FFF8EE' }]}>
        <Ionicons name="nutrition-outline" size={18} color="#F0A500" />
      </View>

      {hasData ? (
        <Text style={[card.value, { color: valColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {overallLevel.toFixed(2)}
          <Text style={card.unit}>%</Text>
        </Text>
      ) : (
        <Text style={card.noData} numberOfLines={1} adjustsFontSizeToFit>
          No Data
        </Text>
      )}

      {hasData && (
        <View style={card.barTrack}>
          <View
            style={[
              card.barFill,
              {
                width: `${Math.min(100, Math.max(0, overallLevel))}%` as any,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      )}

      <Text style={card.label} numberOfLines={1}>Feed</Text>

      <View style={card.statusRow}>
        {hasData ? (
          <>
            <View style={[card.dot, { backgroundColor: SEVERITY_DOT[severity] }]} />
            <Text style={[card.statusText, { color: SEVERITY_LABEL_COLOR[severity] }]} numberOfLines={1} adjustsFontSizeToFit>
              {severityLabel}
            </Text>
          </>
        ) : null}
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }], marginLeft: hasData ? 3 : 0 }}>
          <Ionicons name="chevron-down" size={11} color="#8E8EA0" />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Feed Container Row (used inside the expanded accordion) ─────────────────

function FeedContainerRow({ container }: { container: FeedContainer }) {
  const hasData = container.percentage !== null;
  return (
    <View style={feedPanel.row}>
      <View style={feedPanel.rowHeader}>
        <Text style={feedPanel.containerName}>{container.name}</Text>
        <Text style={hasData ? feedPanel.containerPct : feedPanel.containerNoData}>
          {hasData
            ? `${Math.min(100, Math.max(0, container.percentage as number)).toFixed(2)}%`
            : 'No Data'}
        </Text>
      </View>
      {hasData && (
        <View style={feedPanel.barTrack}>
          <View
            style={[
              feedPanel.barFill,
              {
                width: `${Math.min(100, Math.max(0, container.percentage as number))}%` as any,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

// ─── Pen Section ─────────────────────────────────────────────────────────────

function PenSection({ pen }: { pen: PigPen }) {
  const { width } = useWindowDimensions();
  // 16px padding each side = 32 total, 3 gaps of 8px = 24, divide by 4 cards
  const SIDE_PADDING = 16;
  const GAP = 8;
  const NUM_CARDS = 4;
  const cardWidth = (width - SIDE_PADDING * 2 - GAP * (NUM_CARDS - 1)) / NUM_CARDS;

  const [feedExpanded, setFeedExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const containers: FeedContainer[] = [
    { name: 'Container 1', percentage: pen.feed_level_1 },
    { name: 'Container 2', percentage: pen.feed_level_2 },
  ];

  const rawAverageFeedLevel = computeAverageFeedLevel(pen.feed_level_1, pen.feed_level_2);
  const averageFeedLevel =
    rawAverageFeedLevel === null
      ? null
      : Math.min(100, Math.max(0, rawAverageFeedLevel));

  const valuesAndStatus: Record<MetricDef['id'], { value: number | null; status: StatusLabel }> = {
    temperature: { value: pen.temperature, status: pen.temperature_status },
    humidity: { value: pen.humidity, status: pen.humidity_status },
    ammonia: { value: pen.ammonia, status: pen.ammonia_status },
  };

  function toggleFeed() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: feedExpanded ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setFeedExpanded((e) => !e);
  }

  return (
    <View style={styles.penSection}>
      <View style={styles.penLabelRow}>
        <View style={styles.penPill}>
          <Text style={styles.penPillText}>{pen.pen_name}</Text>
        </View>
        <View style={styles.penLine} />
      </View>

      <View style={styles.cardGrid}>
        {METRIC_DEFS.map((metric) => (
          <MiniStatCard
            key={metric.id}
            metric={metric}
            value={valuesAndStatus[metric.id].value}
            status={valuesAndStatus[metric.id].status}
            cardWidth={cardWidth}
          />
        ))}
        <FeedMiniCard
          overallLevel={averageFeedLevel}
          cardWidth={cardWidth}
          expanded={feedExpanded}
          onToggle={toggleFeed}
          rotateAnim={rotateAnim}
        />
      </View>

      {feedExpanded && (
        <View style={feedPanel.wrap}>
          <Text style={feedPanel.title}>Feed Containers</Text>
          {containers.map((c, idx) => (
            <FeedContainerRow key={idx} container={c} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Trend Chart (dependency-free — plain Views, no chart/SVG library) ───────
// Draws a simple line chart by rotating thin absolutely-positioned Views
// between consecutive points. Kept intentionally lightweight since no chart
// library was already present in the project.

function TrendChart({ points, color }: { points: TrendPoint[]; color: string }) {
  const [chartWidth, setChartWidth] = useState(0);
  const CHART_HEIGHT = 140;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // Flat / single-value series — pad so the line doesn't collapse to 0 height.
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.12;
    min -= pad;
    max += pad;
  }

  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n > 1 ? (i / (n - 1)) * chartWidth : chartWidth / 2;
    const y = CHART_HEIGHT - ((p.value - min) / (max - min)) * CHART_HEIGHT;
    return { x, y };
  });

  const maxLabels = Math.min(4, n);
  const labelIndices = new Set<number>();
  if (n === 1) {
    labelIndices.add(0);
  } else {
    for (let i = 0; i < maxLabels; i++) {
      labelIndices.add(Math.round((i / (maxLabels - 1)) * (n - 1)));
    }
  }

  return (
    <View>
      <View
        style={trend.plotArea}
        onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      >
        {chartWidth > 0 && (
          <>
            {[0, 0.5, 1].map((frac) => (
              <View
                key={frac}
                style={[trend.gridline, { top: CHART_HEIGHT * frac }]}
              />
            ))}

            {coords.slice(0, -1).map((c, i) => {
              const next = coords[i + 1];
              const dx = next.x - c.x;
              const dy = next.y - c.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx);
              const midX = (c.x + next.x) / 2;
              const midY = (c.y + next.y) / 2;
              return (
                <View
                  key={i}
                  style={[
                    trend.chartLine,
                    {
                      left: midX - dist / 2,
                      top: midY - 1,
                      width: dist,
                      backgroundColor: color,
                      transform: [{ rotate: `${angle}rad` }],
                    },
                  ]}
                />
              );
            })}

            {coords.map((c, i) => (
              <View
                key={i}
                style={[
                  trend.chartDot,
                  { left: c.x - 3, top: c.y - 3, backgroundColor: color },
                ]}
              />
            ))}
          </>
        )}
      </View>

      {chartWidth > 0 && (
        <View style={trend.axisRow}>
          {points.map((p, i) =>
            labelIndices.has(i) ? (
              <Text
                key={i}
                style={[trend.axisLabel, { left: coords[i].x - 18, width: 36 }]}
                numberOfLines={1}
              >
                {p.label}
              </Text>
            ) : null
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function Environment() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pens, setPens] = useState<PigPen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>('All Pens');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── Environmental Trends state (independent of the live-polling state above) ──
  const [historyPenId, setHistoryPenId] = useState<number | null>(null);
  const [historyRange, setHistoryRange] = useState<RangeOption>('7d');
  const [historySensor, setHistorySensor] = useState<MetricDef['id']>('temperature');
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyDropdown, setHistoryDropdown] = useState<'pen' | 'range' | 'sensor' | null>(null);

  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false); // true once we've successfully loaded at least once

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPens = useCallback(async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    try {
      if (!silent) setLoading(true);
      setError(null);

      const farmerId = await getStoredFarmerId();
      if (!farmerId) {
        if (isMountedRef.current) {
          setError('No logged-in farmer found.');
          setLoading(false);
        }
        return;
      }

      const data = await fetchPigPens(farmerId);
      if (isMountedRef.current) {
        setPens(data);
        setLoading(false);
        hasLoadedRef.current = true;
      }
    } catch (e: any) {
      console.error('Environment fetch failed:', e);
      if (isMountedRef.current) {
        // Once we've shown real data at least once, don't blow it away with
        // an error state over one flaky poll — just try again next cycle.
        if (!hasLoadedRef.current) {
          setError(e?.message ? `Unable to load environment data: ${e.message}` : 'Unable to load environment data.');
        }
        setLoading(false);
      }
    }
  }, []);

  // Refetches the moment this screen gains focus, then silently re-polls
  // every POLL_INTERVAL_MS for as long as it stays focused — this is what
  // keeps sensor readings updating live without needing to navigate away
  // and back to force a refresh.
  useFocusEffect(
    useCallback(() => {
      loadPens({ silent: hasLoadedRef.current });

      const interval = setInterval(() => {
        loadPens({ silent: true });
      }, POLL_INTERVAL_MS);

      return () => clearInterval(interval);
    }, [loadPens])
  );

  const filterOptions = ['All Pens', ...pens.map((p) => p.pen_name)];
  const filteredPens = filter === 'All Pens' ? pens : pens.filter((p) => p.pen_name === filter);

  // Reset filter if the previously selected pen no longer exists in fresh data.
  useEffect(() => {
    if (filter !== 'All Pens' && !pens.some((p) => p.pen_name === filter)) {
      setFilter('All Pens');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pens]);

  // Default the Environmental Trends pen selector to the first available pen,
  // and re-validate it if the previously selected pen disappears from fresh data.
  useEffect(() => {
    if (pens.length === 0) {
      setHistoryPenId(null);
      return;
    }
    setHistoryPenId((prev) => {
      if (prev !== null && pens.some((p) => p.pen_id === prev)) return prev;
      return pens[0].pen_id;
    });
  }, [pens]);

  // Fetches raw history for the selected pen. Independent from the live
  // polling above — it only re-fetches when the selected pen changes, not
  // on every 8-second poll tick.
  useEffect(() => {
    if (historyPenId === null) {
      setHistoryRecords([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const records = await fetchPenHistory(historyPenId);
        if (!cancelled && isMountedRef.current) {
          setHistoryRecords(records);
          setHistoryLoading(false);
        }
      } catch (e: any) {
        console.error('Environment history fetch failed:', e);
        if (!cancelled && isMountedRef.current) {
          setHistoryError(
            e?.message ? `Unable to load history: ${e.message}` : 'Unable to load history.'
          );
          setHistoryRecords([]);
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyPenId]);

  // Grouping/averaging is cheap client-side work, so it's derived with
  // useMemo rather than re-fetched whenever only the range or sensor changes.
  const chartPoints = useMemo(
    () => buildTrendPoints(historyRecords, historyRange, historySensor),
    [historyRecords, historyRange, historySensor]
  );
  const latestPointValue = chartPoints.length > 0 ? chartPoints[chartPoints.length - 1].value : null;

  const selectedHistoryPen = pens.find((p) => p.pen_id === historyPenId) ?? null;
  const selectedHistoryPenLabel = selectedHistoryPen ? selectedHistoryPen.pen_name : 'Select Pen';
  const selectedSensorDef = METRIC_DEFS.find((m) => m.id === historySensor) ?? METRIC_DEFS[0];

  const allSeverities: Severity[] = [];
  pens.forEach((p) => {
    allSeverities.push(severityFromLabel('temperature', p.temperature_status));
    allSeverities.push(severityFromLabel('humidity', p.humidity_status));
    allSeverities.push(severityFromLabel('ammonia', p.ammonia_status));
    allSeverities.push(computeFeedSeverity(computeAverageFeedLevel(p.feed_level_1, p.feed_level_2)));
  });
  const criticals = allSeverities.filter((s) => s === 'critical').length;
  const warnings = allSeverities.filter((s) => s === 'warn').length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Back button — top left */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(tabs)/dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={GREEN} />
        </TouchableOpacity>

        {/* Logo + Title stacked center */}
        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Environment Monitoring</Text>
        </View>

        {/* Spacer to balance back button */}
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Alert Banner ── */}
      {(criticals > 0 || warnings > 0) && (
        <View style={[styles.alertBanner, { backgroundColor: criticals > 0 ? '#FDECEA' : '#FDF0E8' }]}>
          <Ionicons
            name={criticals > 0 ? 'alert-circle' : 'warning'}
            size={14}
            color={criticals > 0 ? '#C0392B' : '#E07B39'}
          />
          <Text style={[styles.alertText, { color: criticals > 0 ? '#C0392B' : '#E07B39' }]}>
            {criticals > 0
              ? `${criticals} critical alert${criticals > 1 ? 's' : ''} — check cards below`
              : `${warnings} warning${warnings > 1 ? 's' : ''} detected`}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Filter ── */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Showing</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{filter}</Text>
            <Ionicons name="chevron-down" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* ── Loading state ── */}
        {loading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={styles.centerStateText}>Loading environment data…</Text>
          </View>
        )}

        {/* ── Error state ── */}
        {!loading && error && (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={22} color="#C0392B" />
            <Text style={[styles.centerStateText, { color: '#C0392B' }]}>{error}</Text>
          </View>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && pens.length === 0 && (
          <View style={styles.centerState}>
            <Ionicons name="paw-outline" size={22} color="#8E8EA0" />
            <Text style={styles.centerStateText}>No Pig Pens found for this farmer.</Text>
          </View>
        )}

        {/* ── Per-pen sections ── */}
        {!loading && !error && filteredPens.map((pen) => (
          <PenSection key={pen.pen_id} pen={pen} />
        ))}

        {/* ── Environmental Trends ── */}
        {!loading && !error && pens.length > 0 && (
          <View style={trend.card}>
            <Text style={trend.sectionTitle}>Environmental Trends</Text>

            <View style={trend.filterRow}>
              <TouchableOpacity
                style={trend.filterChip}
                onPress={() => setHistoryDropdown('pen')}
                activeOpacity={0.8}
              >
                <Text style={trend.filterChipText} numberOfLines={1}>{selectedHistoryPenLabel}</Text>
                <Ionicons name="chevron-down" size={13} color={GREEN} />
              </TouchableOpacity>

              <TouchableOpacity
                style={trend.filterChip}
                onPress={() => setHistoryDropdown('range')}
                activeOpacity={0.8}
              >
                <Text style={trend.filterChipText} numberOfLines={1}>{RANGE_LABELS[historyRange]}</Text>
                <Ionicons name="chevron-down" size={13} color={GREEN} />
              </TouchableOpacity>
            </View>

            <View style={trend.filterRow}>
              <TouchableOpacity
                style={[trend.filterChip, trend.filterChipWide]}
                onPress={() => setHistoryDropdown('sensor')}
                activeOpacity={0.8}
              >
                <Ionicons name={selectedSensorDef.iconName} size={14} color={selectedSensorDef.iconColor} />
                <Text style={trend.filterChipText}>{SENSOR_FULL_LABEL[historySensor]}</Text>
                <Ionicons name="chevron-down" size={13} color={GREEN} />
              </TouchableOpacity>
            </View>

            <View style={trend.chartCard}>
              <View style={trend.chartHeaderRow}>
                <View>
                  <Text style={trend.chartTitle}>
                    {SENSOR_FULL_LABEL[historySensor]}
                    {selectedSensorDef.unit ? ` (${selectedSensorDef.unit})` : ''}
                  </Text>
                  <Text style={trend.chartSubtitle}>
                    {selectedHistoryPenLabel} · {RANGE_LABELS[historyRange]}
                  </Text>
                </View>
                {latestPointValue !== null && (
                  <Text style={[trend.latestValue, { color: selectedSensorDef.iconColor }]}>
                    {latestPointValue.toFixed(2)}{selectedSensorDef.unit}
                  </Text>
                )}
              </View>

              {historyLoading && (
                <View style={trend.stateBox}>
                  <ActivityIndicator size="small" color={GREEN} />
                  <Text style={trend.stateText}>Loading history…</Text>
                </View>
              )}

              {!historyLoading && historyError && (
                <View style={trend.stateBox}>
                  <Ionicons name="alert-circle-outline" size={20} color="#C0392B" />
                  <Text style={[trend.stateText, { color: '#C0392B' }]}>{historyError}</Text>
                </View>
              )}

              {!historyLoading && !historyError && chartPoints.length === 0 && (
                <View style={trend.stateBox}>
                  <Ionicons name="analytics-outline" size={20} color="#8E8EA0" />
                  <Text style={trend.stateText}>No history available for this period.</Text>
                </View>
              )}

              {!historyLoading && !historyError && chartPoints.length > 0 && (
                <TrendChart points={chartPoints} color={selectedSensorDef.iconColor} />
              )}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Dropdown Modal ── */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdownOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Select Pen</Text>
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.menuOption, filter === opt && styles.menuOptionActive]}
                onPress={() => { setFilter(opt); setDropdownOpen(false); }}
              >
                <Text style={[styles.menuOptionText, filter === opt && styles.menuOptionTextActive]}>{opt}</Text>
                {filter === opt && <Ionicons name="checkmark" size={16} color={GREEN} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Environmental Trends Filter Modal (pen / range / sensor) ── */}
      <Modal
        visible={historyDropdown !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryDropdown(null)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setHistoryDropdown(null)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>
              {historyDropdown === 'pen'
                ? 'Select Pen'
                : historyDropdown === 'range'
                ? 'Select Date Range'
                : 'Select Sensor'}
            </Text>

            {historyDropdown === 'pen' && pens.map((p) => (
              <TouchableOpacity
                key={p.pen_id}
                style={[styles.menuOption, historyPenId === p.pen_id && styles.menuOptionActive]}
                onPress={() => { setHistoryPenId(p.pen_id); setHistoryDropdown(null); }}
              >
                <Text style={[styles.menuOptionText, historyPenId === p.pen_id && styles.menuOptionTextActive]}>
                  {p.pen_name}
                </Text>
                {historyPenId === p.pen_id && <Ionicons name="checkmark" size={16} color={GREEN} />}
              </TouchableOpacity>
            ))}

            {historyDropdown === 'range' && RANGE_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.menuOption, historyRange === r.value && styles.menuOptionActive]}
                onPress={() => { setHistoryRange(r.value); setHistoryDropdown(null); }}
              >
                <Text style={[styles.menuOptionText, historyRange === r.value && styles.menuOptionTextActive]}>
                  {r.label}
                </Text>
                {historyRange === r.value && <Ionicons name="checkmark" size={16} color={GREEN} />}
              </TouchableOpacity>
            ))}

            {historyDropdown === 'sensor' && METRIC_DEFS.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.menuOption, historySensor === m.id && styles.menuOptionActive]}
                onPress={() => { setHistorySensor(m.id); setHistoryDropdown(null); }}
              >
                <Text style={[styles.menuOptionText, historySensor === m.id && styles.menuOptionTextActive]}>
                  {SENSOR_FULL_LABEL[m.id]}
                </Text>
                {historySensor === m.id && <Ionicons name="checkmark" size={16} color={GREEN} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Card Styles ─────────────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  noData: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8EA0',
    marginTop: 2,
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#EEE',
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 4,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── Feed Accordion Panel Styles ──────────────────────────────────────────────

const feedPanel = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8EA0',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  row: {
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  containerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2B22',
  },
  containerPct: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F0A500',
  },
  containerNoData: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  barTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#EEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F0A500',
  },
});

// ─── Screen Styles ───────────────────────────────────────────────────────────

const GREEN = '#2F5D50';
const BG = '#F7F8F9';
const WHITE = '#FFFFFF';
const BORDER = '#E8EAED';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B22',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  alertText: { fontSize: 13, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  filterLabel: { fontSize: 14, color: '#6B7C72', fontWeight: '500' },
  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderWidth: 1.5, borderColor: GREEN,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, gap: 6,
    ...Platform.select({
      ios: { shadowColor: GREEN, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  dropdownText: { fontSize: 14, color: GREEN, fontWeight: '600' },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  centerStateText: {
    fontSize: 13,
    color: '#6B7C72',
    fontWeight: '500',
    textAlign: 'center',
  },

  penSection: { marginBottom: 20 },
  penLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  penPill: { backgroundColor: GREEN, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  penPillText: { fontSize: 13, fontWeight: '700', color: WHITE },
  penLine: { flex: 1, height: 1, backgroundColor: BORDER },
  cardGrid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  menu: {
    backgroundColor: WHITE, borderRadius: 16, width: '100%', overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  menuTitle: {
    fontSize: 11, fontWeight: '700', color: '#8E8EA0', letterSpacing: 0.8,
    textTransform: 'uppercase', paddingHorizontal: 18, paddingTop: 16,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  menuOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  menuOptionActive: { backgroundColor: '#EAF4EE' },
  menuOptionText: { fontSize: 16, color: '#1A2B22', fontWeight: '500' },
  menuOptionTextActive: { color: GREEN, fontWeight: '700' },
});

// ─── Environmental Trends Styles ──────────────────────────────────────────────
// Declared after GREEN/BG/WHITE/BORDER above so they're safe to reference here.

const trend = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2B22',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipWide: {
    flexGrow: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },
  chartCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2B22',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#8E8EA0',
    fontWeight: '500',
    marginTop: 2,
  },
  latestValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  stateText: {
    fontSize: 12,
    color: '#8E8EA0',
    fontWeight: '500',
    textAlign: 'center',
  },
  plotArea: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E3E6E4',
  },
  chartLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
  },
  chartDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  axisRow: {
    height: 16,
    position: 'relative',
    marginTop: 6,
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#8E8EA0',
    fontWeight: '500',
    textAlign: 'center',
  },
});