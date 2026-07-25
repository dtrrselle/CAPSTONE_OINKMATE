import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TODO: replace with actual farmer/farm data from your auth/profile data source
const FARMER = {
  name: 'Juan Dela Cruz',
  farmName: 'Dela Cruz Piggery',
  location: 'Sta. Maria, Bulacan',
  email: 'juan.delacruz@email.com',
  phone: '+63 912 345 6789',
  memberSince: 'June 2024',
};

// TODO: replace with actual farm statistics
const STATS = [
  { key: 'pigs', icon: 'paw-outline' as const, label: 'Total Pigs', value: '128' },
  { key: 'pens', icon: 'grid-outline' as const, label: 'Active Pens', value: '12' },
  { key: 'days', icon: 'calendar-outline' as const, label: 'Days Active', value: '365' },
];

interface SettingsItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
}

export default function FarmInformation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const settingsItems: SettingsItem[] = [
    {
      key: 'edit-profile',
      icon: 'create-outline',
      label: 'Edit Profile',
      description: 'Update your personal and farm details',
      onPress: () => router.push('/profile/edit-profile'),
    },
    {
      key: 'about',
      icon: 'information-circle-outline',
      label: 'About',
      description: 'App version and information',
      onPress: () => router.push('/profile/about'),
    },
    {
      key: 'help-support',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      description: 'Get assistance or contact us',
      onPress: () => router.push('/profile/help-support'),
    },
  ];

  // TODO: wire to actual logout/auth logic
  const handleLogout = () => {
    console.log('Logout pressed');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={30} color="#2F5D50" />
            </View>

            <View style={styles.profileTextBlock}>
              <Text style={styles.farmerName}>{FARMER.name}</Text>
              <View style={styles.profileMetaRow}>
                <Ionicons name="home-outline" size={13} color="#8A9994" />
                <Text style={styles.profileMetaText}>{FARMER.farmName}</Text>
              </View>
              <View style={styles.profileMetaRow}>
                <Ionicons name="location-outline" size={13} color="#8A9994" />
                <Text style={styles.profileMetaText}>{FARMER.location}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editIconButton}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/edit-profile')}
            >
              <Ionicons name="create-outline" size={16} color="#2F5D50" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color="#8A9994" />
            <Text style={styles.detailText}>{FARMER.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#8A9994" />
            <Text style={styles.detailText}>{FARMER.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#8A9994" />
            <Text style={styles.detailText}>Member since {FARMER.memberSince}</Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <View key={stat.key} style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name={stat.icon} size={18} color="#2F5D50" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings Menu */}
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.settingsCard}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.settingsRow,
                index !== settingsItems.length - 1 && styles.settingsRowDivider,
              ]}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={styles.settingsIconWrap}>
                <Ionicons name={item.icon} size={17} color="#2F5D50" />
              </View>
              <View style={styles.settingsTextBlock}>
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <Text style={styles.settingsDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C3CDC9" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={17} color="#D96C8D" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backBtn: {
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
  headerSpacer: {
    width: 36,
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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },

  /* Profile card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextBlock: {
    flex: 1,
    gap: 3,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    marginBottom: 2,
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileMetaText: {
    fontSize: 12,
    color: '#5C6E69',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12.5,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* Statistics */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '600',
  },

  /* Settings */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -4,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F2',
  },
  settingsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTextBlock: {
    flex: 1,
    gap: 2,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  settingsDescription: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* Logout */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FBEEF1',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F6DCE3',
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
  },

  bottomSpacer: {
    height: 24,
  },
});