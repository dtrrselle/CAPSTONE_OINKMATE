import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type GrowthStage = 'Creep' | 'Pre-Starter' | 'Starter' | 'Grower' | 'Finisher';
type FeedStatus = 'Normal' | 'Low Feed' | 'Refill Needed';

interface PigPenCardProps {
  penName?: string;
  location?: string;
  penId?: string;
  deviceCode?: string;
  growthStage?: GrowthStage;
  pigCount?: number;
  currentAge?: string;
  temperature?: string;
  humidity?: string;
  ammonia?: string;
  feedLevel?: number;
  feedLevel1?: number;
  feedLevel2?: number;
  feedStatus?: FeedStatus;
  actualFeedType?: string;
  isDeleting?: boolean;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  onViewDetailsPress?: () => void;
}

// Growth Stage badge colors. Growth Stage now comes from the backend
// Recommendation Engine (feeding_reference.csv) via the API response.
const GROWTH_STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  Creep:        { bg: '#FFF6E0', text: '#A9790B' },
  'Pre-Starter': { bg: '#FDEFE3', text: '#C97A3A' },
  Starter:      { bg: '#EAF0FA', text: '#3B5EA8' },
  Grower:       { bg: '#FBEEF1', text: '#D96C8D' },
  Finisher:     { bg: '#EAF7F1', text: '#2F5D50' },
};

const FEED_STATUS_CONFIG: Record<FeedStatus, { color: string; barColor: string }> = {
  'Normal':        { color: '#28A745', barColor: '#34C759' },
  'Low Feed':      { color: '#C97A00', barColor: '#FF9500' },
  'Refill Needed': { color: '#C62828', barColor: '#E53935' },
};

const PigPenCard: React.FC<PigPenCardProps> = ({
  penName = 'Pen A',
  location = 'Main Barn',
  penId = '001',
  deviceCode = 'OINKMATE-001',
  growthStage = 'Grower',
  pigCount = 12,
  currentAge = '78 Days',
  temperature = '28°C',
  humidity = '65%',
  ammonia = '12 ppm',
  feedLevel1,
  feedLevel2,
  feedStatus,
  actualFeedType,
  isDeleting = false,
  onEditPress,
  onDeletePress,
  onViewDetailsPress,
}) => {
  const growthStageStyle = GROWTH_STAGE_COLORS[growthStage] ?? GROWTH_STAGE_COLORS.Finisher;

  // Feed card container inspector — tapping the "Feed" label opens a
  // small modal showing each container's own reading. Purely
  // informational; it never affects the main average shown on the card.
  const [containerDropdownOpen, setContainerDropdownOpen] = useState(false);

  // Main Feed value is always the average of Container 1 (feedLevel1) and
  // Container 2 (feedLevel2) — never feedLevel3, never the old feedLevel
  // prop. Both readings must be valid numbers or the result is "No Data".
  const hasFeedLevel1 = typeof feedLevel1 === 'number';
  const hasFeedLevel2 = typeof feedLevel2 === 'number';
  const averageFeedLevel =
    hasFeedLevel1 && hasFeedLevel2
      ? Math.min(100, Math.max(0, ((feedLevel1 as number) + (feedLevel2 as number)) / 2))
      : null;
  const hasAverage = averageFeedLevel !== null;

  // Status coloring only applies when there's a valid average AND the
  // parent supplied a feedStatus derived from that same average.
  const feedCfg = hasAverage && feedStatus ? FEED_STATUS_CONFIG[feedStatus] : null;

  return (
    <View style={styles.card}>

      {/* TOP */}
      <View style={styles.topRow}>
        <View style={styles.topTextBlock}>
          <Text style={styles.penName}>{penName}</Text>
          <View style={styles.deviceCodeRow}>
            <Ionicons name="hardware-chip-outline" size={12} color="#2F5D50" />
            <Text style={styles.deviceCodeText}>{deviceCode}</Text>
          </View>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: growthStageStyle.bg }]}>
          <Text style={[styles.categoryText, { color: growthStageStyle.text }]}>{growthStage}</Text>
        </View>
      </View>

      {/* PRIORITY INFO */}
      <View style={styles.keyInfoRow}>
        <View style={styles.keyInfoItem}>
          <Text style={styles.keyInfoValue}>{pigCount}</Text>
          <Text style={styles.keyInfoLabel}>Pigs</Text>
        </View>
        <View style={styles.keyInfoDivider} />
        <View style={styles.keyInfoItem}>
          <Text style={styles.keyInfoValue}>{currentAge}</Text>
          <Text style={styles.keyInfoLabel}>Current Age</Text>
        </View>
        <View style={styles.keyInfoDivider} />
        <View style={styles.keyInfoItem}>
          <Text style={styles.keyInfoValue}>{actualFeedType ?? '—'}</Text>
          <Text style={styles.keyInfoLabel}>Actual Feed</Text>
        </View>
      </View>

      {/* ENVIRONMENT + FEED LEVEL */}
      <View style={styles.envRow}>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#EAF7F1' }]}>
            <Ionicons name="thermometer-outline" size={15} color="#2F5D50" />
          </View>
          <Text style={styles.envValue}>{temperature}</Text>
          <Text style={styles.envLabel}>Temp</Text>
        </View>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#EAF7F1' }]}>
            <Ionicons name="water-outline" size={15} color="#2F5D50" />
          </View>
          <Text style={styles.envValue}>{humidity}</Text>
          <Text style={styles.envLabel}>Humidity</Text>
        </View>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#EAF7F1' }]}>
            <Ionicons name="cloud-outline" size={15} color="#2F5D50" />
          </View>
          <Text style={styles.envValue}>{ammonia}</Text>
          <Text style={styles.envLabel}>Ammonia</Text>
        </View>
        <View style={[styles.envCard, styles.feedCard]}>
          <View style={[styles.envIconWrap, { backgroundColor: '#EAF7F1' }]}>
            <Ionicons name="nutrition-outline" size={15} color="#2F5D50" />
          </View>
          <Text style={[styles.envValue, hasAverage && feedCfg ? { color: feedCfg.barColor } : null]}>
            {hasAverage ? `${(averageFeedLevel as number).toFixed(2)}%` : 'No Data'}
          </Text>
          <TouchableOpacity
            style={styles.feedLabelRow}
            activeOpacity={0.7}
            onPress={() => setContainerDropdownOpen(true)}
          >
            <Text style={styles.envLabel}>Feed</Text>
            <Ionicons name="chevron-down" size={10} color="#5F6D69" />
          </TouchableOpacity>
          {hasAverage && (
            <View style={styles.feedMiniBar}>
              <View
                style={[
                  styles.feedMiniBarFill,
                  { width: `${Math.min(100, Math.max(0, averageFeedLevel as number))}%` as any, backgroundColor: feedCfg?.barColor ?? '#8A9994' },
                ]}
              />
            </View>
          )}
        </View>
      </View>

      {/* FEED CONTAINER SELECTOR MODAL */}
      <Modal
        visible={containerDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setContainerDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setContainerDropdownOpen(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Feed Containers</Text>
            {(['Container 1', 'Container 2'] as const).map((label) => {
              const value = label === 'Container 1' ? feedLevel1 : feedLevel2;
              const valueText =
                typeof value === 'number'
                  ? `${Math.min(100, Math.max(0, value)).toFixed(2)}%`
                  : 'No Data';
              return (
                <View key={label} style={styles.menuOption}>
                  <Text style={styles.menuOptionText}>{label}</Text>
                  <Text style={styles.menuOptionValueText}>{valueText}</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FOOTER */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Ionicons name="create-outline" size={15} color="#2F5D50" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={onDeletePress}
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={15} color="#E53935" />
          <Text style={styles.deleteButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={onViewDetailsPress}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#2F5D50" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topTextBlock: {
    gap: 3,
    flex: 1,
  },
  penName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
    letterSpacing: -0.3,
  },
  deviceCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  deviceCodeText: {
    fontSize: 13,
    color: '#5F6D69',
    fontFamily: 'Arial',
    fontWeight: '500',
  },
  categoryBadge: {
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Arial',
  },

  keyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  keyInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  keyInfoValue: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
    letterSpacing: -0.5,
  },
  keyInfoLabel: {
    fontSize: 13,
    color: '#5F6D69',
    fontWeight: '500',
    fontFamily: 'Arial',
  },
  keyInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2EDEA',
    marginHorizontal: 4,
  },

  envRow: {
    flexDirection: 'row',
    gap: 6,
  },
  envCard: {
    flex: 1,
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  feedCard: {
    gap: 2,
  },
  envIconWrap: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  envValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Arial',
  },
  envLabel: {
    fontSize: 12,
    color: '#5F6D69',
    fontFamily: 'Arial',
  },
  feedMiniBar: {
    width: '70%',
    height: 3,
    backgroundColor: '#E2EDEA',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 3,
  },
  feedMiniBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* Feed label + small chevron, tappable to open the container selector
     modal — same "Feed" label as before, just now interactive. */
  feedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  /* Container selector dropdown modal — visual pattern matches the
     Environment screen's Select Pen dropdown (overlay + white rounded
     menu + title + selectable options + checkmark). */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  menu: {
    backgroundColor: '#FFFFFF',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#5F6D69',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Arial',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  menuOptionText: {
    fontSize: 18,
    color: '#1A2D27',
    fontFamily: 'Arial',
    fontWeight: '500',
  },
  menuOptionValueText: {
    fontSize: 15,
    color: '#5F6D69',
    fontFamily: 'Arial',
    fontWeight: '600',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F4F8F6',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCEAE5',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Arial',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
    fontFamily: 'Arial',
  },
  viewDetailsButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Arial',
  },
});

export default PigPenCard;