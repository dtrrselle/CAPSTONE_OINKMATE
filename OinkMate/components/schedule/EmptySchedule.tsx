import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyScheduleProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  onAddPress?: () => void;
}

const EmptySchedule: React.FC<EmptyScheduleProps> = ({
  title = 'No Schedules Yet',
  subtitle = 'Start by creating your first feeding or sanitation schedule.',
  buttonLabel = 'Add Schedule',
  onAddPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.illustrationWrapper}>
        <Ionicons name="calendar-outline" size={40} color="#2F5D50" />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TouchableOpacity style={styles.addButton} onPress={onAddPress} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>{buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  illustrationWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D8EAE4',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2F5D50',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});

export default EmptySchedule;