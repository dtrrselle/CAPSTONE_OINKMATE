import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable smooth LayoutAnimation-driven expand/collapse on Android (iOS
// supports it out of the box).
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  feedLevel?: number | null;
  feedLevel1?: number | null;
  feedLevel2?: number | null;
  feedLevel3?: number | null;
  feedStatus?: FeedStatus;
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

// Sensor readings are raw distance measurements for now (not yet
// converted into a true fill level), so displayed percentages are
// clamped to a sane 0-100 range to avoid bars/labels overflowing past
// 100%. The real distance-to-level formula will replace this later.
const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const getContainerBarColor = (level: number) => {
  if (level <= 20) return '#E53935';
  if (level <= 50) return '#FF9500';
  return '#34C759';
};

// Distinguishes "no sensor reading" from an actual 0% reading, so the
// Feed section can show "No Data" the same way Temperature/Humidity/
// Ammonia already do, instead of fabricating a percentage.
const hasReading = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

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
  feedLevel,
  feedLevel1,
  feedLevel2,
  feedLevel3,
  feedStatus = 'Normal',
  isDeleting = false,
  onEditPress,
  onDeletePress,
  onViewDetailsPress,
}) => {
  const growthStageStyle = GROWTH_STAGE_COLORS[growthStage] ?? GROWTH_STAGE_COLORS.Finisher;
  const feedCfg = FEED_STATUS_CONFIG[feedStatus] ?? FEED_STATUS_CONFIG['Normal'];

  // Only clamp/display a percentage when actual sensor data exists.
  // Container levels are never defaulted to the overall feed level -
  // each field independently shows "No Data" when its own reading is
  // missing, matching how Temperature/Humidity/Ammonia already behave.
  const hasOverallLevel = hasReading(feedLevel);
  const displayFeedLevel = hasOverallLevel ? clampPercent(feedLevel) : null;

  const hasContainer1 = hasReading(feedLevel1);
  const hasContainer2 = hasReading(feedLevel2);
  const hasContainer3 = hasReading(feedLevel3);
  const container1Level = hasContainer1 ? clampPercent(feedLevel1) : null;
  const container2Level = hasContainer2 ? clampPercent(feedLevel2) : null;
  const container3Level = hasContainer3 ? clampPercent(feedLevel3) : null;

  const [showContainers, setShowContainers] = useState(false);

  const toggleContainers = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowContainers((prev) => !prev);
  };

  return (
    <View style={styles.card}>

      {/* TOP */}
      <View style={styles.topRow}>
        <View style={styles.topTextBlock}>
          <Text style={styles.penName}>{penName}</Text>
          <View style={styles.deviceCodeRow}>
            <Ionicons name="hardware-chip-outline" size={11} color="#A0B5AD" />
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
      </View>

      {/* ENVIRONMENT + FEED LEVEL */}
      <View style={styles.envRow}>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#FCEAE5' }]}>
            <Ionicons name="thermometer-outline" size={14} color="#E07A5F" />
          </View>
          <Text style={styles.envValue}>{temperature}</Text>
          <Text style={styles.envLabel}>Temp</Text>
        </View>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#E8F1FB' }]}>
            <Ionicons name="water-outline" size={14} color="#3B82C4" />
          </View>
          <Text style={styles.envValue}>{humidity}</Text>
          <Text style={styles.envLabel}>Humidity</Text>
        </View>
        <View style={styles.envCard}>
          <View style={[styles.envIconWrap, { backgroundColor: '#EFEFF3' }]}>
            <Ionicons name="cloud-outline" size={14} color="#8A8FA3" />
          </View>
          <Text style={styles.envValue}>{ammonia}</Text>
          <Text style={styles.envLabel}>Ammonia</Text>
        </View>
        <View style={[styles.envCard, styles.feedCard]}>
          <View style={[styles.envIconWrap, { backgroundColor: '#FFF4E0' }]}>
            <Ionicons name="nutrition-outline" size={14} color="#C97A00" />
          </View>
          {hasOverallLevel ? (
            <>
              <Text style={[styles.envValue, { color: feedCfg.barColor }]}>{displayFeedLevel}%</Text>
              <Text style={styles.envLabel}>Feed</Text>
              <View style={styles.feedMiniBar}>
                <View style={[styles.feedMiniBarFill, { width: `${displayFeedLevel}%` as any, backgroundColor: feedCfg.barColor }]} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.envValue}>No Data</Text>
              <Text style={styles.envLabel}>Feed</Text>
            </>
          )}
        </View>
      </View>

      {/* FEED CONTAINERS ACCORDION — full-width, belongs to the card as a
          whole rather than the small Feed summary tile, so expanding it
          doesn't stretch/narrow the 4-card environment row. */}
      <View style={styles.accordion}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={toggleContainers}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            <View style={styles.accordionIconWrap}>
              <Ionicons name="cube-outline" size={13} color="#C97A00" />
            </View>
            <Text style={styles.accordionTitle}>Feed Containers</Text>
          </View>
          <Ionicons
            name={showContainers ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#A0B5AD"
          />
        </TouchableOpacity>

        {showContainers && (
          <View style={styles.accordionBody}>
            {[
              { label: 'Container 1', level: container1Level, hasData: hasContainer1 },
              { label: 'Container 2', level: container2Level, hasData: hasContainer2 },
              { label: 'Container 3', level: container3Level, hasData: hasContainer3 },
            ].map((container, index, arr) => {
              const barColor = container.hasData ? getContainerBarColor(container.level as number) : '#B0C0BC';
              return (
                <View
                  key={container.label}
                  style={[
                    styles.containerRow,
                    index !== arr.length - 1 && styles.containerRowDivider,
                  ]}
                >
                  <View style={[styles.containerIconWrap, { backgroundColor: container.hasData ? `${barColor}1A` : '#F0F3F2' }]}>
                    <Ionicons name="cube-outline" size={11} color={barColor} />
                  </View>
                  <View style={styles.containerBarBlock}>
                    <View style={styles.containerLabelRow}>
                      <Text style={styles.containerLabel}>{container.label}</Text>
                      <Text style={[styles.containerPercent, container.hasData && { color: barColor }]}>
                        {container.hasData ? `${container.level}%` : 'No Data'}
                      </Text>
                    </View>
                    {container.hasData && (
                      <View style={styles.containerBarTrack}>
                        <View
                          style={[
                            styles.containerBarFill,
                            { width: `${container.level}%` as any, backgroundColor: barColor },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* FOOTER */}
      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditPress}
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Ionicons name="create-outline" size={14} color="#2F5D50" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={onDeletePress}
          activeOpacity={0.8}
          disabled={isDeleting}
        >
          <Ionicons name="trash-outline" size={14} color="#D96C8D" />
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
          <Ionicons name="chevron-forward" size={13} color="#D96C8D" />
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  deviceCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  deviceCodeText: {
    fontSize: 10.5,
    color: '#A0B5AD',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  categoryBadge: {
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },

  keyInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  keyInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  keyInfoValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.5,
  },
  keyInfoLabel: {
    fontSize: 11,
    color: '#A0B5AD',
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  keyInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2EDEA',
  },

  envRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  envValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  envLabel: {
    fontSize: 10,
    color: '#A0B5AD',
    fontFamily: 'Inter',
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
  // Full-width accordion for the Feed Containers section. Styled after
  // iOS Settings grouped cards: a soft rounded container, a tappable
  // header row, and an inset body that separates each row with a hairline
  // divider instead of individual bordered chips.
  accordion: {
    backgroundColor: '#F7F8F9',
    borderRadius: 16,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4E0',
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  containerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  containerRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEB',
    paddingBottom: 12,
  },
  containerIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerBarBlock: {
    flex: 1,
    gap: 5,
  },
  containerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5B6E67',
    fontFamily: 'Inter',
  },
  containerPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  containerBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#E2EDEA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  containerBarFill: {
    height: '100%',
    borderRadius: 3,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FCF0F3',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F6DCE3',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
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
    fontSize: 12,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
  },
});

export default PigPenCard;