import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FinancialInsights() {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIconWrap}>
        <Ionicons name="trending-up-outline" size={20} color="#2F5D50" />
      </View>
      <View style={styles.insightTextBlock}>
        <Text style={styles.insightTitle}>Financial Insights</Text>
        <Text style={styles.insightText}>
          ROI, cost-benefit analysis, profit estimation, and payback period
          tracking will appear here in future updates.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  insightCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EAF7F1',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8EAE4',
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTextBlock: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  insightText: {
    fontSize: 12,
    color: '#4A5C57',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
});