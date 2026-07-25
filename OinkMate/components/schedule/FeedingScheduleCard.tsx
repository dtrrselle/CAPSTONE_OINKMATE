import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ScheduleStatus = 'Upcoming' | 'Completed' | 'Missed' | 'Active';

// One row inside the card = one Feeding Schedule entry belonging to the Pen.
export interface FeedingScheduleEntry {
  id: number | string;
  scheduleTime?: string;
  repeatLabel?: string;
  status?: ScheduleStatus;
  feedAmountPerPig?: number | string;
  totalFeedRequired?: number | string;
  feedPerContainer?: number | string;
  onEditPress?: () => void;
  onDeletePress?: () => void;
}

interface FeedingScheduleCardProps {
  // Pig Pen name shown once in the card header.
  target?: string;
  // All Feeding Schedules belonging to this Pig Pen.
  entries?: FeedingScheduleEntry[];
}

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string; dot: string }> = {
  Upcoming: { bg: '#FFF4E0', text: '#C97A00', dot: '#FF9500' },
  Completed: { bg: '#EAF7EF', text: '#28A745', dot: '#34C759' },
  Missed:    { bg: '#FBEEF1', text: '#D96C8D', dot: '#D96C8D' },
  Active:    { bg: '#EAF7EF', text: '#2F5D50', dot: '#2F5D50' },
};

const FeedingScheduleCard: React.FC<FeedingScheduleCardProps> = ({
  target = 'All Pig Pens',
  entries = [],
}) => {
  return (
    <View style={styles.card}>
      {/* PEN HEADER */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={styles.iconWrap}>
            <Ionicons name="restaurant-outline" size={17} color="#C2547A" />
          </View>
          <Text style={styles.title}>{target}</Text>
        </View>
      </View>

      {/* ENTRIES — one per Feeding Schedule for this Pen, separated by dividers */}
      {entries.map((entry, index) => {
        const statusStyle = STATUS_COLORS[entry.status ?? 'Upcoming'] ?? STATUS_COLORS.Upcoming;

        return (
          <React.Fragment key={entry.id}>
            {index > 0 && <View style={styles.divider} />}

            <View style={styles.entryBlock}>
              <View style={styles.entryTopRow}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color="#A0B5AD" />
                  <Text style={styles.detailText}>{entry.scheduleTime ?? '6:00 AM'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {entry.status ?? 'Upcoming'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsBlock}>
                {entry.repeatLabel !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="refresh-outline" size={14} color="#A0B5AD" />
                    <Text style={styles.detailText}>{entry.repeatLabel}</Text>
                  </View>
                )}
                {entry.feedAmountPerPig !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="nutrition-outline" size={14} color="#A0B5AD" />
                    <Text style={styles.detailText}>Feed Amount Per Pig: {entry.feedAmountPerPig} kg</Text>
                  </View>
                )}
                {entry.totalFeedRequired !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="scale-outline" size={14} color="#A0B5AD" />
                    <Text style={styles.detailText}>Total Feed Required: {entry.totalFeedRequired} kg</Text>
                  </View>
                )}
                {entry.feedPerContainer !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="cube-outline" size={14} color="#A0B5AD" />
                    <Text style={styles.detailText}>Feed Per Container: {entry.feedPerContainer} kg</Text>
                  </View>
                )}
              </View>

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.editButton} onPress={entry.onEditPress} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={14} color="#2F5D50" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteButton} onPress={entry.onDeletePress} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={14} color="#D96C8D" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#C2547A30',
    borderLeftWidth: 4,
    borderLeftColor: '#C2547A',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FDEDF3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },

  /* Divider between grouped schedule entries within the same Pen card */
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#F0F3F2',
    marginVertical: 2,
  },

  entryBlock: {
    gap: 14,
  },
  entryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  detailsBlock: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F2',
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
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
  },
});

export default FeedingScheduleCard;