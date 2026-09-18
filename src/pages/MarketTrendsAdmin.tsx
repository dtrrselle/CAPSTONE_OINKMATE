import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, DollarSign, Wheat, MapPin, Info, Megaphone, X, CheckCircle2 } from 'lucide-react';
import { Panel, StatCard } from "../components/CardAdmin";
import './MarketTrendsAdmin.css';

/* ============================================================
   LIVE DATA SOURCE — PSA OpenSTAT, via our own PHP proxy
   Table: Livestock and Poultry (Average): Farmgate Prices by
          Commodity, Province, Region, Monthly, 2025-2026

   Why a proxy: openstat.psa.gov.ph does not send CORS headers,
   so the browser blocks a direct fetch from React. Our PHP
   backend (see /api/market-trends.php) calls PSA server-side
   and forwards the CSV back to us — no CORS issue that way.

   Confirmed working via Bruno directly against PSA:
   - Geolocation "608" = PHILIPPINES (national)
   - Type "3" = Hog for Slaughter
   - Year "0" = 2025, "1" = 2026
   - Month "0"-"11" = Jan-Dec, "12" = Annual

   PSA releases farmgate prices ~2 months behind, so recent months
   come back as a placeholder (not yet published) — the parser
   below skips those automatically, no need to guess how far the
   data goes.
============================================================ */

// Your PHP backend endpoints (D:\Api Project\htdocs\oinkmate-api\api\)
const PSA_MARKET_API_URL = 'http://localhost/oinkmate-api/api/market-trends.php';
const PSA_MARKET_REGIONS_URL = 'http://localhost/oinkmate-api/api/market-trends-regions.php';

interface PricePoint {
  label: string;
  price: number;
}

interface RegionOption {
  key: string;
  label: string;
}

const REGION_OPTIONS: RegionOption[] = [
  { key: 'all', label: 'All Regions (National Avg.)' },
  { key: 'ncr', label: 'NCR' },
  { key: 'calabarzon', label: 'CALABARZON' },
  { key: 'central-luzon', label: 'Central Luzon' },
  { key: 'bicol', label: 'Bicol Region' },
  { key: 'western-visayas', label: 'Western Visayas' },
];

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Parses the single-row CSV our PHP proxy forwards from PSA
// (header = "Geolocation","Type","YYYY Month",... columns, one data row)
function parseHogPriceCSV(csvText: string): PricePoint[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headerCols = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  const dataCols = lines[1].split(',').map((v) => v.replace(/"/g, '').trim());

  const points: PricePoint[] = [];
  for (let i = 2; i < headerCols.length; i++) {
    const raw = dataCols[i];
    if (!raw || raw === '*/' || raw === '..') continue; // not yet published

    const price = parseFloat(raw);
    if (Number.isNaN(price)) continue;

    const [year, monthName] = headerCols[i].split(' ');
    const monthIdx = MONTH_SHORT.findIndex((m) => monthName?.startsWith(m));
    const label = monthIdx >= 0 ? `${MONTH_SHORT[monthIdx]} '${year.slice(2)}` : headerCols[i];

    points.push({ label, price });
  }
  return points;
}

export async function fetchLiveHogPrices(regionKey: string = 'all'): Promise<PricePoint[]> {
  const url = `${PSA_MARKET_API_URL}?region=${encodeURIComponent(regionKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Market trends request failed: ${res.status}`);
  const csv = await res.text();
  return parseHogPriceCSV(csv);
}

interface RegionPrice {
  region: string;
  price: number;
}

// PSA labels look like "..National Capital Region (NCR)" or
// "..REGION IV-A (CALABARZON)" — strip the dots and prefer the short
// name in parentheses when there is one.
function cleanRegionLabel(raw: string): string {
  const noDots = raw.replace(/^\.+/, '').trim();
  const parenMatch = noDots.match(/\(([^)]+)\)/);
  return parenMatch ? parenMatch[1] : noDots;
}

// Parses the multi-row CSV from market-trends-regions.php — one row per
// region, picks each region's latest published month.
function parseRegionalCSV(csvText: string): RegionPrice[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headerCols = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  const results: RegionPrice[] = [];

  for (let r = 1; r < lines.length; r++) {
    const rowCols = lines[r].split(',').map((v) => v.replace(/"/g, '').trim());
    const regionLabel = cleanRegionLabel(rowCols[0]);

    let latestPrice: number | null = null;
    for (let i = 2; i < headerCols.length; i++) {
      const raw = rowCols[i];
      if (!raw || raw === '*/' || raw === '..') continue;
      const price = parseFloat(raw);
      if (!Number.isNaN(price)) latestPrice = price; // keep overwriting -> ends on latest
    }

    if (latestPrice !== null) {
      results.push({ region: regionLabel, price: latestPrice });
    }
  }
  return results;
}

export async function fetchRegionalPrices(): Promise<RegionPrice[]> {
  const res = await fetch(PSA_MARKET_REGIONS_URL);
  if (!res.ok) throw new Error(`Regional comparison request failed: ${res.status}`);
  const csv = await res.text();
  return parseRegionalCSV(csv);
}

/* ============================================================
   MOCK DATA (fallback while the live fetch above isn't wired in
   yet, or while PSA_MARKET_API_URL is unreachable)
   Shape mirrors what fetchLiveHogPrices() returns so swapping in
   the real data is just calling it inside a useEffect.
============================================================ */

// DA set a ₱210/kg minimum farmgate price for live hogs on 4 Nov 2025.
// No PSA-published month or region has reached it as of this writing —
// shown on the chart so farmers can see the gap for themselves.
const DA_FLOOR_PRICE = 210;

type RangeKey = '3M' | '6M' | '1Y' | 'All';

const RANGE_OPTIONS: RangeKey[] = ['3M', '6M', '1Y', 'All'];

// Default series = actual PSA data confirmed via Bruno (Jan 2025-Mar 2026).
// Used instantly on load, then replaced/extended once fetchLiveHogPrices() resolves.
const liveHogSeries: PricePoint[] = [
  { label: "Jan '25", price: 203.74 },
  { label: "Feb '25", price: 212.27 },
  { label: "Mar '25", price: 213.48 },
  { label: "Apr '25", price: 210.32 },
  { label: "May '25", price: 210.89 },
  { label: "Jun '25", price: 214.52 },
  { label: "Jul '25", price: 193.82 },
  { label: "Aug '25", price: 191.22 },
  { label: "Sep '25", price: 189.50 },
  { label: "Oct '25", price: 183.65 },
  { label: "Nov '25", price: 177.78 },
  { label: "Dec '25", price: 187.06 },
  { label: "Jan '26", price: 172.56 },
  { label: "Feb '26", price: 176.31 },
  { label: "Mar '26", price: 179.23 },
];

function rangeSlice(series: PricePoint[], range: RangeKey) {
  switch (range) {
    case '3M':
      return series.slice(-3);
    case '6M':
      return series.slice(-6);
    case '1Y':
      return series.slice(-12);
    case 'All':
    default:
      return series;
  }
}

interface MarketTrendsAdminProps {
  onNavigate?: (page: string) => void;
}

const MarketTrendsAdmin: React.FC<MarketTrendsAdminProps> = ({ onNavigate }) => {
  const [range, setRange] = useState<RangeKey>('1Y');
  const [regionKey, setRegionKey] = useState<string>('all');
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifySent, setNotifySent] = useState(false);
  const [sending, setSending] = useState(false);

  const [liveSeries, setLiveSeries] = useState<typeof liveHogSeries>(liveHogSeries);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [regionalPrices, setRegionalPrices] = useState<RegionPrice[]>([]);
  const [loadingRegional, setLoadingRegional] = useState(true);
  const [regionalError, setRegionalError] = useState<string | null>(null);

  const [switchToast, setSwitchToast] = useState<string | null>(null);
  const isFirstRegionRun = useRef(true);

  const regionLabel = REGION_OPTIONS.find((r) => r.key === regionKey)?.label ?? 'All Regions';

  // Main trend chart — refetches whenever the region dropdown changes
  useEffect(() => {
    let cancelled = false;
    const wasFirstRun = isFirstRegionRun.current;
    isFirstRegionRun.current = false;

    setLoadingPrices(true);

    fetchLiveHogPrices(regionKey)
      .then((points) => {
        if (cancelled) return;
        if (points.length > 0) {
          setLiveSeries(points);
          setPriceError(null);
        }
        // if PSA returns nothing for this region/period, keep last known series

        // Let admin know the switch actually went through — skip on first load
        if (!wasFirstRun) {
          setSwitchToast(`Switched to ${regionLabel} — showing latest data`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch PSA hog prices, using sample data:', err);
        setPriceError('Live PSA data unavailable right now — showing sample data.');
        if (!wasFirstRun) {
          setSwitchToast(`Couldn't load data for ${regionLabel} — showing last known data`);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPrices(false);
      });

    return () => {
      cancelled = true;
    };
  }, [regionKey]); // PSA data only updates monthly, so refetch is cheap/rare

  // Auto-dismiss the region-switch toast
  useEffect(() => {
    if (!switchToast) return;
    const timer = setTimeout(() => setSwitchToast(null), 3000);
    return () => clearTimeout(timer);
  }, [switchToast]);

  // Regional Comparison panel — fetched once, independent of the dropdown
  useEffect(() => {
    let cancelled = false;

    fetchRegionalPrices()
      .then((results) => {
        if (cancelled) return;
        if (results.length > 0) setRegionalPrices(results);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch PSA regional comparison:', err);
        setRegionalError('Regional data unavailable right now.');
      })
      .finally(() => {
        if (!cancelled) setLoadingRegional(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirmNotify = async () => {
    setSending(true);
    // TODO: replace with real POST to your notifications endpoint,
    // e.g. POST /api/notifications { type: 'market-trend', message }
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSending(false);
    setNotifySent(true);
    setNotifyOpen(false);
  };

  const chartData = useMemo(() => rangeSlice(liveSeries, range), [liveSeries, range]);
  const latest = chartData[chartData.length - 1].price;
  const first = chartData[0].price;
  const changeAbs = (latest - first).toFixed(2);
  const changePct = (((latest - first) / first) * 100).toFixed(1);
  const trendDirection = latest >= first ? 'up' : 'down';
  const firstLabel = chartData[0].label;

  const belowFloor = latest < DA_FLOOR_PRICE;
  const floorGap = Math.abs(latest - DA_FLOOR_PRICE).toFixed(2);

  const topRegion = regionalPrices.length > 0
    ? [...regionalPrices].sort((a, b) => b.price - a.price)[0]
    : null;

  const sortedRegionalPrices = useMemo(
    () => [...regionalPrices].sort((a, b) => b.price - a.price),
    [regionalPrices]
  );

  const priceInsight = useMemo(() => {
    if (chartData.length === 0) return null;
    const highest = chartData.reduce((a, b) => (b.price > a.price ? b : a));
    const lowest = chartData.reduce((a, b) => (b.price < a.price ? b : a));
    return { highest, lowest };
  }, [chartData]);

  return (
    <div className="market-trends">
      {/* Filter bar */}
      <div className="mt-filterbar">
        <div className="mt-range-group">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              className={`mt-range-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="mt-filterbar-right">
          <select
            className="mt-region-select"
            value={regionKey}
            onChange={(e) => setRegionKey(e.target.value)}
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>

          <button className="mt-notify-btn" onClick={() => setNotifyOpen(true)}>
            <Megaphone size={15} />
            Notify Farmers
          </button>
        </div>
      </div>

      {/* Region switch toast */}
      {switchToast && (
        <div className={`mt-switch-toast ${priceError ? 'warn' : 'ok'}`}>
          <CheckCircle2 size={15} />
          <span>{switchToast}</span>
        </div>
      )}

      {/* Success banner */}
      {notifySent && (
        <div className="mt-success-banner">
          <CheckCircle2 size={16} />
          <span>Farmers notified about the latest market trends.</span>
          {onNavigate && (
            <button className="mt-success-link" onClick={() => onNavigate('farmers')}>
              View Farmer Management
            </button>
          )}
          <button className="mt-success-close" onClick={() => setNotifySent(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stat strip */}
      <div className="mt-stat-grid">
        <StatCard
          label="Live Hog Price"
          value={`₱${latest}/kg`}
          delta={`${trendDirection === 'up' ? 'Up' : 'Down'} ₱${Math.abs(Number(changeAbs))} since ${firstLabel}`}
          trend={trendDirection as 'up' | 'down'}
          icon={DollarSign}
        />
        <StatCard
          label="Feed Price (per sack)"
          value="₱1,478 avg"
          delta="Up 0.5% from last week"
          trend="up"
          icon={Wheat}
        />
        <StatCard
          label="Region with Highest Price"
          value={topRegion ? topRegion.region : loadingRegional ? 'Loading...' : 'N/A'}
          delta={topRegion ? `Averaging ₱${topRegion.price}/kg` : 'Regional data unavailable'}
          trend="up"
          icon={MapPin}
        />
        <StatCard
          label="Vs. DA Floor Price"
          value={`₱${DA_FLOOR_PRICE}/kg`}
          delta={belowFloor ? `₱${floorGap} below the floor` : `₱${floorGap} above the floor`}
          trend={belowFloor ? 'down' : 'up'}
          icon={TrendingUp}
        />
      </div>

      {/* Price trend chart */}
      <Panel
        title="Live Hog Price Trend"
        subtitle={`₱/kg liveweight (farmgate) · ${regionLabel} · Source: PSA OpenSTAT`}
        action={
          <span className={`mt-mock-badge ${priceError ? 'warn' : 'live'}`}>
            <Info size={12} />
            {loadingPrices ? 'Loading...' : priceError ? 'Sample data' : 'PSA data'}
          </span>
        }
      >
        {priceError && <p className="mt-price-error">{priceError}</p>}
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#f0ebe4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e8e0d8' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              domain={[
                (dataMin: number) => Math.floor(Math.min(dataMin, DA_FLOOR_PRICE) - 5),
                (dataMax: number) => Math.ceil(Math.max(dataMax, DA_FLOOR_PRICE) + 5),
              ]}
            />
          <Tooltip
  contentStyle={{
    borderRadius: 10,
    border: '1px solid #e8e0d8',
    fontSize: 12,
  }}
  formatter={(value) => [
    `₱${Number(value).toLocaleString()}/kg`,
    'Live Hog',
  ]}
/>
            <ReferenceLine
              y={DA_FLOOR_PRICE}
              stroke="#829672"
              strokeDasharray="5 4"
              label={{
                value: `DA Floor Price ₱${DA_FLOOR_PRICE}`,
                position: 'insideTopLeft',
                fill: '#5c8a52',
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#e9839d"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#e9839d', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {priceInsight && (
          <div className="mt-chart-insight">
            <span>
              <strong>Highest:</strong> ₱{priceInsight.highest.price}/kg ({priceInsight.highest.label})
            </span>
            <span>
              <strong>Lowest:</strong> ₱{priceInsight.lowest.price}/kg ({priceInsight.lowest.label})
            </span>
            <span>
              <strong>{belowFloor ? 'Below' : 'Above'} DA floor price</strong> (₱{DA_FLOOR_PRICE}/kg) by ₱{floorGap}
            </span>
          </div>
        )}
      </Panel>

      {/* Regional comparison */}
      <Panel
        title="Regional Comparison"
        subtitle="Latest available live hog price per region"
        action={
          <span className={`mt-mock-badge ${regionalError ? 'warn' : 'live'}`}>
            <Info size={12} />
            {loadingRegional ? 'Loading...' : regionalError ? 'Unavailable' : 'PSA data'}
          </span>
        }
      >
        {regionalError && <p className="mt-price-error">{regionalError}</p>}
        {!loadingRegional && !regionalError && regionalPrices.length === 0 && (
          <p className="mt-price-error">No regional data published yet for this period.</p>
        )}
        <div className="mt-region-list">
          <div className="mt-region-row mt-region-header">
            <span></span>
            <span className="mt-region-col-label">Relative price</span>
            <span className="mt-region-col-label">Avg. price</span>
          </div>
          {sortedRegionalPrices.map((r, idx) => {
            const maxPrice = Math.max(...sortedRegionalPrices.map((x) => x.price));
            const widthPct = maxPrice > 0 ? (r.price / maxPrice) * 100 : 0;
            return (
              <div key={r.region} className={`mt-region-row ${idx === 0 ? 'top' : ''}`}>
                <span className="mt-region-name">
                  {idx === 0 && <span className="mt-region-rank">Highest</span>}
                  {r.region}
                </span>
                <div className="mt-region-bar-track">
                  <div
                    className="mt-region-bar-fill"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="mt-region-price">₱{r.price}/kg</span>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Notify Farmers confirmation modal */}
      {notifyOpen && (
        <div className="mt-modal-overlay" onClick={() => setNotifyOpen(false)}>
          <div className="mt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mt-modal-icon">
              <Megaphone size={20} />
            </div>
            <h3 className="mt-modal-title">Notify all farmers?</h3>
            <p className="mt-modal-body">
              This will send a market trend update to every registered farmer,
              showing the current live hog price ({regionLabel}, {range}) and any
              significant changes. This action can't be undone once sent.
            </p>
            <div className="mt-modal-actions">
              <button
                className="mt-modal-btn cancel"
                onClick={() => setNotifyOpen(false)}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                className="mt-modal-btn confirm"
                onClick={handleConfirmNotify}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Yes, Notify Farmers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketTrendsAdmin;