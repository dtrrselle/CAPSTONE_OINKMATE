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

// TODO: update build number from app config / constants
const BUILD_NUMBER = '2026';

const FEATURES = [
  {
    key: 'monitoring',
    icon: 'leaf-outline' as const,
    title: 'Environment Monitoring',
    description: 'Real-time temperature, humidity, and air quality tracking.',
  },
  {
    key: 'schedule',
    icon: 'calendar-outline' as const,
    title: 'Smart Scheduling',
    description: 'Automated feeding and sanitation schedule management.',
  },
  {
    key: 'expenses',
    icon: 'cash-outline' as const,
    title: 'Expense Tracking',
    description: 'Monitor farm costs and generate financial reports.',
  },
  {
    key: 'alerts',
    icon: 'notifications-outline' as const,
    title: 'Instant Alerts',
    description: 'Get notified immediately on critical farm events.',
  },
];

export default function About() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>About</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Name */}
        <View style={styles.appNameBlock}>
          <Text style={styles.appName}>OinkMate</Text>
          <Text style={styles.appTagline}>Smart Piggery Management</Text>
        </View>

        {/* Short description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            OinkMate helps Filipino hog farmers manage their operations efficiently —
            from monitoring pen conditions to scheduling feeds and tracking farm costs,
            all in one app.
          </Text>
          <View style={styles.buildRow}>
            <Ionicons name="layers-outline" size={12} color="#2F5D50" />
            <Text style={styles.buildText}>Build {BUILD_NUMBER}</Text>
          </View>
        </View>

        {/* Features */}
        <Text style={styles.sectionLabel}>Key Features</Text>
        <View style={styles.featuresCard}>
          {FEATURES.map((feature, index) => (
            <View key={feature.key}>
              <View style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={feature.icon} size={17} color="#2F5D50" />
                </View>
                <View style={styles.featureTextBlock}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              </View>
              {index < FEATURES.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* Legal footer */}
        <Text style={styles.legalText}>
          © 2024 OinkMate. All rights reserved.{'\n'}
          Designed for Philippine hog farmers.
        </Text>

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

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
    alignItems: 'stretch',
  },

  /* App name */
  appNameBlock: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2B22',
    letterSpacing: -0.3,
    fontFamily: 'Inter',
  },
  appTagline: {
    fontSize: 12.5,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* Description */
  descriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 20,
  },
  buildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buildText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -4,
  },

  /* Features */
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextBlock: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  featureDescription: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 15,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
    marginHorizontal: 16,
  },

  legalText: {
    fontSize: 11,
    color: '#B0BCB9',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 17,
    fontWeight: '500',
  },

  bottomSpacer: { height: 24 },
});