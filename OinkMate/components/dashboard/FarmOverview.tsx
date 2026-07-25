import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FarmStat {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: number | string;
  subtitle: string;
  accentColor: string;
  iconBg: string;
}

interface StatCardProps extends FarmStat {
  cardWidth: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  value,
  subtitle,
  accentColor,
  iconBg,
  cardWidth,
}) => (
  <View style={[styles.card, { width: cardWidth, borderColor: accentColor + '30' }]}>
    <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={20} color={accentColor} />
    </View>
    <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    <View style={[styles.bottomBar, { backgroundColor: accentColor + '25' }]}>
      <View style={[styles.bottomBarFill, { backgroundColor: accentColor }]} />
    </View>
  </View>
);

interface FarmOverviewProps {
  totalPigPens?: number;
  totalPigs?: number;
  activePens?: number;
}

const FarmOverview: React.FC<FarmOverviewProps> = ({
  totalPigPens = 0,
  totalPigs = 0,
  activePens = 0,
}) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.max((width - 40 - 20) / 3, 100);

  // Same three cards as before — only the `value` now comes from the database
  // instead of being hardcoded.
  const farmStats: FarmStat[] = [
    {
      icon: 'grid',
      title: 'Pig Pens',
      value: totalPigPens,
      subtitle: 'Registered',
      accentColor: '#2F5D50',
      iconBg: '#EAF7EF',
    },
    {
      icon: 'paw',
      title: 'Total Pigs',
      value: totalPigs,
      subtitle: 'All Pens',
      accentColor: '#C2547A',
      iconBg: '#FDEDF3',
    },
    {
      icon: 'checkmark-circle',
      title: 'Active',
      value: activePens,
      subtitle: 'Currently',
      accentColor: '#2F5D50',
      iconBg: '#EAF7EF',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Farm Overview</Text>
      <View style={styles.row}>
        {farmStats.map((stat) => (
          <StatCard key={stat.title} {...stat} cardWidth={cardWidth} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: '#F4F6F5',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
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
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2D27',
    marginTop: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '400',
    color: '#A0AAB3',
    marginTop: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  bottomBar: {
    width: '80%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bottomBarFill: {
    height: '100%',
    width: '70%',
    borderRadius: 2,
  },
});

export default FarmOverview;