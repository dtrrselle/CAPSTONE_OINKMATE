import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AutoComputedItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  amount: string;
  note: string;
}

interface SystemGeneratedExpensesProps {
  items: AutoComputedItem[];
}

export default function SystemGeneratedExpenses({ items }: SystemGeneratedExpensesProps) {
  return (
    <View style={styles.autoCard}>
      <View style={styles.cardLabelRow}>
        <Ionicons name="hardware-chip-outline" size={15} color="#2F5D50" />
        <Text style={styles.cardLabel}>System Generated Expenses</Text>
      </View>

      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View key={item.key} style={styles.autoRow}>
            <View style={styles.autoIconWrap}>
              <Ionicons name={item.icon} size={16} color="#D96C8D" />
            </View>
            <View style={styles.autoTextBlock}>
              <View style={styles.autoTopRow}>
                <Text style={styles.autoLabel}>{item.label}</Text>
                <View style={styles.autoBadge}>
                  <Text style={styles.autoBadgeText}>Auto Computed</Text>
                </View>
              </View>
              <Text style={styles.autoAmount}>{item.amount}</Text>
              <Text style={styles.autoNote}>{item.note}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  /* System generated card — visually separated highlight style */
  autoCard: {
    backgroundColor: '#FBEEF1',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F6DCE3',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
  },
  autoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FBEEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoTextBlock: {
    flex: 1,
    gap: 3,
  },
  autoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  autoAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  autoNote: {
    fontSize: 10.5,
    color: '#A0707D',
    fontFamily: 'Inter',
    fontStyle: 'italic',
  },
  autoBadge: {
    backgroundColor: '#FBEEF1',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  autoBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
  },
});