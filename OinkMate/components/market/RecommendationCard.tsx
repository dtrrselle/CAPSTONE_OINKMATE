import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Recommendation {
  status: string;
  badgeColor: string;
  reasons: string[];
}

interface Props {
  recommendation: Recommendation;
}

const BADGE_COLORS: Record<string, { dot: string; border: string; shadow: string; icon: string }> = {
  green: {
    dot: '#3FAE5C',
    border: '#2F5D50',
    shadow: '#2F5D50',
    icon: '#2F5D50',
  },
  orange: {
    dot: '#E38B29',
    border: '#C97B2E',
    shadow: '#C97B2E',
    icon: '#C97B2E',
  },
};

export default function RecommendationCard({ recommendation }: Props) {
  const colors = BADGE_COLORS[recommendation.badgeColor] ?? BADGE_COLORS.green;

  return (
    <View style={[styles.card, { borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: colors.dot }]} />
        <Text style={styles.badgeText}>{recommendation.status}</Text>
      </View>

      <View style={styles.reasonsList}>
        {recommendation.reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.icon} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  reasonsList: {
    gap: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#3A3A3A',
    fontFamily: 'Inter',
    flexShrink: 1,
  },
});