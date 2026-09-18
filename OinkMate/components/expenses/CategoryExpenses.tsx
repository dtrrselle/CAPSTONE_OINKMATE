import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PeriodKey = 'today' | 'week' | 'month' | 'year';

interface CategoryAmount {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
}

interface CategoryExpensesProps {
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  periodTabs: { key: PeriodKey; label: string }[];
  categories: CategoryAmount[];
  periodLabel: string;
  loading?: boolean;
}

export default function CategoryExpenses({
  period,
  onPeriodChange,
  periodTabs,
  categories,
  periodLabel,
  loading = false,
}: CategoryExpensesProps) {
  return (
    <>
      {/* SECTION 3 — Period Filter (placed above category list since it controls it) */}
      <View style={styles.segmentedControl}>
        {periodTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.segment, period === tab.key && styles.segmentActive]}
            onPress={() => onPeriodChange(tab.key)}
            activeOpacity={0.85}
          >
            <Text style={[styles.segmentText, period === tab.key && styles.segmentTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SECTION 2 — Category Expenses */}
      <View style={styles.card}>
        <View style={styles.cardLabelRow}>
          <Ionicons name="list-outline" size={15} color="#2F5D50" />
          <Text style={styles.cardLabel}>Category Expenses</Text>
        </View>
        <Text style={styles.periodLabel}>{periodLabel}</Text>

        <View>
          {categories.map((cat, index) => (
            <View key={cat.key}>
              <View style={styles.categoryListRow}>
                <View style={styles.categoryListLeft}>
                  <View style={styles.categoryListIconWrap}>
                    <Ionicons name={cat.icon} size={15} color="#2F5D50" />
                  </View>
                  <Text style={styles.categoryListLabel}>{cat.label}</Text>
                </View>
                <Text style={[styles.categoryListAmount, loading && styles.categoryListAmountLoading]}>
                  {loading ? '···' : cat.amount}
                </Text>
              </View>
              {index < categories.length - 1 && <View style={styles.categoryListDivider} />}
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  /* Period segmented control — standalone, sits above Category Expenses */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: '#EEF1F0',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: '#2F5D50',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B8A82',
    fontFamily: 'Inter',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  /* Card */
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
  periodLabel: {
    marginTop: -2,
    fontSize: 12,
    fontWeight: '600',
    color: '#8A9994',
    fontFamily: 'Inter',
  },

  /* Category list (clean row style, no big cards) */
  categoryListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  categoryListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryListIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryListLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  categoryListAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  categoryListAmountLoading: {
    opacity: 0.4,
  },
  categoryListDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
  },
});