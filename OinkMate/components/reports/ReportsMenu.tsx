import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ReportsMenuProps {
  expenseStat?: string;
  roiStat?: string;
  learningStat?: string;
  onExpenseTrackingPress?: () => void;
  onFinancialAnalysisPress?: () => void;
  onLearningHubPress?: () => void;
}

interface MenuCardConfig {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentBg: string;
  title: string;
  stat: string;
  onPress?: () => void;
}

const ReportsMenu: React.FC<ReportsMenuProps> = ({
  expenseStat = '₱18,450 This Month',
  roiStat = 'ROI 18%',
  learningStat = '12 Articles Available',
  onExpenseTrackingPress,
  onFinancialAnalysisPress,
  onLearningHubPress,
}) => {
  const cards: MenuCardConfig[] = [
    {
      key: 'expense_tracking',
      icon: 'wallet',
      accent: '#2F5D50',
      accentBg: '#EAF7F1',
      title: 'Expense Tracking',
      stat: expenseStat,
      onPress: onExpenseTrackingPress,
    },
    {
      key: 'financial_analysis',
      icon: 'stats-chart',
      accent: '#D96C8D',
      accentBg: '#FBEEF1',
      title: 'Financial Analysis',
      stat: roiStat,
      onPress: onFinancialAnalysisPress,
    },
    {
      key: 'learning_hub',
      icon: 'school',
      accent: '#5B7FB5',
      accentBg: '#EAF0FB',
      title: 'Educational Contents',
      stat: learningStat,
      onPress: onLearningHubPress,
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card) => (
        <TouchableOpacity
          key={card.key}
          style={[styles.card, { borderColor: card.accentBg }]}
          onPress={card.onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={card.title}
        >
          <View style={[styles.iconWrap, { backgroundColor: card.accentBg }]}>
            <Ionicons name={card.icon} size={24} color={card.accent} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>{card.title}</Text>
            <View style={[styles.statBadge, { backgroundColor: card.accentBg }]}>
              <Text style={[styles.statText, { color: card.accent }]}>{card.stat}</Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={card.accent} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.1,
  },
  statBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});

export default ReportsMenu;