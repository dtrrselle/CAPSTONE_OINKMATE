import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface SummaryCardData {
  icon?: keyof typeof Ionicons.glyphMap;
  mcIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  emoji?: string;
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
//
// Total Pigs uses MaterialCommunityIcons' "pig" glyph (same family as
// Ionicons within @expo/vector-icons) so it visually matches the Dashboard's
// Total Pigs icon. Total Pens keeps its own grid icon representing
// pens/structure. The five growth-stage cards below are intentionally
// icon-less — they previously repeated the same pig icon on every card,
// which was redundant.
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
      icon: 'grid-outline',
      label: 'Total Pens',
      value: totalPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      mcIcon: 'pig',
      label: 'Total Pigs',
      value: totalPigs,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
  ];

  // Growth-stage cards intentionally have no icon field — see note above.
  const stageRowOneCards: SummaryCardData[] = [
    {
      label: 'Creep Pens',
      value: creepPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      label: 'Pre-Starter Pens',
      value: preStarterPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      label: 'Starter Pens',
      value: starterPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
  ];

  const stageRowTwoCards: SummaryCardData[] = [
    {
      label: 'Grower Pens',
      value: growerPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
    {
      label: 'Finisher Pens',
      value: finisherPens,
      iconColor: '#2F5D50',
      iconBg: '#EAF7F1',
    },
  ];

  const renderCard = (card: SummaryCardData) => {
    const hasIcon = Boolean(card.mcIcon || card.emoji || card.icon);
    return (
      <View key={card.label} style={styles.card}>
        {hasIcon && (
          <View style={[styles.iconCircle, { backgroundColor: card.iconBg }]}>
            {card.mcIcon ? (
              <MaterialCommunityIcons name={card.mcIcon} size={17} color={card.iconColor} />
            ) : card.emoji ? (
              <Text style={styles.iconEmoji}>{card.emoji}</Text>
            ) : (
              card.icon && <Ionicons name={card.icon} size={17} color={card.iconColor} />
            )}
          </View>
        )}
        <Text style={styles.value}>{card.value}</Text>
        <Text style={styles.label}>{card.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {topCards.map(renderCard)}
      </View>

      <View style={[styles.row, styles.bottomRow]}>
        {stageRowOneCards.map(renderCard)}
      </View>

      <View style={[styles.row, styles.bottomRow]}>
        {stageRowTwoCards.map(renderCard)}
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
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 17,
    lineHeight: 19,
  },
  value: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5F6D69',
    fontFamily: 'Arial',
  },
});

export default PigSummaryCards;