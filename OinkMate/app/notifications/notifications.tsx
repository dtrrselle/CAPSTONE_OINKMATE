import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterKey = 'all' | 'unread' | 'read';
type NotificationType =
  | 'feed'
  | 'temperature'
  | 'ammonia'
  | 'water'
  | 'sanitation'
  | 'schedule'
  | 'system';

interface NotificationItem {
  key: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  group: 'Today' | 'Yesterday' | 'Earlier This Week';
}

const TYPE_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  feed: 'restaurant-outline',
  temperature: 'thermometer-outline',
  ammonia: 'cloud-outline',
  water: 'water-outline',
  sanitation: 'brush-outline',
  schedule: 'calendar-outline',
  system: 'information-circle-outline',
};

// Dummy notification data — backend integration deferred
const NOTIFICATIONS: NotificationItem[] = [
  {
    key: 'n1',
    type: 'feed',
    title: 'Feed Level Low',
    description: 'Feed container in Pen 2 is below 20%.',
    timestamp: '2 mins ago',
    isRead: false,
    group: 'Today',
  },
  {
    key: 'n2',
    type: 'temperature',
    title: 'High Temperature Detected',
    description: 'Temperature reached 32°C in Pen 5.',
    timestamp: '15 mins ago',
    isRead: false,
    group: 'Today',
  },
  {
    key: 'n3',
    type: 'ammonia',
    title: 'Ammonia Level Rising',
    description: 'Ammonia concentration in Pen 3 needs monitoring.',
    timestamp: '48 mins ago',
    isRead: false,
    group: 'Today',
  },
  {
    key: 'n4',
    type: 'schedule',
    title: 'Feeding Schedule Completed',
    description: 'Morning feeding was successfully dispensed.',
    timestamp: '1 hour ago',
    isRead: true,
    group: 'Today',
  },
  {
    key: 'n5',
    type: 'water',
    title: 'Water Usage Spike',
    description: 'Water consumption in Pen 1 is higher than usual.',
    timestamp: 'Yesterday, 6:40 PM',
    isRead: true,
    group: 'Yesterday',
  },
  {
    key: 'n6',
    type: 'sanitation',
    title: 'Sanitation Task Due',
    description: 'Pen 4 cleaning schedule is due today.',
    timestamp: 'Yesterday, 9:15 AM',
    isRead: true,
    group: 'Yesterday',
  },
  {
    key: 'n7',
    type: 'system',
    title: 'System Status Normal',
    description: 'All sensors are reporting normally.',
    timestamp: 'Monday, 7:00 AM',
    isRead: true,
    group: 'Earlier This Week',
  },
];

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

const GROUP_ORDER: NotificationItem['group'][] = ['Today', 'Yesterday', 'Earlier This Week'];

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterKey>('all');

  const unreadCount = NOTIFICATIONS.filter((n) => !n.isRead).length;

  const filtered = NOTIFICATIONS.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: filtered.filter((n) => n.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header — official OinkMate inner-screen header standard (Environment Monitoring pattern) */}
      <View style={styles.header}>
        {/* Back button — top left */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>

        {/* Logo + Title stacked center */}
        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {/* Spacer to balance back button */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter tabs */}
        <View style={styles.segmentedControl}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segment, filter === tab.key && styles.segmentActive]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, filter === tab.key && styles.segmentTextActive]}>
                {tab.label}
                {tab.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notification list */}
        {grouped.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={28} color="#B0C0BC" />
            </View>
            <Text style={styles.emptyTitle}>No Notifications Yet</Text>
            <Text style={styles.emptySubtitle}>You're all caught up.</Text>
          </View>
        ) : (
          grouped.map(({ group, items }) => (
            <View key={group} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group}</Text>
              <View style={{ gap: 10 }}>
                {items.map((item) => (
                  <View
                    key={item.key}
                    style={[
                      styles.notifCard,
                      !item.isRead && styles.notifCardUnread,
                    ]}
                  >
                    <View
                      style={[
                        styles.notifIconWrap,
                        !item.isRead && styles.notifIconWrapUnread,
                      ]}
                    >
                      <Ionicons
                        name={TYPE_ICONS[item.type]}
                        size={17}
                        color={!item.isRead ? '#2F5D50' : '#8A9994'}
                      />
                    </View>

                    <View style={styles.notifTextBlock}>
                      <View style={styles.notifTopRow}>
                        <Text
                          style={[
                            styles.notifTitle,
                            !item.isRead && styles.notifTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.notifDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                      <View style={styles.notifBottomRow}>
                        <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            !item.isRead && styles.statusBadgeUnread,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              !item.isRead && styles.statusBadgeTextUnread,
                            ]}
                          >
                            {item.isRead ? 'Read' : 'Unread'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  /* Header — exact match to Environment Monitoring header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2EDEA',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B22',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 18,
  },

  /* Filter tabs */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: '#2F5D50',
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  /* Date group */
  groupBlock: {
    gap: 10,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A9994',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* Notification card */
  notifCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  notifCardUnread: {
    backgroundColor: '#EAF7F1',
    borderColor: '#D8EAE4',
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F7F8F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconWrapUnread: {
    backgroundColor: '#FFFFFF',
  },
  notifTextBlock: {
    flex: 1,
    gap: 3,
  },
  notifTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: '#1A2D27',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D96C8D',
  },
  notifDescription: {
    fontSize: 12,
    color: '#6B7975',
    fontFamily: 'Inter',
    lineHeight: 17,
  },
  notifBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  notifTimestamp: {
    fontSize: 10.5,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#F0F3F2',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  statusBadgeUnread: {
    backgroundColor: '#FBEEF1',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
  statusBadgeTextUnread: {
    color: '#D96C8D',
  },

  /* Empty state */
  emptyState: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2EDEA',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  bottomSpacer: {
    height: 32,
  },
});