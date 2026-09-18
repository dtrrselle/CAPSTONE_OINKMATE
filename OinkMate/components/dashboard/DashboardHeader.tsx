import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DashboardHeaderProps {
  farmerName?: string;
  greeting?: string;
  currentDate?: string;
  currentTime?: string;
  unreadCount?: number;
  onNotificationPress?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  farmerName = 'Mang Pedro',
  greeting = 'Good Morning',
  currentDate = 'Friday, June 26, 2026',
  currentTime = '5:42 AM',
  unreadCount = 3,
  onNotificationPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Left Section */}
      <View style={styles.leftSection}>

        {/* Logo + Welcome Row */}
        <View style={styles.topRow}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.greetingBlock}>
            <Text style={styles.welcomeText}>
              Welcome, <Text style={styles.farmerName}>{farmerName}</Text>
            </Text>
            {/* Date & Time Chip */}
            <View style={styles.dateTimeChip}>
              <Ionicons name="calendar-outline" size={12} color="#2F5D50" />
              <Text
                style={styles.dateText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {currentDate}
              </Text>
              <View style={styles.timeDivider} />
              <Ionicons name="time-outline" size={12} color="#2F5D50" />
              <Text style={styles.timeText}>{currentTime}</Text>
            </View>
          </View>
        </View>

      </View>

      {/* Right: Bell */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.notifButton}
          onPress={onNotificationPress}
          activeOpacity={0.75}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Ionicons name="notifications" size={20} color="#2F5D50" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  leftSection: {
    flex: 1,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  logoImage: {
    width: 52,
    height: 52,
  },

  greetingBlock: {
    flex: 1,
    gap: 6,
  },

  welcomeText: {
    fontFamily: 'Arial',
    fontSize: 17,
    fontWeight: '500',
    color: '#5F6D69',
    letterSpacing: 0.1,
  },

  farmerName: {
    fontFamily: 'Arial',
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2D27',
  },

  /* Date chip */
  dateTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8F6',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2EDEA',
    maxWidth: '100%',
  },
  dateText: {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#5F6D69',
    fontWeight: '500',
    flexShrink: 1,
  },
  timeDivider: {
    width: 1,
    height: 10,
    backgroundColor: '#C8D8D4',
    marginHorizontal: 2,
  },
  timeText: {
    fontFamily: 'Arial',
    fontSize: 12,
    color: '#2F5D50',
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 0,
  },

  /* Bell */
  rightSection: {
    paddingLeft: 10,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#F4F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2EDEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontFamily: 'Arial',
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 13,
  },
});

export default DashboardHeader;