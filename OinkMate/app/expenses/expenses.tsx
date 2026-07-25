import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExpenseOverview from '../../components/expenses/ExpenseOverview';
import CategoryExpenses from '../../components/expenses/CategoryExpenses';
import ExpenseHistory from '../../components/expenses/ExpenseHistory';
import SystemGeneratedExpenses from '../../components/expenses/SystemGeneratedExpenses';
import FinancialInsights from '../../components/expenses/FinancialInsights';

import AsyncStorage from '@react-native-async-storage/async-storage';

type PeriodKey = 'today' | 'week' | 'month' | 'year';

interface OverviewStat {
  key: PeriodKey;
  label: string;
  value: string;
}

interface CategoryAmount {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
}

interface AutoComputedItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
  note: string;
}

interface HistoryItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  amount: string;
  date: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatFullDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function getWeekOfMonth(date: Date): number {
  return Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7);
}

function getPeriodLabel(period: PeriodKey, today: Date): string {
  switch (period) {
    case 'today':
      return `Today • ${formatFullDate(today)}`;
    case 'week':
      return `Week ${getWeekOfMonth(today)} • ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
    case 'month':
      return `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;
    case 'year':
      return `Year ${today.getFullYear()}`;
    default:
      return '';
  }
}

// Formats a number as Philippine Peso, e.g. 18500 -> "₱18,500.00"
function formatPeso(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const [intPart, decPart] = Math.abs(safeAmount).toFixed(2).split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = safeAmount < 0 ? '-' : '';
  return `${sign}₱${withCommas}.${decPart}`;
}

// Maps a DB category name to its display icon. Falls back to a generic icon
// for any category returned by the API that isn't in this list.
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Feed: 'leaf-outline',
  Water: 'water-outline',
  Electricity: 'flash-outline',
  Veterinary: 'medkit-outline',
  Maintenance: 'construct-outline',
  Equipment: 'hardware-chip-outline',
  Others: 'cube-outline',
};

const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const OVERVIEW_LABELS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const ZERO_OVERVIEW_STATS: OverviewStat[] = OVERVIEW_LABELS.map((item) => ({
  ...item,
  value: formatPeso(0),
}));

const CATEGORY_ORDER = ['Feed', 'Water', 'Electricity', 'Veterinary', 'Maintenance', 'Equipment', 'Others'];

const ZERO_CATEGORIES: CategoryAmount[] = CATEGORY_ORDER.map((label) => ({
  key: label.toLowerCase(),
  icon: CATEGORY_ICON_MAP[label] ?? 'cube-outline',
  label,
  amount: formatPeso(0),
}));

// Matches the host used by farmer_login.php — update if this ngrok URL changes.
const API_BASE_URL = 'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api';

interface ExpenseSummaryResponse {
  success: boolean;
  period?: PeriodKey;
  overview?: Record<PeriodKey, number>;
  categories?: { category: string; total: number }[];
  message?: string;
}

// History and system-generated data are untouched — left as-is per scope.
const HISTORY_DATA: Record<PeriodKey, HistoryItem[]> = {
  today: [
    { key: 't1', icon: 'leaf-outline', category: 'Feed Expense', amount: '₱1,200', date: 'June 29, 2026' },
    { key: 't2', icon: 'water-outline', category: 'Water Expense', amount: '₱6', date: 'June 29, 2026' },
  ],
  week: [
    { key: 'w1', icon: 'medkit-outline', category: 'Veterinary Expense', amount: '₱500', date: 'June 29, 2026' },
    { key: 'w2', icon: 'leaf-outline', category: 'Feed Expense', amount: '₱4,800', date: 'June 25, 2026' },
    { key: 'w3', icon: 'construct-outline', category: 'Maintenance Expense', amount: '₱300', date: 'June 24, 2026' },
  ],
  month: [
    { key: 'm1', icon: 'medkit-outline', category: 'Veterinary Expense', amount: '₱500', date: 'June 29, 2026' },
    { key: 'm2', icon: 'hardware-chip-outline', category: 'Equipment Expense', amount: '₱1,200', date: 'June 28, 2026' },
    { key: 'm3', icon: 'construct-outline', category: 'Maintenance Expense', amount: '₱300', date: 'June 27, 2026' },
    { key: 'm4', icon: 'leaf-outline', category: 'Feed Expense', amount: '₱4,800', date: 'June 25, 2026' },
    { key: 'm5', icon: 'water-outline', category: 'Water Expense', amount: '₱220', date: 'June 22, 2026' },
  ],
  year: [
    { key: 'y1', icon: 'medkit-outline', category: 'Veterinary Expense', amount: '₱9,800', date: '2026' },
    { key: 'y2', icon: 'hardware-chip-outline', category: 'Equipment Expense', amount: '₱5,200', date: '2026' },
    { key: 'y3', icon: 'leaf-outline', category: 'Feed Expense', amount: '₱98,400', date: '2026' },
  ],
};

const AUTO_COMPUTED: AutoComputedItem[] = [
  {
    key: 'feed_cost',
    icon: 'leaf-outline',
    label: 'Feed Cost',
    amount: '₱1,312.50',
    note: 'Pig count × age category × feed price',
  },
  {
    key: 'water_cost',
    icon: 'water-outline',
    label: 'Water Cost',
    amount: '₱6.00',
    note: 'Water flow sensor data',
  },
  {
    key: 'electricity_cost',
    icon: 'flash-outline',
    label: 'Electricity Cost',
    amount: '₱18.00',
    note: 'Pump runtime × electricity rate',
  },
];

export default function Expenses() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [farmerId, setFarmerId] = useState<string | null>(null);

  const today = new Date(2026, 5, 29);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [overviewStats, setOverviewStats] = useState<OverviewStat[]>(ZERO_OVERVIEW_STATS);
  const [categories, setCategories] = useState<CategoryAmount[]>(ZERO_CATEGORIES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const rawHistory = HISTORY_DATA[period];

  const fetchSummary = useCallback(async (selectedPeriod: PeriodKey) => {
    if (!farmerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/expenses/get_expense_summary.php?farmer_id=${encodeURIComponent(
        farmerId
      )}&period=${selectedPeriod}`;
      const response = await fetch(url);
      const data: ExpenseSummaryResponse = await response.json();

      if (!data.success || !data.overview || !data.categories) {
        throw new Error(data.message || 'Failed to load expense summary');
      }

      const nextOverviewStats: OverviewStat[] = OVERVIEW_LABELS.map((item) => ({
        ...item,
        value: formatPeso(data.overview?.[item.key] ?? 0),
      }));

      const nextCategories: CategoryAmount[] = data.categories.map((cat) => ({
        key: cat.category.toLowerCase(),
        icon: CATEGORY_ICON_MAP[cat.category] ?? 'cube-outline',
        label: cat.category,
        amount: formatPeso(cat.total),
      }));

      setOverviewStats(nextOverviewStats);
      setCategories(nextCategories);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load expense summary');
      setOverviewStats(ZERO_OVERVIEW_STATS);
      setCategories(ZERO_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        // TODO: confirm the exact field name on the stored user object —
        // using "farmer_id" here since that matches the expenses table's
        // farmer_id column. Adjust if your farmer_login.php response uses
        // a different key (e.g. "id").
        const parsedUser = raw ? JSON.parse(raw) : null;
        setFarmerId(parsedUser?.farmer_id ?? null);
      } catch (err) {
        setError('Failed to load logged-in farmer');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (farmerId) {
      fetchSummary(period);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, farmerId]);

  const handlePeriodChange = (nextPeriod: PeriodKey) => {
    setPeriod(nextPeriod);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard'))}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={18} color="#555" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Expenses</Text>
        </View>

        <TouchableOpacity
        style={styles.addButton}
        activeOpacity={0.85}
        onPress={() => router.push('/expenses/add-expense')}
      >

          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SECTION 1 — Expense Overview */}
        <ExpenseOverview stats={overviewStats} loading={loading} />

        {/* SECTION 3 — Period Filter + SECTION 2 — Category Expenses */}
        <CategoryExpenses
          period={period}
          onPeriodChange={handlePeriodChange}
          periodTabs={PERIOD_TABS}
          categories={categories}
          periodLabel={getPeriodLabel(period, today)}
          loading={loading}
        />

        {error && (
          <Text style={styles.errorText}>Couldn't refresh expense totals. Pull to try again.</Text>
        )}

        {/* SECTION 4 — Expense History */}
        <ExpenseHistory rawHistory={rawHistory} today={today} />

        {/* SECTION 5 — System Generated Expenses */}
        <SystemGeneratedExpenses items={AUTO_COMPUTED} />

        {/* FUTURE READY — Financial Insights placeholder */}
        <FinancialInsights />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  backButton: {
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
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2D27',
    letterSpacing: -0.2,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45252',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 32,
  },
});