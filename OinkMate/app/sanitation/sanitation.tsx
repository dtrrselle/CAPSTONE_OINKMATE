import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// ─── Types ───────────────────────────────────────────────────────────────────
type StatusType = 'Active' | 'Upcoming' | 'Paused';
type PenFilter = 'All Pens' | 'Pen A' | 'Pen B' | 'Pen C';

interface SanitationSchedule {
  id: string;
  pen: string;
  times: string[];
  status: StatusType;
  nextClean: string;
  sessionWater: number; // liters per cleaning session
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// sessionWater = water used per session; total daily = sessionWater × number of sessions
const SCHEDULES: SanitationSchedule[] = [
  {
    id: '1',
    pen: 'Pen A',
    times: ['09:00 AM', '03:00 PM'],
    status: 'Active',
    nextClean: '03:00 PM',
    sessionWater: 45,
  },
  {
    id: '2',
    pen: 'Pen B',
    times: ['09:00 AM', '03:00 PM'],
    status: 'Active',
    nextClean: '03:00 PM',
    sessionWater: 38,
  },
  {
    id: '3',
    pen: 'Pen C',
    times: ['09:00 AM', '03:00 PM'],
    status: 'Upcoming',
    nextClean: '09:00 AM',
    sessionWater: 42,
  },
];

const PEN_FILTERS: PenFilter[] = ['All Pens', 'Pen A', 'Pen B', 'Pen C'];

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusType, { bg: string; text: string; dot: string }> = {
  Active:   { bg: '#E8F5F1', text: '#2F7A5E', dot: '#2F7A5E' },
  Upcoming: { bg: '#FFF3E8', text: '#C27A2E', dot: '#E59A50' },
  Paused:   { bg: '#F5F0F7', text: '#7A5A8C', dot: '#9B7AB0' },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GREEN  = '#2F5D50';
const PINK   = '#D96C8D';
const BG     = '#F7F8F9';
const WHITE  = '#FFFFFF';
const BORDER = '#E8ECEE';

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function Sanitation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<PenFilter>('All Pens');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered =
    selectedFilter === 'All Pens'
      ? SCHEDULES
      : SCHEDULES.filter((s) => s.pen === selectedFilter);

  // Each pen: sessionWater × number of sessions = daily total per pen
  // Summed across all filtered pens = today's total projected water usage
  const totalWaterToday = filtered.reduce(
    (sum, s) => sum + s.sessionWater * s.times.length,
    0
  );
  // Simulated "used so far" — morning sessions done, afternoon pending
  // In production this comes from DB records of completed sessions
  const now = new Date();
  const currentHour = now.getHours();
  const sessionsCompleted = currentHour >= 15 ? 2 : currentHour >= 9 ? 1 : 0;
  const waterUsedSoFar = filtered.reduce(
    (sum, s) => sum + s.sessionWater * Math.min(sessionsCompleted, s.times.length),
    0
  );

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor('transparent');
      return () => {
        StatusBar.setBarStyle('dark-content');
        StatusBar.setBackgroundColor('transparent');
      };
    }, [])
  );

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
          <Text style={styles.headerTitle}>Sanitation Schedule</Text>
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
            <Text style={styles.summaryLabel}>Daily Cleans</Text>
          </View>
        </View>

        {/* ── Water Usage Preview Card ── */}
        <View style={styles.waterCard}>
          <View style={styles.waterCardTop}>
            <View style={styles.waterLeft}>
              <View style={styles.waterIconCircle}>
                <Ionicons name="water" size={20} color="#4A80F0" />
              </View>
              <View>
                <Text style={styles.waterTitle}>Today's Water Usage</Text>
                <Text style={styles.waterSub}>Updates after each cleaning · stored at end of day</Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.waterBarTrack}>
            <View
              style={[
                styles.waterBarFill,
                { width: totalWaterToday > 0 ? `${Math.round((waterUsedSoFar / totalWaterToday) * 100)}%` as any : '0%' },
              ]}
            />
          </View>

          {/* Used / Total row */}
          <View style={styles.waterAmountRow}>
            <View>
              <Text style={styles.waterUsedNum}>{waterUsedSoFar} <Text style={styles.waterUnitSmall}>L used</Text></Text>
              <Text style={styles.waterSessionNote}>
                {sessionsCompleted} of {filtered[0]?.times.length ?? 2} session{filtered[0]?.times.length !== 1 ? 's' : ''} done
              </Text>
            </View>
            <View style={styles.waterTotalCol}>
              <Text style={styles.waterTotalNum}>{totalWaterToday} <Text style={styles.waterUnitSmall}>L</Text></Text>
              <Text style={styles.waterTotalLabel}>projected total</Text>
            </View>
          </View>
        </View>

        {/* ── Filter Row ── */}
        <View style={styles.filterRow}>
          <Text style={styles.sectionLabel}>Schedules</Text>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterBtnText}>{selectedFilter}</Text>
            <Ionicons name="chevron-down" size={13} color={GREEN} />
          </TouchableOpacity>
        </View>

        {/* ── Schedule Cards ── */}
        {filtered.map((schedule) => {
          const sc = STATUS_CONFIG[schedule.status];
          return (
            <View key={schedule.id} style={styles.card}>

              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Ionicons name="sparkles-outline" size={20} color={GREEN} />
                  <Text style={styles.penName}>{schedule.pen}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {schedule.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Water per session */}
              <View style={styles.metaRow}>
                <Ionicons name="water-outline" size={14} color="#8A9BA8" />
                <Text style={styles.metaLabel}>Water / Session</Text>
                <Text style={styles.metaValue}>{schedule.sessionWater} L</Text>
              </View>

              {/* Daily total */}
              <View style={styles.metaRow}>
                <Ionicons name="analytics-outline" size={14} color="#8A9BA8" />
                <Text style={styles.metaLabel}>Daily Total</Text>
                <Text style={styles.metaValue}>{schedule.sessionWater * schedule.times.length} L</Text>
              </View>

              {/* Time Chips */}
              <View style={styles.timesSection}>
                <View style={styles.timesLabelRow}>
                  <Ionicons name="time-outline" size={14} color="#8A9BA8" />
                  <Text style={styles.timesLabel}>Sanitation Times</Text>
                </View>
                <View style={styles.chips}>
                  {schedule.times.map((t) => (
                    <View key={t} style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Next Clean Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.nextLabel}>Next sanitation</Text>
                <View style={styles.nextRow}>
                  <Text style={styles.nextTime}>{schedule.nextClean}</Text>
                  <Ionicons name="arrow-forward" size={13} color={PINK} />
                </View>
              </View>

            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🧹</Text>
            <Text style={styles.emptyTitle}>No schedules found</Text>
            <Text style={styles.emptyText}>
              No sanitation schedule assigned to {selectedFilter} yet.
            </Text>
          </View>
        )}

        {/* ── Future-Ready Section ── */}
        <View style={styles.futureSection}>
          <Text style={styles.futureSectionTitle}>Coming Soon</Text>
          <View style={styles.futureCards}>
            {[
              { icon: 'document-text-outline' as const, label: 'Cleaning Logs',          desc: 'Track daily sanitation activity' },
              { icon: 'bar-chart-outline'      as const, label: 'Water Usage History',    desc: 'Review past water consumption' },
              { icon: 'flash-outline'          as const, label: 'Automated Cleaning Records', desc: 'Sensor-connected cleaning data' },
            ].map((f) => (
              <View key={f.label} style={styles.futureCard}>
                <Ionicons name={f.icon} size={22} color="#8A9BA8" />
                <View>
                  <Text style={styles.futureLabel}>{f.label}</Text>
                  <Text style={styles.futureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Filter Modal ── */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setFilterOpen(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Select Pen</Text>
            {PEN_FILTERS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.menuOption, selectedFilter === opt && styles.menuOptionActive]}
                onPress={() => { setSelectedFilter(opt); setFilterOpen(false); }}
              >
                <Text style={[styles.menuOptionText, selectedFilter === opt && styles.menuOptionTextActive]}>
                  {opt}
                </Text>
                {selectedFilter === opt && (
                  <Ionicons name="checkmark" size={16} color={GREEN} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header — identical to feeding.tsx
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
  scroll: { flex: 1 },
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

  // Water Usage Card
  waterCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#4A80F0',
    gap: 10,
  },
  waterCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  waterIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2E28',
  },
  waterSub: {
    fontSize: 10,
    color: '#8A9BA8',
    marginTop: 2,
  },
  waterBarTrack: {
    height: 6,
    backgroundColor: '#E8ECEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterBarFill: {
    height: 6,
    backgroundColor: '#4A80F0',
    borderRadius: 3,
  },
  waterAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  waterUsedNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#4A80F0',
    letterSpacing: -0.5,
  },
  waterUnitSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A80F0',
  },
  waterSessionNote: {
    fontSize: 11,
    color: '#8A9BA8',
    marginTop: 2,
  },
  waterTotalCol: {
    alignItems: 'flex-end',
  },
  waterTotalNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A9BA8',
  },
  waterTotalLabel: {
    fontSize: 10,
    color: '#8A9BA8',
    marginTop: 1,
  },

  // Filter Row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  // Cards
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

  // Meta rows
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: '#8A9BA8',
    fontWeight: '500',
    flex: 1,
  },
  metaValue: {
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

  // Empty state
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
    marginTop: 4,
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

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  menu: {
    backgroundColor: WHITE,
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A9BA8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuOptionActive: { backgroundColor: '#EAF4EE' },
  menuOptionText: { fontSize: 16, color: '#1A2E28', fontWeight: '500' },
  menuOptionTextActive: { color: GREEN, fontWeight: '700' },
});