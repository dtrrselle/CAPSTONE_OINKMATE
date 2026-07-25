import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

type StatusType = 'active' | 'inactive';
type ScheduleMode = 'feeding' | 'sanitation';

type Pen = {
  pen_id: number;
  pen_name: string;
  pig_age_at_registration: number | string | null;
  pig_count: number | null;
  currentAge: number | string | null;
  growthStage: string | null;
  feedType: string | null;
  recommendedFeed: string | null;
  source: string | null;
};

// Feeding schedule shape as returned by api/schedules/get_feeding_schedule_details.php
type FeedingScheduleDetails = {
  schedule_id: number;
  pen_id: number;
  pen_name: string;
  feeding_time: string; // "08:00:00" (24-hour, from TIME column)
  feed_amount_per_pig: number;
  total_feed_required: number;
  feed_per_container: number;
  status: string;
  pig_age_at_registration: number | string | null;
  pig_count: number | null;
  currentAge: number | string | null;
  growthStage: string | null;
  feedType: string | null;
  recommendedFeed: string | null;
  source: string | null;
};

// Sanitation schedule shape as returned by api/schedules/get_sanitation_schedule_details.php
type SanitationScheduleDetails = {
  sanitation_id: number;
  pen_id: number;
  pen_name: string;
  schedule_time: string; // "07:00:00" (24-hour, from TIME column)
  duration_minutes: number | null;
  trigger_temperature: number | null;
  status: string;
  pig_age_at_registration: number | string | null;
  pig_count: number | null;
  currentAge: number | string | null;
  growthStage: string | null;
  feedType: string | null;
  recommendedFeed: string | null;
  source: string | null;
};

const TIME_OPTIONS = [
  '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM',
  '12:00 PM', '01:00 PM', '03:00 PM', '05:00 PM', '06:00 PM',
];

// NOTE: dapat naka-open at naka-RUN yung ngrok tunnel mo (ngrok http <port>)
// bago mo i-test 'to, kasi kailangan live yung URL na 'to para may sumagot.
const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

// Convert "08:00:00" (24-hour, from TIME column) -> "8:00 AM"
function formatTo12Hour(time24h: string): string {
  if (!time24h) return '';
  const [hoursStr, minutesStr] = time24h.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr ?? '00';
  const modifier = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${modifier}`;
}

// Convert "8:00 AM" -> "08:00:00" (24-hour, for the TIME column)
function formatTo24Hour(time12h: string): string {
  const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12h;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = match[3].toUpperCase();

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}

export default function EditScheduleScreen() {
  const router = useRouter();
  const { schedule_id, sanitation_id, mode: modeParam } = useLocalSearchParams<{
    schedule_id?: string;
    sanitation_id?: string;
    mode?: string;
  }>();

  // Falls back to 'feeding' so existing links without a mode param keep working.
  const mode: ScheduleMode = modeParam === 'sanitation' ? 'sanitation' : 'feeding';
  const recordId = mode === 'sanitation' ? sanitation_id : schedule_id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Duplicate-schedule modal (same pen + same time already has a schedule).
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');

  // Pig Pen options loaded for this farmer, plus the one currently selected.
  const [availablePens, setAvailablePens] = useState<Pen[]>([]);
  const [selectedPenId, setSelectedPenId] = useState<number | null>(null);
  const [showPenDropdown, setShowPenDropdown] = useState(false);

  const [selectedTime, setSelectedTime] = useState('');
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // Feeding-only fields
  const [feedAmountPerPig, setFeedAmountPerPig] = useState('');

  // Sanitation-only fields
  const [triggerTemperature, setTriggerTemperature] = useState('');
  const [sanitationDuration, setSanitationDuration] = useState('');

  const [status, setStatus] = useState<StatusType>('active');

  const selectedPen = availablePens.find((p) => p.pen_id === selectedPenId) ?? null;

  const pigCount = selectedPen?.pig_count ?? 0;
  const feedAmountNum = parseFloat(feedAmountPerPig) || 0;
  const totalFeedRequired = pigCount * feedAmountNum;
  const feedPerContainer = totalFeedRequired / 3;

  const handleBack = () => {
    router.replace('/(tabs)/schedule');
  };

  // Load the schedule's details (and the farmer's other pens) when the screen opens.
  useEffect(() => {
    const loadFeedingDetails = async (id: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/schedules/get_feeding_schedule_details.php?schedule_id=${id}`
      );
      const data = await response.json();

      if (data.success && data.schedule) {
        const schedule: FeedingScheduleDetails = data.schedule;

        setSelectedPenId(schedule.pen_id);
        setSelectedTime(formatTo12Hour(schedule.feeding_time));
        setFeedAmountPerPig(String(schedule.feed_amount_per_pig ?? ''));
        setStatus(schedule.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active');

        const pens: Pen[] = Array.isArray(data.available_pens) ? data.available_pens : [];
        if (!pens.some((p) => p.pen_id === schedule.pen_id)) {
          pens.unshift({
            pen_id: schedule.pen_id,
            pen_name: schedule.pen_name,
            pig_age_at_registration: schedule.pig_age_at_registration,
            pig_count: schedule.pig_count,
            currentAge: schedule.currentAge,
            growthStage: schedule.growthStage,
            feedType: schedule.feedType,
            recommendedFeed: schedule.recommendedFeed,
            source: schedule.source,
          });
        }
        setAvailablePens(pens);
      } else {
        setLoadError(data.message || 'Failed to load schedule details.');
      }
    };

    const loadSanitationDetails = async (id: string) => {
      const response = await fetch(
        `${API_BASE_URL}/api/schedules/get_sanitation_schedule_details.php?sanitation_id=${id}`
      );
      const data = await response.json();

      if (data.success && data.schedule) {
        const schedule: SanitationScheduleDetails = data.schedule;

        setSelectedPenId(schedule.pen_id);
        setSelectedTime(formatTo12Hour(schedule.schedule_time));
        setSanitationDuration(
          schedule.duration_minutes === null || schedule.duration_minutes === undefined
            ? ''
            : String(schedule.duration_minutes)
        );
        setTriggerTemperature(
          schedule.trigger_temperature === null || schedule.trigger_temperature === undefined
            ? ''
            : String(schedule.trigger_temperature)
        );
        setStatus(schedule.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active');

        const pens: Pen[] = Array.isArray(data.available_pens) ? data.available_pens : [];
        if (!pens.some((p) => p.pen_id === schedule.pen_id)) {
          pens.unshift({
            pen_id: schedule.pen_id,
            pen_name: schedule.pen_name,
            pig_age_at_registration: schedule.pig_age_at_registration,
            pig_count: schedule.pig_count,
            currentAge: schedule.currentAge,
            growthStage: schedule.growthStage,
            feedType: schedule.feedType,
            recommendedFeed: schedule.recommendedFeed,
            source: schedule.source,
          });
        }
        setAvailablePens(pens);
      } else {
        setLoadError(data.message || 'Failed to load schedule details.');
      }
    };

    const loadScheduleDetails = async () => {
      if (!recordId) {
        setLoadError(
          mode === 'sanitation'
            ? 'No sanitation schedule was selected to edit.'
            : 'No schedule was selected to edit.'
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      try {
        if (mode === 'sanitation') {
          await loadSanitationDetails(recordId);
        } else {
          await loadFeedingDetails(recordId);
        }
      } catch (error) {
        console.log(`Load ${mode} schedule details error:`, error);
        setLoadError('Something went wrong while loading this schedule.');
      } finally {
        setLoading(false);
      }
    };

    loadScheduleDetails();
  }, [recordId, mode]);

  const handleUpdate = async () => {
    if (!recordId || !selectedPenId || !selectedTime) {
      return;
    }
    if (mode === 'feeding' && !feedAmountPerPig) {
      return;
    }
    if (mode === 'sanitation' && !isSanitationDurationValid) {
      return;
    }

    setSaving(true);
    try {
      const endpoint =
        mode === 'sanitation'
          ? `${API_BASE_URL}/api/schedules/update_sanitation_schedule.php`
          : `${API_BASE_URL}/api/schedules/update_feeding_schedule.php`;

      const body =
        mode === 'sanitation'
          ? {
              sanitation_id: Number(recordId),
              pen_id: selectedPenId,
              schedule_time: formatTo24Hour(selectedTime),
              duration_minutes: sanitationDurationValue,
              trigger_temperature: triggerTemperature ? parseFloat(triggerTemperature) : null,
              status,
            }
          : {
              schedule_id: Number(recordId),
              pen_id: selectedPenId,
              feeding_time: formatTo24Hour(selectedTime),
              feed_amount_per_pig: feedAmountNum,
              total_feed_required: totalFeedRequired,
              feed_per_container: feedPerContainer,
              status,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (data.success) {
        setShowSuccessModal(true);
      } else if (data.duplicate) {
        setDuplicateMessage(
          data.message ||
            (mode === 'sanitation'
              ? 'A sanitation schedule already exists for this pig pen at this time.'
              : 'A feeding schedule already exists for this pig pen at this time.')
        );
        setShowDuplicateModal(true);
      } else {
        console.log(`Failed to update ${mode} schedule:`, data.message);
      }
    } catch (error) {
      console.log(`Update ${mode} schedule error:`, error);
    } finally {
      setSaving(false);
    }
  };

  const sanitationDurationValue = Number(sanitationDuration);
  const isSanitationDurationValid =
    sanitationDuration.trim() !== '' &&
    Number.isInteger(sanitationDurationValue) &&
    sanitationDurationValue >= 1 &&
    sanitationDurationValue <= 30;

  const canSubmit =
    !loading &&
    !!selectedPenId &&
    !!selectedTime &&
    (mode === 'sanitation' ? isSanitationDurationValid : !!feedAmountPerPig);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'sanitation' ? 'Edit Sanitation Schedule' : 'Edit Feeding Schedule'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#2F5D50" />
        </View>
      ) : loadError ? (
        <View style={styles.loadingSection}>
          <Ionicons name="alert-circle-outline" size={28} color="#D96C8D" />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Pig Pen */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="paw-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Pig Pen</Text>
            </View>
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowPenDropdown(!showPenDropdown)}
                activeOpacity={0.85}
              >
                <Ionicons name="paw-outline" size={15} color="#4A5C57" />
                <Text style={styles.dropdownTriggerText}>
                  {selectedPen?.pen_name ?? 'Select Pig Pen'}
                </Text>
                <Ionicons
                  name={showPenDropdown ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color="#8A9994"
                />
              </TouchableOpacity>
              {showPenDropdown && (
                <View style={styles.dropdownMenu}>
                  {availablePens.map((pen) => (
                    <TouchableOpacity
                      key={pen.pen_id}
                      style={[
                        styles.dropdownItem,
                        selectedPenId === pen.pen_id && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSelectedPenId(pen.pen_id);
                        setShowPenDropdown(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedPenId === pen.pen_id && styles.dropdownItemTextActive,
                        ]}
                      >
                        {pen.pen_name}
                      </Text>
                      {selectedPenId === pen.pen_id && (
                        <Ionicons name="checkmark" size={14} color="#2F5D50" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Pig Pen Information */}
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Pig Age at Registration</Text>
                <Text style={styles.infoValue}>{selectedPen?.pig_age_at_registration ?? '—'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Current Age</Text>
                <Text style={styles.infoValue}>{selectedPen?.currentAge ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Growth Stage</Text>
                <Text style={styles.infoValue}>{selectedPen?.growthStage ?? '—'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Number of Pigs</Text>
                <Text style={styles.infoValue}>{selectedPen?.pig_count ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Feeding Recommendation — generated by feeding_helper.php on the backend.
              Display-only; nothing here is calculated in React Native. */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="nutrition-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Feeding Recommendation</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Feed Type</Text>
                <Text style={styles.infoValue}>{selectedPen?.feedType ?? '—'}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Recommended Feed Amount</Text>
                <Text style={styles.infoValue}>{selectedPen?.recommendedFeed ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Source</Text>
                <Text style={styles.infoValue}>{selectedPen?.source ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Schedule Time */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="time-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>
                {mode === 'sanitation' ? 'Sanitation Time' : 'Feeding Time'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setShowTimeDropdown(!showTimeDropdown)}
              activeOpacity={0.85}
            >
              <Ionicons name="alarm-outline" size={15} color="#4A5C57" />
              <Text style={styles.dropdownTriggerText}>{selectedTime}</Text>
              <Ionicons
                name={showTimeDropdown ? 'chevron-up' : 'chevron-down'}
                size={15}
                color="#8A9994"
              />
            </TouchableOpacity>
            {showTimeDropdown && (
              <View style={styles.dropdownMenu}>
                {TIME_OPTIONS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.dropdownItem, selectedTime === time && styles.dropdownItemActive]}
                    onPress={() => { setSelectedTime(time); setShowTimeDropdown(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownItemText, selectedTime === time && styles.dropdownItemTextActive]}>
                      {time}
                    </Text>
                    {selectedTime === time && (
                      <Ionicons name="checkmark" size={14} color="#2F5D50" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Feed Amount Per Pig — feeding schedules only */}
          {mode === 'feeding' && (
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="restaurant-outline" size={15} color="#2F5D50" />
                <Text style={styles.cardLabel}>Feed Amount Per Pig (kg)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1.5"
                placeholderTextColor="#B0C0BC"
                keyboardType="decimal-pad"
                value={feedAmountPerPig}
                onChangeText={setFeedAmountPerPig}
              />

              {/* Auto-computed totals */}
              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Total Feed Required (kg)</Text>
                  <Text style={styles.infoValue}>{totalFeedRequired.toFixed(2)}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Feed Per Container (kg)</Text>
                  <Text style={styles.infoValue}>{feedPerContainer.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Trigger Temperature — sanitation schedules only */}
          {mode === 'sanitation' && (
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="thermometer-outline" size={15} color="#2F5D50" />
                <Text style={styles.cardLabel}>Trigger Temperature (°C)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 28 (optional)"
                placeholderTextColor="#B0C0BC"
                keyboardType="decimal-pad"
                value={triggerTemperature}
                onChangeText={setTriggerTemperature}
              />
            </View>
          )}

          {/* Sanitation Duration — sanitation schedules only */}
          {mode === 'sanitation' && (
            <View style={styles.card}>
              <View style={styles.cardLabelRow}>
                <Ionicons name="timer-outline" size={15} color="#2F5D50" />
                <Text style={styles.cardLabel}>Sanitation Duration (minutes)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 15"
                placeholderTextColor="#B0C0BC"
                keyboardType="number-pad"
                value={sanitationDuration}
                onChangeText={(text) => setSanitationDuration(text.replace(/[^0-9]/g, ''))}
              />
              {!isSanitationDurationValid && (
                <Text style={styles.errorText}>
                  Duration is required and must be a whole number between 1 and 30 minutes.
                </Text>
              )}
            </View>
          )}

          {/* Status */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="radio-button-on-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Status</Text>
            </View>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segment, status === 'active' && styles.segmentActive]}
                onPress={() => setStatus('active')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color={status === 'active' ? '#FFFFFF' : '#6B8A82'}
                />
                <Text style={[styles.segmentText, status === 'active' && styles.segmentTextActive]}>
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, status === 'inactive' && styles.segmentInactive]}
                onPress={() => setStatus('inactive')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="pause-circle-outline"
                  size={15}
                  color={status === 'inactive' ? '#FFFFFF' : '#6B8A82'}
                />
                <Text style={[styles.segmentText, status === 'inactive' && styles.segmentTextInactive]}>
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.primaryButton, (!canSubmit || saving) && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleUpdate}
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Update Schedule</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Schedule Updated Successfully</Text>
            <TouchableOpacity
              style={[styles.primaryButton, styles.successDoneButton]}
              activeOpacity={0.85}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/(tabs)/schedule');
              }}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Duplicate Schedule Modal */}
      <Modal visible={showDuplicateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={[styles.successIconCircle, { backgroundColor: '#D96C8D' }]}>
              <Ionicons name="alert-circle-outline" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Schedule Already Exists</Text>
            <Text style={styles.errorText}>{duplicateMessage}</Text>
            <TouchableOpacity
              style={[styles.primaryButton, styles.successDoneButton]}
              activeOpacity={0.85}
              onPress={() => setShowDuplicateModal(false)}
            >
              <Text style={styles.primaryButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  headerPlaceholder: {
    width: 38,
  },

  /* Loading / Error */
  loadingSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5C57',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },

  /* Segmented Control */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0F3F2',
    borderRadius: 14,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentActive: {
    backgroundColor: '#2F5D50',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentInactive: {
    backgroundColor: '#D96C8D',
    shadowColor: '#D96C8D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B8A82',
    fontFamily: 'Inter',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  segmentTextInactive: {
    color: '#FFFFFF',
  },

  /* Dropdown */
  dropdownWrapper: {
    gap: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  dropdownTriggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2EDEA',
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F2',
  },
  dropdownItemActive: {
    backgroundColor: '#EAF7F1',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  dropdownItemTextActive: {
    color: '#2F5D50',
    fontWeight: '700',
  },

  /* Text Input */
  textInput: {
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },

  /* Pig Pen Info / Computed Totals */
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2EDEA',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },

  /* Primary Button */
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2F5D50',
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  bottomSpacer: {
    height: 32,
  },

  /* Success Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 45, 36, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  successIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2F5D50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  successDoneButton: {
    width: '100%',
  },
});