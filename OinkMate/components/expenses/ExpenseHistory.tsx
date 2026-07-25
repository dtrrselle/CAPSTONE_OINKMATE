import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HistoryItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: string;
  amount: string;
  date: string;
}

// Internal record shape once real data is loaded from the API — adds the raw
// expense_id (needed for edit/delete) and description (now part of the
// required display fields) on top of the original HistoryItem shape.
interface ExpenseRecord extends HistoryItem {
  expense_id: string;
  description: string;
}

const CATEGORY_FILTERS = [
  'All Categories',
  'Feed',
  'Water',
  'Electricity',
  'Veterinary',
  'Maintenance',
  'Equipment',
  'Others',
];

// Maps a DB category name to its display icon.
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Feed: 'leaf-outline',
  Water: 'water-outline',
  Electricity: 'flash-outline',
  Veterinary: 'medkit-outline',
  Maintenance: 'construct-outline',
  Equipment: 'hardware-chip-outline',
  Others: 'cube-outline',
};

// Matches the host used elsewhere in the app — update if this ngrok URL changes.
const API_BASE_URL = 'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatFullDate(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Parses a 'YYYY-MM-DD' string from the API into a local Date without any
// timezone shifting (avoids the off-by-one-day bug from `new Date(str)`).
function parseApiDate(value: string): Date {
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

interface ExpenseHistoryProps {
  // Kept only so existing callers that still pass this prop don't break the
  // build — the component now loads real data from the API instead.
  rawHistory?: HistoryItem[];
  today: Date;
}

export default function ExpenseHistory({ today }: ExpenseHistoryProps) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarView, setCalendarView] = useState<'day' | 'month' | 'year'>('day');
  const [showDayYearPicker, setShowDayYearPicker] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────────
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [rawHistory, setRawHistory] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Delete flow modals ───────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<'success' | 'error' | null>(null);
  const [deleteResultMessage, setDeleteResultMessage] = useState('');

  const loadExpenses = useCallback(async (fid: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const url = `${API_BASE_URL}/expenses/get_expenses.php?farmer_id=${encodeURIComponent(fid)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success || !Array.isArray(data.expenses)) {
        throw new Error(data.message || 'Failed to load expense history');
      }

      const records: ExpenseRecord[] = data.expenses.map((row: any) => {
        const parsedDate = parseApiDate(row.expense_date);
        const amountNum = Number(row.amount) || 0;
        return {
          key: String(row.expense_id),
          expense_id: String(row.expense_id),
          icon: CATEGORY_ICON_MAP[row.category] ?? 'cube-outline',
          category: row.category,
          amount: `₱${amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          date: Number.isNaN(parsedDate.getTime()) ? row.expense_date : formatFullDate(parsedDate),
          description: row.description || '',
        };
      });

      setRawHistory(records);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Failed to load expense history');
      setRawHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('user');
          const parsedUser = raw ? JSON.parse(raw) : null;
          const fid = parsedUser?.farmer_id ?? null;
          setFarmerId(fid);
          if (fid) {
            loadExpenses(fid);
          } else {
            setLoading(false);
          }
        } catch (err) {
          setLoadError('Failed to load logged-in farmer');
          setLoading(false);
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const history = rawHistory.filter((item) => {
    const matchesCategory =
      categoryFilter === 'All Categories' ||
      item.category.toLowerCase().startsWith(categoryFilter.toLowerCase());

    if (!selectedDate) return matchesCategory;

    let matchesDate = false;
    if (calendarView === 'day') {
      matchesDate = item.date === formatFullDate(selectedDate);
    } else if (calendarView === 'month') {
      const monthLabel = `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
      matchesDate = item.date.includes(MONTH_NAMES[selectedDate.getMonth()]) &&
        item.date.includes(String(selectedDate.getFullYear()));
    } else if (calendarView === 'year') {
      matchesDate = item.date.includes(String(selectedDate.getFullYear()));
    }

    return matchesCategory && matchesDate;
  });

  return (
    <>
    <View style={styles.card}>
      <View style={styles.cardLabelRow}>
        <Ionicons name="time-outline" size={15} color="#2F5D50" />
        <Text style={styles.cardLabel}>Expense History</Text>
      </View>

      {/* Filters row: date picker + category dropdown */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.dateFilterButton, selectedDate && styles.dateFilterButtonActive]}
          onPress={() => setShowDatePicker(!showDatePicker)}
          activeOpacity={0.85}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={selectedDate ? '#FFFFFF' : '#2F5D50'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterTrigger}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          activeOpacity={0.85}
        >
          <Text style={styles.filterTriggerText}>{categoryFilter}</Text>
          <Ionicons
            name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
            size={15}
            color="#8A9994"
          />
        </TouchableOpacity>
      </View>

      {selectedDate && (
        <View style={styles.activeDateChip}>
          <Ionicons name="calendar" size={13} color="#2F5D50" />
          <Text style={styles.activeDateChipText}>
            {calendarView === 'day'
              ? formatFullDate(selectedDate)
              : calendarView === 'month'
              ? `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
              : String(selectedDate.getFullYear())}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDate(null)} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={15} color="#8A9994" />
          </TouchableOpacity>
        </View>
      )}

      {showDatePicker && (
        <View style={styles.dateMenu}>
          {/* View mode tabs: Day / Month / Year */}
          <View style={styles.calViewTabs}>
            {(['day', 'month', 'year'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.calViewTab, calendarView === mode && styles.calViewTabActive]}
                activeOpacity={0.8}
                onPress={() => { setCalendarView(mode); setShowDayYearPicker(false); }}
              >
                <Text style={[styles.calViewTabText, calendarView === mode && styles.calViewTabTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* DAY VIEW — standard calendar grid */}
          {calendarView === 'day' && (
            <>
              <View style={styles.calendarNavRow}>
                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (showDayYearPicker) { setCalendarYear((y) => y - 1); return; }
                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
                    else setCalendarMonth((m) => m - 1);
                  }}
                >
                  <Ionicons name="chevron-back" size={16} color="#2F5D50" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calendarNavLabelButton}
                  activeOpacity={0.8}
                  onPress={() => setShowDayYearPicker((v) => !v)}
                >
                  <Text style={styles.calendarNavLabel}>
                    {showDayYearPicker ? 'Select Year' : `${MONTH_NAMES[calendarMonth]} ${calendarYear}`}
                  </Text>
                  <Ionicons
                    name={showDayYearPicker ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color="#2F5D50"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calendarNavBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (showDayYearPicker) { setCalendarYear((y) => y + 1); return; }
                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
                    else setCalendarMonth((m) => m + 1);
                  }}
                >
                  <Ionicons name="chevron-forward" size={16} color="#2F5D50" />
                </TouchableOpacity>
              </View>

              {showDayYearPicker ? (
                /* Inline year picker — lets the user jump to any year while keeping day/month selection */
                <View style={styles.yearGrid}>
                  {Array.from({ length: 8 }, (_, i) => calendarYear - 3 + i).map((yr) => {
                    const isSelected = yr === calendarYear;
                    return (
                      <TouchableOpacity
                        key={yr}
                        style={[styles.yearCell, isSelected && styles.yearCellActive]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setCalendarYear(yr);
                          setShowDayYearPicker(false);
                        }}
                      >
                        <Text style={[styles.yearCellText, isSelected && styles.yearCellTextActive]}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <>
                  <View style={styles.calendarWeekRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <Text key={`${d}-${i}`} style={styles.calendarWeekLabel}>{d}</Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {(() => {
                      const firstDayOffset = new Date(calendarYear, calendarMonth, 1).getDay();
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const cells: (number | null)[] = [
                        ...Array(firstDayOffset).fill(null),
                        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                      ];
                      return cells.map((day, idx) => {
                        const isSelected =
                          !!day && !!selectedDate &&
                          selectedDate.getDate() === day &&
                          selectedDate.getMonth() === calendarMonth &&
                          selectedDate.getFullYear() === calendarYear;
                        return (
                          <TouchableOpacity
                            key={idx}
                            disabled={!day}
                            style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive]}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (!day) return;
                              setSelectedDate(new Date(calendarYear, calendarMonth, day));
                              setShowDatePicker(false);
                            }}
                          >
                            {day && (
                              <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextActive]}>
                                {day}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>

                  <TouchableOpacity
                    style={styles.calendarTodayBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedDate(today);
                      setCalendarMonth(today.getMonth());
                      setCalendarYear(today.getFullYear());
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.calendarTodayBtnText}>Today</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* MONTH VIEW — 3×4 month grid */}
          {calendarView === 'month' && (
            <>
              <View style={styles.calendarNavRow}>
                <TouchableOpacity style={styles.calendarNavBtn} activeOpacity={0.8} onPress={() => setCalendarYear((y) => y - 1)}>
                  <Ionicons name="chevron-back" size={16} color="#2F5D50" />
                </TouchableOpacity>
                <Text style={styles.calendarNavLabel}>{calendarYear}</Text>
                <TouchableOpacity style={styles.calendarNavBtn} activeOpacity={0.8} onPress={() => setCalendarYear((y) => y + 1)}>
                  <Ionicons name="chevron-forward" size={16} color="#2F5D50" />
                </TouchableOpacity>
              </View>
              <View style={styles.monthGrid}>
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected = !!selectedDate && selectedDate.getMonth() === idx && selectedDate.getFullYear() === calendarYear;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.monthCell, isSelected && styles.monthCellActive]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedDate(new Date(calendarYear, idx, 1));
                        setCalendarMonth(idx);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[styles.monthCellText, isSelected && styles.monthCellTextActive]}>
                        {name.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* YEAR VIEW — scrollable year list */}
          {calendarView === 'year' && (
            <>
              <View style={styles.calendarNavRow}>
                <TouchableOpacity style={styles.calendarNavBtn} activeOpacity={0.8} onPress={() => setCalendarYear((y) => y - 4)}>
                  <Ionicons name="chevron-back" size={16} color="#2F5D50" />
                </TouchableOpacity>
                <Text style={styles.calendarNavLabel}>Select Year</Text>
                <TouchableOpacity style={styles.calendarNavBtn} activeOpacity={0.8} onPress={() => setCalendarYear((y) => y + 4)}>
                  <Ionicons name="chevron-forward" size={16} color="#2F5D50" />
                </TouchableOpacity>
              </View>
              <View style={styles.yearGrid}>
                {Array.from({ length: 8 }, (_, i) => calendarYear - 3 + i).map((yr) => {
                  const isSelected = !!selectedDate && selectedDate.getFullYear() === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.yearCell, isSelected && styles.yearCellActive]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedDate(new Date(yr, 0, 1));
                        setCalendarYear(yr);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={[styles.yearCellText, isSelected && styles.yearCellTextActive]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>
      )}

      {showCategoryDropdown && (
        <View style={styles.filterMenu}>
          {CATEGORY_FILTERS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.filterItem, categoryFilter === opt && styles.filterItemActive]}
              onPress={() => { setCategoryFilter(opt); setShowCategoryDropdown(false); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterItemText, categoryFilter === opt && styles.filterItemTextActive]}>
                {opt}
              </Text>
              {categoryFilter === opt && (
                <Ionicons name="checkmark" size={14} color="#2F5D50" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* History list */}
      <View style={{ gap: 10 }}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color="#2F5D50" />
            <Text style={styles.emptyStateText}>Loading expenses...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={22} color="#D96C8D" />
            <Text style={styles.emptyStateText}>Couldn't load expense history</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={22} color="#B0C0BC" />
            <Text style={styles.emptyStateText}>No expenses found</Text>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.key} style={styles.historyRow}>
              <View style={styles.historyIconWrap}>
                <Ionicons name={item.icon} size={16} color="#2F5D50" />
              </View>
              <View style={styles.historyTextBlock}>
                <Text style={styles.historyCategory}>{item.category}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
                {!!item.description && (
                  <Text style={styles.historyDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.historyAmount}>{item.amount}</Text>
              <View style={styles.historyActions}>
                <TouchableOpacity
                  style={styles.historyActionBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/expenses/edit-expenses',
                      params: { expense_id: item.expense_id },
                    })
                  }
                >
                  <Ionicons name="pencil-outline" size={14} color="#2F5D50" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.historyActionBtn}
                  activeOpacity={0.8}
                  onPress={() => setDeleteTarget(item)}
                >
                  <Ionicons name="trash-outline" size={14} color="#D96C8D" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </View>

    {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
    <Modal visible={!!deleteTarget && !deleting && !deleteResult} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={[modalStyles.iconWrap, { backgroundColor: '#FCEEF2' }]}>
            <Ionicons name="trash-outline" size={38} color="#D96C8D" />
          </View>
          <Text style={modalStyles.title}>Delete Expense?</Text>
          <Text style={modalStyles.message}>
            Are you sure you want to delete this expense record? This action cannot be undone.
          </Text>

          {deleteTarget && (
            <View style={modalStyles.previewCard}>
              <Text style={modalStyles.previewLabel}>Category</Text>
              <Text style={modalStyles.previewValue}>{deleteTarget.category}</Text>
              <Text style={modalStyles.previewLabel}>Amount</Text>
              <Text style={modalStyles.previewValue}>{deleteTarget.amount}</Text>
              <Text style={modalStyles.previewLabel}>Date</Text>
              <Text style={modalStyles.previewValue}>{deleteTarget.date}</Text>
            </View>
          )}

          <View style={modalStyles.btnRow}>
            <TouchableOpacity
              style={modalStyles.cancelBtn}
              activeOpacity={0.85}
              onPress={() => setDeleteTarget(null)}
            >
              <Text style={modalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.deleteBtn}
              activeOpacity={0.85}
              onPress={async () => {
                if (!deleteTarget) return;
                const target = deleteTarget;
                setDeleting(true);
                try {
                  const response = await fetch(`${API_BASE_URL}/expenses/delete_expense.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expense_id: target.expense_id }),
                  });
                  const data = await response.json();
                  if (!data.success) {
                    throw new Error(data.message || 'Failed to delete expense');
                  }
                  setDeleteResultMessage('Expense record has been deleted successfully.');
                  setDeleteResult('success');
                } catch (err: any) {
                  setDeleteResultMessage(err?.message ?? 'Failed to delete expense');
                  setDeleteResult('error');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              <Text style={modalStyles.deleteBtnText}>Delete Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* ── Deleting Loading Modal ──────────────────────────────────────────── */}
    <Modal visible={deleting} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.loadingCard}>
          <ActivityIndicator size="large" color="#2F5D50" />
          <Text style={modalStyles.loadingText}>Deleting Expense...</Text>
        </View>
      </View>
    </Modal>

    {/* ── Result Modal (success / error) ──────────────────────────────────── */}
    <Modal visible={!!deleteResult} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View
            style={[
              modalStyles.iconWrap,
              { backgroundColor: deleteResult === 'success' ? '#EBF7F2' : '#FEF0F2' },
            ]}
          >
            <Ionicons
              name={deleteResult === 'success' ? 'checkmark-circle' : 'close-circle'}
              size={38}
              color={deleteResult === 'success' ? '#2F5D50' : '#C0394B'}
            />
          </View>
          <Text style={modalStyles.title}>
            {deleteResult === 'success' ? 'Expense Deleted' : 'Delete Failed'}
          </Text>
          <Text style={modalStyles.message}>{deleteResultMessage}</Text>
          <TouchableOpacity
            style={[
              modalStyles.okBtn,
              { backgroundColor: deleteResult === 'success' ? '#2F5D50' : '#C0394B' },
            ]}
            activeOpacity={0.85}
            onPress={() => {
              const wasSuccess = deleteResult === 'success';
              setDeleteResult(null);
              setDeleteTarget(null);
              if (wasSuccess && farmerId) {
                loadExpenses(farmerId);
              }
            }}
          >
            <Text style={modalStyles.okBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      gap: 14,
      borderWidth: 1,
      borderColor: '#EEF1F0',
      shadowColor: '#0F2D24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
  cardLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
  cardLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  filtersRow: {
      flexDirection: 'row',
      gap: 8,
    },
  dateFilterButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#F7F8F9',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  dateFilterButtonActive: {
      backgroundColor: '#2F5D50',
      borderColor: '#2F5D50',
    },
  filterTrigger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#F7F8F9',
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  filterTriggerText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  activeDateChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: '#EAF7F1',
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
  activeDateChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2F5D50',
      fontFamily: 'Inter',
    },
  dateMenu: {
      backgroundColor: '#F7F8F9',
      borderRadius: 14,
      padding: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  calViewTabs: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: 3,
      gap: 2,
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  calViewTab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 7,
      borderRadius: 8,
    },
  calViewTabActive: {
      backgroundColor: '#2F5D50',
    },
  calViewTabText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#6B8A82',
      fontFamily: 'Inter',
    },
  calViewTabTextActive: {
      color: '#FFFFFF',
    },
  calendarNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  calendarNavBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  calendarNavLabelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  calendarNavLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  yearGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
  yearCell: {
      width: '22%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  yearCellActive: {
      backgroundColor: '#2F5D50',
      borderColor: '#2F5D50',
    },
  yearCellText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  yearCellTextActive: {
      color: '#FFFFFF',
    },
  calendarWeekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  calendarWeekLabel: {
      width: 32,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: '#8A9994',
      fontFamily: 'Inter',
    },
  calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
  calendarDayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  calendarDayCellActive: {
      backgroundColor: '#2F5D50',
      borderRadius: 8,
    },
  calendarDayText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  calendarDayTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
  calendarTodayBtn: {
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  calendarTodayBtnText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#2F5D50',
      fontFamily: 'Inter',
    },
  monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
  monthCell: {
      width: '30%',
      flexGrow: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E2EDEA',
    },
  monthCellActive: {
      backgroundColor: '#2F5D50',
      borderColor: '#2F5D50',
    },
  monthCellText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  monthCellTextActive: {
      color: '#FFFFFF',
    },
  filterMenu: {
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E2EDEA',
      overflow: 'hidden',
      shadowColor: '#0F2D24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
  filterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F3F2',
    },
  filterItemActive: {
      backgroundColor: '#EAF7F1',
    },
  filterItemText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#4A5C57',
      fontFamily: 'Inter',
    },
  filterItemTextActive: {
      color: '#2F5D50',
      fontWeight: '700',
    },
  emptyState: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
  emptyStateText: {
      fontSize: 12.5,
      color: '#B0C0BC',
      fontFamily: 'Inter',
      fontWeight: '600',
    },
  historyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#F7F8F9',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: '#EEF1F0',
    },
  historyIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: '#EAF7F1',
      alignItems: 'center',
      justifyContent: 'center',
    },
  historyTextBlock: {
      flex: 1,
      gap: 2,
    },
  historyCategory: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },
  historyDate: {
      fontSize: 11,
      color: '#8A9994',
      fontFamily: 'Inter',
      fontWeight: '500',
    },
  historyDescription: {
      fontSize: 11,
      color: '#B0C0BC',
      fontFamily: 'Inter',
      fontWeight: '500',
      marginTop: 1,
    },
  historyAmount: {
      fontSize: 13,
      fontWeight: '800',
      color: '#1A2D27',
      fontFamily: 'Inter',
      marginRight: 4,
    },
  historyActions: {
      flexDirection: 'row',
      gap: 6,
    },
  historyActionBtn: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#EEF1F0',
    },
});

// Shared modal styling for the delete confirmation / loading / result states —
// matches the OinkMate modal language already used across the app (e.g. the
// sign-in AuthModal and the delete-expenses confirmation screen).
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(47,93,80,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2D27',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  message: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Inter',
  },
  previewCard: {
    width: '100%',
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    color: '#8A9994',
    marginTop: 8,
    fontFamily: 'Inter',
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F0',
  },
  cancelBtnText: {
    color: '#1A2D27',
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#D96C8D',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  okBtn: {
    width: '100%',
    height: 50,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  okBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15.5,
    fontFamily: 'Inter',
  },
  loadingCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
});