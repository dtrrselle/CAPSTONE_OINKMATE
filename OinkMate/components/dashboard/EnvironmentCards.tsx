import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusLevel = 'normal' | 'warning' | 'critical';

interface EnvironmentCard {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  unit: string;
  status: StatusLevel;
  statusLabel: string;
  trendLabel: string;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  StatusLevel,
  { dot: string; text: string; bg: string; barColor: string; iconBg: string }
> = {
  normal:   { dot: '#34C759', text: '#28A745', bg: '#EAF7EF', barColor: '#34C759', iconBg: '#D6F0DF' },
  warning:  { dot: '#FF9500', text: '#C97A00', bg: '#FFF4E0', barColor: '#FF9500', iconBg: '#FFE8B0' },
  critical: { dot: '#E53935', text: '#C62828', bg: '#FFF0F0', barColor: '#E53935', iconBg: '#FFCDD2' },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const ENVIRONMENT_CARDS: EnvironmentCard[] = [
  {
    id: 'temperature',
    icon: 'thermometer',
    title: 'Temperature',
    value: '32',
    unit: '°C',
    status: 'normal',
    statusLabel: 'Normal',
    trendLabel: 'Optimal',
  },
  {
    id: 'humidity',
    icon: 'water',
    title: 'Humidity',
    value: '78',
    unit: '%',
    status: 'normal',
    statusLabel: 'Normal',
    trendLabel: 'Stable',
  },
  {
    id: 'ammonia',
    icon: 'cloud',
    title: 'Ammonia',
    value: '18',
    unit: 'ppm',
    status: 'warning',
    statusLabel: 'Warning',
    trendLabel: 'Rising',
  },
];

// ─── Card ─────────────────────────────────────────────────────────────────────

const EnvCard: React.FC<{ card: EnvironmentCard; cardWidth: number }> = ({ card, cardWidth }) => {
  const cfg = STATUS_CONFIG[card.status];

  return (
    <View style={[styles.card, { width: cardWidth, borderColor: cfg.barColor + '40' }]}>
      {/* Top accent bar */}
      <View style={[styles.accentBar, { backgroundColor: cfg.barColor }]} />

      {/* Icon */}
      <View style={[styles.iconBadge, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={card.icon} size={20} color={cfg.text} />
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{card.title}</Text>

      {/* Value + Unit */}
      <View style={styles.valueRow}>
        <Text style={[styles.cardValue, { color: cfg.text }]}>{card.value}</Text>
        <Text style={[styles.cardUnit, { color: cfg.dot }]}>{card.unit}</Text>
      </View>

      {/* Status pill */}
      <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
        <Text style={[styles.statusText, { color: cfg.text }]}>{card.statusLabel}</Text>
      </View>

      {/* Trend */}
      <Text style={styles.trendText}>{card.trendLabel}</Text>
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const EnvironmentCards: React.FC = () => {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 40 - 20) / 3;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Live Environment</Text>
        <View style={styles.liveBadge}>
          <View style={styles.livePulse} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>
      <View style={styles.row}>
        {ENVIRONMENT_CARDS.map((card) => (
          <EnvCard key={card.id} card={card} cardWidth={cardWidth} />
        ))}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: '#F4F6F5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EAF7EF',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2F5D50',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingBottom: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  accentBar: {
    width: '100%',
    height: 4,
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0AAB3',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  cardUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 7,
    gap: 4,
    marginBottom: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '400',
    color: '#B0B8BF',
    textAlign: 'center',
  },
});

export default EnvironmentCards;