import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PenFilterOption {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface PenFilterProps {
  options?: PenFilterOption[];
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
}

// Filter chips. "All Pens", "Creep", "Pre-Starter", "Starter", "Grower", and
// "Finisher" represent Growth Stage values returned by the backend
// Recommendation Engine (feeding_reference.csv) via pen.growthStage.
// "Environmental Alert" is a separate, sensor-based filter and is
// unaffected by this change.
const DEFAULT_OPTIONS: PenFilterOption[] = [
  { id: 'all', label: 'All Pens' },
  { id: 'creep', label: 'Creep' },
  { id: 'pre-starter', label: 'Pre-Starter' },
  { id: 'starter', label: 'Starter' },
  { id: 'grower', label: 'Grower' },
  { id: 'finisher', label: 'Finisher' },
  { id: 'alert', label: 'Environmental Alert', icon: 'notifications-outline' },
];

const PenFilter: React.FC<PenFilterProps> = ({
  options = DEFAULT_OPTIONS,
  defaultSelectedId = 'all',
  onSelect,
}) => {
  const [selectedId, setSelectedId] = useState(defaultSelectedId);

  const handlePress = (id: string) => {
    setSelectedId(id);
    onSelect?.(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => handlePress(option.id)}
            activeOpacity={0.8}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={13}
                color={isSelected ? '#FFFFFF' : '#6B8A82'}
                style={styles.chipIcon}
              />
            )}
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2EDEA',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#2F5D50',
    borderColor: '#2F5D50',
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B8A82',
    fontFamily: 'Inter',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

export default PenFilter;