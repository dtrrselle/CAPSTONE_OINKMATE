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
              <Ionicons name="calendar-outline" size={11} color="#6B8A82" />
              <Text style={styles.dateText}>{currentDate}</Text>
              <View style={styles.timeDivider} />
              <Ionicons name="time-outline" size={11} color="#2F5D50" />
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
          <Ionicons name="notifications" size={22} color="#2F5D50" />
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
    gap: 5,
  },

  welcomeText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B8A82',
    letterSpacing: 0.1,
  },

  farmerName: {
    fontSize: 15,
    fontWeight: '800',
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
  },
  dateText: {
    fontSize: 10,
    color: '#6B8A82',
    fontWeight: '500',
  },
  timeDivider: {
    width: 1,
    height: 9,
    backgroundColor: '#C8D8D4',
    marginHorizontal: 2,
  },
  timeText: {
    fontSize: 10,
    color: '#2F5D50',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Bell */
  rightSection: {
    paddingLeft: 12,
  },
  notifButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
    top: 8,
    right: 8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 12,
  },
});

export default DashboardHeader;