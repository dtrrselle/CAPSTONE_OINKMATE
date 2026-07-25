import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScheduleHeaderProps {
  brandName?: string;
  title?: string;
  subtitle?: string;
  onAddSchedulePress?: () => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  brandName = 'OinkMate',
  title = 'Schedules',
  subtitle = 'Manage feeding and sanitation schedules',
  onAddSchedulePress,
}) => {
  return (
    <View style={styles.container}>
      {/* Top row: logo left, Add Schedule right */}
      <View style={styles.topRow}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddSchedulePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add Schedule"
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Title + subtitle */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 6,
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  logoImage: {
    width: 52,
    height: 52,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2F5D50',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#2F5D50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter',
  },

  titleBlock: {
    marginTop: -2,
    gap: 0,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2D27',
    letterSpacing: -0.4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
});

export default ScheduleHeader;