import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SummaryCardData {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
}

interface PigSummaryCardsProps {
  totalPens?: number;
  totalPigs?: number;
  creepPens?: number;
  preStarterPens?: number;
  starterPens?: number;
  growerPens?: number;
  finisherPens?: number;
}

// Total Pens and Total Pigs come straight from the database. Creep,
// Pre-Starter, Starter, Grower, and Finisher counts come from the backend
// Recommendation Engine (feeding_reference.csv) via pen.growthStage — no
// values are hardcoded here anymore, so callers must pass real counts.
const PigSummaryCards: React.FC<PigSummaryCardsProps> = ({
  totalPens = 0,
  totalPigs = 0,
  creepPens = 0,
  preStarterPens = 0,
  starterPens = 0,
  growerPens = 0,
  finisherPens = 0,
}) => {
  const topCards: SummaryCardData[] = [
    {
      icon: 'home-outline',
      label: 'Total Pens',
      value: totalPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      icon: 'paw-outline',
      label: 'Total Pigs',
      value: totalPigs,
      iconColor: '#D96C8D',
      iconBg: '#FBEEF1',
    },
  ];

  const stageRowOneCards: SummaryCardData[] = [
    {
      icon: 'egg-outline',
      label: 'Creep Pens',
      value: creepPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      icon: 'sparkles-outline',
      label: 'Pre-Starter Pens',
      value: preStarterPens,
      iconColor: '#D96C8D',
      iconBg: '#FBEEF1',
    },
    {
      icon: 'rocket-outline',
      label: 'Starter Pens',
      value: starterPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
  ];

  const stageRowTwoCards: SummaryCardData[] = [
    {
      icon: 'leaf-outline',
      label: 'Grower Pens',
      value: growerPens,
      iconColor: '#D96C8D',
      iconBg: '#FBEEF1',
    },
    {
      icon: 'trending-up-outline',
      label: 'Finisher Pens',
      value: finisherPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {topCards.map((card) => (
          <View key={card.label} style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: card.iconBg }]}>
              <Ionicons name={card.icon} size={16} color={card.iconColor} />
            </View>
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.row, styles.bottomRow]}>
        {stageRowOneCards.map((card) => (
          <View key={card.label} style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: card.iconBg }]}>
              <Ionicons name={card.icon} size={16} color={card.iconColor} />
            </View>
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.row, styles.bottomRow]}>
        {stageRowTwoCards.map((card) => (
          <View key={card.label} style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: card.iconBg }]}>
              <Ionicons name={card.icon} size={16} color={card.iconColor} />
            </View>
            <Text style={styles.value}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  bottomRow: {
    marginTop: 0,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
});

export default PigSummaryCards;