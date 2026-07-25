import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'online' | 'offline';

interface SystemStatusBannerProps {
  status?: ConnectionStatus;
  lastUpdated?: string;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    indicatorColor: string;
    ringColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    cardBg: string;
    borderColor: string;
    title: string;
    subtitle: string;
    chipBg: string;
    chipText: string;
    chipLabel: string;
  }
> = {
  online: {
    indicatorColor: '#34C759',
    ringColor: '#34C75925',
    icon: 'wifi',
    cardBg: '#FFFFFF',
    borderColor: '#D4EAE0',
    title: 'Device Connected',
    subtitle: 'All sensors operating normally.',
    chipBg: '#EAF7EF',
    chipText: '#2F5D50',
    chipLabel: 'LIVE',
  },
  offline: {
    indicatorColor: '#E53935',
    ringColor: '#E5393525',
    icon: 'wifi-outline',
    cardBg: '#FFFFFF',
    borderColor: '#FFCDD2',
    title: 'Device Offline',
    subtitle: 'Showing last available data.',
    chipBg: '#FFEBEE',
    chipText: '#E53935',
    chipLabel: 'OFFLINE',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({
  status = 'online',
  lastUpdated = '5:42 AM',
}) => {
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={styles.container}>
      <View style={[styles.card, { borderColor: cfg.borderColor }]}>

        {/* TOP ROW */}
        <View style={styles.topRow}>
          {/* Pulse ring + icon */}
          <View style={[styles.pulseRing, { backgroundColor: cfg.ringColor }]}>
            <View style={[styles.iconCore, { backgroundColor: cfg.indicatorColor }]}>
              <Ionicons name={cfg.icon} size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Title */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>{cfg.title}</Text>
            <Text style={styles.subtitle}>{cfg.subtitle}</Text>
          </View>

          {/* Live chip */}
          <View style={[styles.liveChip, { backgroundColor: cfg.chipBg }]}>
            <View style={[styles.liveDot, { backgroundColor: cfg.indicatorColor }]} />
            <Text style={[styles.liveLabel, { color: cfg.chipText }]}>{cfg.chipLabel}</Text>
          </View>
        </View>

      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: '#F4F6F5',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    gap: 14,
  },

  /* Top */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pulseRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D27',
  },
  subtitle: {
    fontSize: 11,
    color: '#7A9990',
    lineHeight: 16,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 5,
    flexShrink: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

export default SystemStatusBanner;