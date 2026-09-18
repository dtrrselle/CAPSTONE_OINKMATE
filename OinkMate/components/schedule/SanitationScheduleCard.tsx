import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ScheduleStatus = 'Upcoming' | 'Completed' | 'Missed' | 'Active';

// One row inside the card = one Sanitation Schedule entry belonging to the Pen.
export interface SanitationScheduleEntry {
  id: number | string;
  scheduleTime?: string;
  durationSeconds?: number | null;
  triggerTemperature?: number | null;
  status?: ScheduleStatus;
  onEditPress?: (sanitationId: number | string) => void;
  onDeletePress?: () => void;
}

// Converts total seconds into a short readable duration label.
// Examples: 150 -> "2 mins 30 secs", 60 -> "1 min", 30 -> "30 secs", 900 -> "15 mins"
function formatDuration(durationSeconds?: number | null): string {
  if (durationSeconds === null || durationSeconds === undefined) return 'Not Set';

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  const minutesLabel = minutes > 0 ? `${minutes} ${minutes === 1 ? 'min' : 'mins'}` : '';
  const secondsLabel = seconds > 0 ? `${seconds} ${seconds === 1 ? 'sec' : 'secs'}` : '';

  if (minutesLabel && secondsLabel) return `${minutesLabel} ${secondsLabel}`;
  if (minutesLabel) return minutesLabel;
  if (secondsLabel) return secondsLabel;
  return '0 secs';
}

interface SanitationScheduleCardProps {
  // Pig Pen name shown once in the card header.
  target?: string;
  // All Sanitation Schedules belonging to this Pig Pen.
  entries?: SanitationScheduleEntry[];
}

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; text: string; dot: string }> = {
  Upcoming: { bg: '#FFF4E0', text: '#C97A00', dot: '#FF9500' },
  Completed: { bg: '#EAF7EF', text: '#28A745', dot: '#34C759' },
  Missed:    { bg: '#FBEEF1', text: '#D96C8D', dot: '#D96C8D' },
  Active:    { bg: '#EAF7EF', text: '#2F5D50', dot: '#2F5D50' },
};

const SanitationScheduleCard: React.FC<SanitationScheduleCardProps> = ({
  target = 'All Pig Pens',
  entries = [],
}) => {
  return (
    <View style={styles.card}>
      {/* PEN HEADER */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <View style={styles.iconWrap}>
            <Ionicons name="water-outline" size={19} color="#2F5D50" />
          </View>
          <Text style={styles.title}>{target}</Text>
        </View>
      </View>

      {/* ENTRIES — one per Sanitation Schedule for this Pen, separated by dividers */}
      {entries.map((entry, index) => {
        const statusStyle = STATUS_COLORS[entry.status ?? 'Upcoming'] ?? STATUS_COLORS.Upcoming;
        const triggerTemperatureLabel =
          entry.triggerTemperature === null || entry.triggerTemperature === undefined
            ? 'Not Set'
            : `${entry.triggerTemperature}°C`;
        const durationLabel = formatDuration(entry.durationSeconds);

        return (
          <React.Fragment key={entry.id}>
            {index > 0 && <View style={styles.divider} />}

            <View style={styles.entryBlock}>
              <View style={styles.entryTopRow}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#3E7D68" />
                  <Text style={styles.detailText}>Schedule Time: {entry.scheduleTime ?? '7:00 AM'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {entry.status ?? 'Upcoming'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsBlock}>
                <View style={styles.detailRow}>
                  <Ionicons name="thermometer-outline" size={16} color="#3E7D68" />
                  <Text style={styles.detailText}>Trigger Temperature: {triggerTemperatureLabel}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="timer-outline" size={16} color="#3E7D68" />
                  <Text style={styles.detailText}>Duration: {durationLabel}</Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => entry.onEditPress?.(entry.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={16} color="#2F5D50" />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={entry.onDeletePress} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={16} color="#E23744" />
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
    marginHorizontal: 15,
    gap: 14,
    borderWidth: 1,
    borderColor: '#2F5D5030',
    borderLeftWidth: 4,
    borderLeftColor: '#2F5D50',
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
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Arial',
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
    fontSize: 16,
    color: '#4A5C57',
    fontFamily: 'Arial',
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
    gap: 6,
    backgroundColor: '#F4F8F6',
    borderRadius: 12,
    paddingVertical: 10,
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
    gap: 6,
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F8D3D3',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E23744',
    fontFamily: 'Arial',
  },
});

export default SanitationScheduleCard;