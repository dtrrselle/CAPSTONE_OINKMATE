import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// ─── Types ───────────────────────────────────────────────────────────────────
type StatusType = 'Active' | 'Upcoming' | 'Paused';
type PenFilter = 'All Pens' | 'Pen A' | 'Pen B' | 'Pen C';

interface FeedingSchedule {
  id: string;
  pen: string;
  times: string[];
  status: StatusType;
  feedType: string;
  nextFeed: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const SCHEDULES: FeedingSchedule[] = [
  {
    id: '1',
    pen: 'Pen A',
    times: ['08:00 AM', '04:00 PM'],
    status: 'Active',
    feedType: 'Grower Mix',
    nextFeed: '04:00 PM',
  },
  {
    id: '2',
    pen: 'Pen B',
    times: ['08:00 AM', '04:00 PM'],
    status: 'Active',
    feedType: 'Starter Mix',
    nextFeed: '04:00 PM',
  },
  {
    id: '3',
    pen: 'Pen C',
    times: ['08:00 AM', '04:00 PM'],
    status: 'Upcoming',
    feedType: 'Finisher Mix',
    nextFeed: '08:00 AM',
  },
];

const PEN_FILTERS: PenFilter[] = ['All Pens', 'Pen A', 'Pen B', 'Pen C'];

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; dot: string }> = {
  Active:   { bg: '#E8F5F1', text: '#2F7A5E', dot: '#2F7A5E' },
  Upcoming: { bg: '#FFF3E8', text: '#C27A2E', dot: '#E59A50' },
  Paused:   { bg: '#F5F0F7', text: '#7A5A8C', dot: '#9B7AB0' },
};

// ─── Emoji icons for items that don't have Ionicons equivalents ───────────────
const EMOJI = {
  pen:     '🐷',
  filter:  '▾',
};


export default function Feeding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<PenFilter>('All Pens');
  const [filterOpen, setFilterOpen] = useState(false);

  // Restore the status bar to what the tabs/dashboard expect when leaving
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('transparent');
      return () => {
        // When leaving feeding, restore transparent so tabs handle it themselves
        StatusBar.setBarStyle('dark-content');
        StatusBar.setBackgroundColor('transparent');
      };
    }, [])
  );

  const filtered =
    selectedFilter === 'All Pens'
      ? SCHEDULES
      : SCHEDULES.filter((s) => s.pen === selectedFilter);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color="#555" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Feeding Schedule</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Row ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryNum}>{SCHEDULES.length}</Text>
            <Text style={styles.summaryLabel}>Total Pens</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryChip}>
            <Text style={styles.summaryNum}>
              {SCHEDULES.filter((s) => s.status === 'Active').length}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryChip}>
            <Text style={styles.summaryNum}>2×</Text>
            <Text style={styles.summaryLabel}>Daily Feeds</Text>
          </View>
        </View>

        {/* ── Filter ── */}
        <View style={styles.filterRow}>
          <Text style={styles.sectionLabel}>Schedules</Text>
          <View>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setFilterOpen((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterBtnText}>{selectedFilter}</Text>
              <Text style={styles.filterCaret}>{EMOJI.filter}</Text>
            </TouchableOpacity>
            {filterOpen && (
              <View style={styles.dropdown}>
                {PEN_FILTERS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownItem,
                      opt === selectedFilter && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedFilter(opt);
                      setFilterOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        opt === selectedFilter && styles.dropdownTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Schedule Cards ── */}
        {filtered.map((schedule) => {
          const sc = STATUS_CONFIG[schedule.status];
          return (
            <View key={schedule.id} style={styles.card}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="home-outline" size={20} color={GREEN} />
                  <Text style={styles.penName}>{schedule.pen}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {schedule.status}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Feed Type */}
              <View style={styles.feedTypeRow}>
                <Ionicons name="leaf-outline" size={14} color="#8A9BA8" />
                <Text style={styles.feedTypeLabel}>Feed Type</Text>
                <Text style={styles.feedTypeValue}>{schedule.feedType}</Text>
              </View>

              {/* Time Chips */}
              <View style={styles.timesSection}>
                <View style={styles.timesLabelRow}>
                  <Ionicons name="time-outline" size={14} color="#8A9BA8" />
                  <Text style={styles.timesLabel}>Feeding Times</Text>
                </View>
                <View style={styles.chips}>
                  {schedule.times.map((t) => (
                    <View key={t} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Next Feed Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.nextLabel}>Next feed</Text>
                <View style={styles.nextRow}>
                  <Text style={styles.nextTime}>{schedule.nextFeed}</Text>
                  <Ionicons name="arrow-forward" size={13} color={PINK} />
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🐷</Text>
            <Text style={styles.emptyTitle}>No schedules found</Text>
            <Text style={styles.emptyText}>
              No feeding schedule assigned to {selectedFilter} yet.
            </Text>
          </View>
        )}

        {/* ── Future-Ready Section ── */}
        <View style={styles.futureSection}>
          <Text style={styles.futureSectionTitle}>Coming Soon</Text>
          <View style={styles.futureCards}>
            {[
              { icon: 'document-text-outline' as const, label: 'Feeding Logs',      desc: 'Track daily feeding activity' },
              { icon: 'bar-chart-outline'      as const, label: 'Feeding History',   desc: 'Review past records' },
              { icon: 'flash-outline'          as const, label: 'Automated Records', desc: 'IoT-connected feeding data' },
            ].map((f) => (
              <View key={f.label} style={styles.futureCard}>
                <Ionicons name={f.icon} size={24} color="#8A9BA8" />
                <View>
                  <Text style={styles.futureLabel}>{f.label}</Text>
                  <Text style={styles.futureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN  = '#2F5D50';
const PINK   = '#D96C8D';
const BG     = '#F7F8F9';
const WHITE  = '#FFFFFF';
const BORDER = '#E8ECEE';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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
  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2E28',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // Summary Row
  summaryRow: {
    backgroundColor: WHITE,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryChip: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: '800',
    color: GREEN,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8A9BA8',
    marginTop: 2,
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E28',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  filterBtnText: {
    fontSize: 13,
    color: GREEN,
    fontWeight: '600',
  },
  filterCaret: {
    fontSize: 11,
    color: GREEN,
  },
  dropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    minWidth: 130,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 20,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownItemActive: {
    backgroundColor: '#EEF5F2',
  },
  dropdownText: {
    fontSize: 13,
    color: '#4A5C55',
    fontWeight: '500',
  },
  dropdownTextActive: {
    color: GREEN,
    fontWeight: '700',
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  penName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2E28',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
  },

  // Feed type
  feedTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedTypeLabel: {
    fontSize: 12,
    color: '#8A9BA8',
    fontWeight: '500',
    flex: 1,
  },
  feedTypeValue: {
    fontSize: 13,
    color: '#2A3D38',
    fontWeight: '600',
  },

  // Time chips
  timesSection: {
    gap: 8,
  },
  timesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timesLabel: {
    fontSize: 12,
    color: '#8A9BA8',
    fontWeight: '500',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    backgroundColor: '#EEF5F2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#D0E8E0',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    letterSpacing: 0.2,
  },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nextLabel: {
    fontSize: 12,
    color: '#8A9BA8',
    fontWeight: '500',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextTime: {
    fontSize: 13,
    fontWeight: '700',
    color: PINK,
  },
  // Future section
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2E28',
  },
  emptyText: {
    fontSize: 13,
    color: '#8A9BA8',
    textAlign: 'center',
  },

  // Future section
  futureSection: {
    marginTop: 8,
    gap: 10,
  },
  futureSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A9BA8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  futureCards: {
    gap: 8,
  },
  futureCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  futureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5C55',
  },
  futureDesc: {
    fontSize: 11,
    color: '#8A9BA8',
    marginTop: 2,
  },
});