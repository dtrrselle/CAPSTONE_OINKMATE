import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertSeverity = 'critical' | 'warning' | 'info';

interface Alert {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: AlertSeverity;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── Severity Config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { accent: string; iconBg: string; iconColor: string; chipBg: string; chipText: string; label: string }
> = {
  critical: {
    accent: '#E53935',
    iconBg: '#FFEBEE',
    iconColor: '#E53935',
    chipBg: '#FFEBEE',
    chipText: '#C62828',
    label: 'Critical',
  },
  warning: {
    accent: '#FF9500',
    iconBg: '#FFF4E0',
    iconColor: '#C97A00',
    chipBg: '#FFF4E0',
    chipText: '#C97A00',
    label: 'Warning',
  },
  info: {
    accent: '#2F5D50',
    iconBg: '#EAF7EF',
    iconColor: '#2F5D50',
    chipBg: '#EAF7EF',
    chipText: '#2F5D50',
    label: 'Info',
  },
};

// ─── Data: only latest 2–3 alerts ────────────────────────────────────────────

const ALERTS: Alert[] = [
  {
    id: 'ammonia-alert',
    title: 'High Ammonia Detected',
    description: 'NH₃ reached 18 ppm in Pen 3.',
    time: '5:42 AM',
    severity: 'critical',
    icon: 'cloud-outline',
  },
  {
    id: 'temperature-alert',
    title: 'High Temperature',
    description: 'Temperature reached 32°C in Pen 5.',
    time: '5:30 AM',
    severity: 'warning',
    icon: 'thermometer-outline',
  },
];

const SHOW_EMPTY_STATE = false;

// ─── Alert Card ───────────────────────────────────────────────────────────────

const AlertCard: React.FC<{ alert: Alert }> = ({ alert }) => {
  const cfg = SEVERITY_CONFIG[alert.severity];

  return (
    <View style={[styles.card, { borderLeftColor: cfg.accent, borderColor: cfg.accent + '30' }]}>
      {/* Icon */}
      <View style={[styles.iconBadge, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={alert.icon} size={18} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.alertTitle} numberOfLines={1}>
            {alert.title}
          </Text>
          <Text style={styles.alertTime}>{alert.time}</Text>
        </View>
        <Text style={styles.alertDescription} numberOfLines={2}>
          {alert.description}
        </Text>
        <View style={[styles.severityChip, { backgroundColor: cfg.chipBg }]}>
          <View style={[styles.dot, { backgroundColor: cfg.accent }]} />
          <Text style={[styles.severityText, { color: cfg.chipText }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="checkmark-circle" size={40} color="#34C759" />
    <Text style={styles.emptyTitle}>No recent alerts</Text>
    <Text style={styles.emptySubtitle}>Everything is operating normally.</Text>
  </View>
);

// ─── Main ────────────────────────────────────────────────────────────────────

const RecentAlerts: React.FC = () => {
  const router = useRouter();

  const hasAlerts = !SHOW_EMPTY_STATE && ALERTS.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>Recent Alerts</Text>
        <TouchableOpacity
            activeOpacity={0.7}
            style={styles.viewAllBtn}
            onPress={() =>
              router.push('/notifications/notifications')
            }
          >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={13} color="#2F5D50" />
        </TouchableOpacity>
      </View>

      {hasAlerts ? (
        <View style={styles.list}>
          {ALERTS.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </View>
      ) : (
        <EmptyState />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#F4F6F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F5D50',
  },
  list: {
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    flex: 1,
  },
  alertTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#B0B8BF',
    flexShrink: 0,
  },
  alertDescription: {
    fontSize: 12,
    color: '#7A8E88',
    lineHeight: 17,
  },
  severityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Empty */
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2D27',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#A0AAB3',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RecentAlerts;