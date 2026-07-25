import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PeriodKey = 'today' | 'week' | 'month' | 'year';

interface OverviewStat {
  key: PeriodKey;
  label: string;
  value: string;
}

interface ExpenseOverviewProps {
  stats: OverviewStat[];
  loading?: boolean;
}

export default function ExpenseOverview({ stats, loading = false }: ExpenseOverviewProps) {
  return (
    <View style={styles.overviewGrid}>
      {stats.map((stat) => (
        <View key={stat.key} style={styles.overviewBox}>
          <Text style={styles.overviewLabel}>{stat.label}</Text>
          <Text style={styles.overviewValue}>{loading ? '···' : stat.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewBox: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  overviewValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
});