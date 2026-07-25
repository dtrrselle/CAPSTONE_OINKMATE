import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ScheduleType = 'feeding' | 'sanitation';

interface ScheduleTypeTabsProps {
  selectedTab: ScheduleType;
  onChange: (tab: ScheduleType) => void;
}

const ScheduleTypeTabs: React.FC<ScheduleTypeTabsProps> = ({ selectedTab, onChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'feeding' && styles.tabSelected]}
        onPress={() => onChange('feeding')}
        activeOpacity={0.85}
      >
        <Ionicons
          name="restaurant-outline"
          size={16}
          color={selectedTab === 'feeding' ? '#FFFFFF' : '#6B8A82'}
        />
        <Text style={[styles.tabText, selectedTab === 'feeding' && styles.tabTextSelected]}>
          Feeding
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'sanitation' && styles.tabSelected]}
        onPress={() => onChange('sanitation')}
        activeOpacity={0.85}
      >
        <Ionicons
          name="water-outline"
          size={16}
          color={selectedTab === 'sanitation' ? '#FFFFFF' : '#6B8A82'}
        />
        <Text style={[styles.tabText, selectedTab === 'sanitation' && styles.tabTextSelected]}>
          Sanitation
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F2',
    borderRadius: 18,
    padding: 4,
    marginHorizontal: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },
  tabSelected: {
    backgroundColor: '#2F5D50',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B8A82',
    fontFamily: 'Inter',
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
});

export default ScheduleTypeTabs;