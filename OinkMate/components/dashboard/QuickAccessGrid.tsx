import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickAccessItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor: string;
  iconBg: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
// All ordinary Quick Access icons share the same primary GREEN accent for
// visual consistency — only status indicators elsewhere keep semantic colors.

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: 'pig-pens',
    icon: 'grid-outline',
    title: 'Pig Pens',
    description: 'Manage pens',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
  {
    id: 'environment',
    icon: 'leaf-outline',
    title: 'Environment',
    description: 'Live monitoring',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
  {
    id: 'feeding',
    icon: 'restaurant-outline',
    title: 'Feeding',
    description: 'View schedules',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
  {
    id: 'sanitation',
    icon: 'brush-outline',
    title: 'Sanitation',
    description: 'View schedules',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
  {
    id: 'expenses',
    icon: 'cash-outline',
    title: 'Expenses',
    description: 'Track farm costs',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
  {
    id: 'learning-center',
    icon: 'book-outline',
    title: 'Learning Center',
    description: 'Guides & tips',
    accentColor: '#2F5D50',
    iconBg: '#EAF7EF',
  },
];

// ─── Card ─────────────────────────────────────────────────────────────────────

const GridCard: React.FC<{
  item: QuickAccessItem;
  cardWidth: number;
  onPress: () => void;
}> = ({
  item,
  cardWidth,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    style={[
      styles.card,
      { width: cardWidth, borderColor: item.accentColor + '30' },
    ]}
  >
    {/* Icon */}
    <View style={[styles.iconBadge, { backgroundColor: item.iconBg }]}>
      <Ionicons
        name={item.icon}
        size={22}
        color={item.accentColor}
      />
    </View>

    {/* Text */}
    <View style={styles.textBlock}>
      <Text style={styles.cardTitle}>
        {item.title}
      </Text>

      <Text style={styles.cardDescription}>
        {item.description}
      </Text>
    </View>

    {/* Arrow */}
    <View
      style={[
        styles.arrowChip,
        { backgroundColor: item.accentColor + '14' },
      ]}
    >
      <Ionicons
        name="chevron-forward"
        size={14}
        color={item.accentColor}
      />
    </View>
  </TouchableOpacity>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const QuickAccessGrid: React.FC = () => {
  const router = useRouter();

  const { width } = useWindowDimensions();
  const cardWidth = (width - 40 - 12) / 2;

  const handleNavigation = (id: string) => {
    switch (id) {
      case 'pig-pens':
        router.push('/pig-pens');
        break;

      case 'environment':
        router.push('/environment/environment');
        break;

          case 'feeding':
        router.push({
          pathname: '/schedule',
          params: { tab: 'feeding' },
        } as any);
        break;

      case 'sanitation':
        router.push({
          pathname: '/schedule',
          params: { tab: 'sanitation' },
        } as any);
        break;

      case 'expenses':
        router.push('/expenses/expenses');
        break;

      case 'learning-center':
        router.push('/learning/learning-hub');
        break;

      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>
        Quick Access
      </Text>

      <View style={styles.grid}>
        {QUICK_ACCESS_ITEMS.map((item) => (
          <GridCard
            key={item.id}
            item={item}
            cardWidth={cardWidth}
            onPress={() =>
              handleNavigation(item.id)
            }
          />
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
    paddingBottom: 20,
    backgroundColor: '#F4F6F5',
  },

  sectionLabel: {
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: '700',
    color: '#8B9693',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 136,
    borderWidth: 1,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  textBlock: {
    flex: 1,
    gap: 3,
    marginBottom: 12,
  },

  cardTitle: {
    fontFamily: 'Arial',
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2D27',
  },

  cardDescription: {
    fontFamily: 'Arial',
    fontSize: 12,
    fontWeight: '400',
    color: '#8B9693',
    lineHeight: 16,
  },

  arrowChip: {
    alignSelf: 'flex-end',
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default QuickAccessGrid;