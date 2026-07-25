import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, ActivityIndicator, Alert, Modal, TouchableOpacity, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import ScheduleHeader from '../../components/schedule/ScheduleHeader';
import ScheduleTypeTabs from '../../components/schedule/ScheduleTypeTabs';
import FeedingScheduleCard from '../../components/schedule/FeedingScheduleCard';
import SanitationScheduleCard from '../../components/schedule/SanitationScheduleCard';
import DeleteScheduleModal from '../../components/schedule/DeleteScheduleModal';
import ManualOverrideControls from '../../components/schedule/ManualOverrideControl';
import EmptySchedule from '../../components/schedule/EmptySchedule';

// Generic "deleting..." loading modal. Reusable for both Feeding and Sanitation
// deletes later — just pass a different `message`.
function DeleteLoadingModal({
  visible,
  message = 'Deleting Schedule...',
}: {
  visible: boolean;
  message?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <ActivityIndicator size="large" color="#2F5D50" />
          <Text style={modalStyles.title}>{message}</Text>
          <Text style={modalStyles.message}>Please wait...</Text>
        </View>
      </View>
    </Modal>
  );
}

// Generic green success modal. Reusable for both Feeding and Sanitation
// deletes later — just pass a different `title` / `message`.
function DeleteSuccessModal({
  visible,
  title = 'Schedule Deleted',
  message = 'Schedule has been deleted successfully.',
  onConfirm,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.card}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name="checkmark-circle" size={40} color="#2F5D50" />
          </View>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>

          <TouchableOpacity
            style={modalStyles.button}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={modalStyles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Feeding schedule shape as returned by api/schedules/get_feeding_schedules.php
type FeedingSchedule = {
  schedule_id: number;
  pen_id: number;
  pen_name: string;
  feeding_time: string;
  feed_amount_per_pig: number;
  total_feed_required: number;
  feed_per_container: number;
  status: string;
};

// Sanitation schedule shape as returned by api/schedules/get_sanitation_schedules.php
type SanitationSchedule = {
  sanitation_id: number;
  pen_id: number;
  pen_name: string;
  schedule_time: string;
  duration_minutes: number | null;
  trigger_temperature: number | null;
  status: string;
};

// Pig Pen shape needed by ManualOverrideControls to let the farmer pick
// which device (Raspberry Pi) a manual override command should target.
// Loaded here from the existing Pig Pen endpoint and passed down as
// props — ManualOverrideControls itself never fetches this.
type PigPen = {
  pen_id: number;
  pen_name: string;
  device_code: string;
};

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

// Map DB status ('active' / 'inactive') to the ScheduleStatus type FeedingScheduleCard expects.
function mapFeedingStatus(status: string): 'Upcoming' | 'Completed' | 'Missed' | 'Active' {
  return status?.toLowerCase() === 'active' ? 'Active' : 'Upcoming';
}

// Map DB status ('active' / 'inactive') to the ScheduleStatus type SanitationScheduleCard expects.
function mapSanitationStatus(status: string): 'Upcoming' | 'Completed' | 'Missed' | 'Active' {
  return status?.toLowerCase() === 'active' ? 'Active' : 'Upcoming';
}

export default function Schedule() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [selectedTab, setSelectedTab] = useState<'feeding' | 'sanitation'>(
    'feeding'
  );

  // If we arrived here from Quick Access with a `tab` param (e.g. from the
  // dashboard's Feeding or Sanitation shortcuts), auto-select that tab.
  // This only sets the initial tab — manual tab switching afterwards is untouched.
  useEffect(() => {
    if (tab === 'feeding' || tab === 'sanitation') {
      setSelectedTab(tab);
    }
  }, [tab]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Tracks which schedule (and which type: feeding or sanitation) is targeted
  // by the current delete action.
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [pendingDeleteType, setPendingDeleteType] = useState<'feeding' | 'sanitation' | null>(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [showDeleteLoadingModal, setShowDeleteLoadingModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  // Text shown in the loading/success modals — set per delete type before opening.
  const [deleteLoadingMessage, setDeleteLoadingMessage] = useState('Deleting Schedule...');
  const [deleteSuccessTitle, setDeleteSuccessTitle] = useState('Schedule Deleted');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState(
    'Schedule has been deleted successfully.'
  );

  // Feeding Schedules loaded from the database for the logged-in farmer.
  const [feedingSchedules, setFeedingSchedules] = useState<FeedingSchedule[]>([]);
  const [loadingFeeding, setLoadingFeeding] = useState(false);

  // Load the logged-in farmer's Feeding Schedules.
  useEffect(() => {
    const loadFeedingSchedules = async () => {
      setLoadingFeeding(true);
      try {
        // The logged-in user session is stored in AsyncStorage on login.
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          console.log('No logged-in user found in AsyncStorage');
          setLoadingFeeding(false);
          return;
        }

        const user = JSON.parse(storedUser);
        const farmer_id = user?.farmer_id ?? user?.id ?? user?.user_id;

        if (!farmer_id) {
          console.log('No farmer_id found on stored user session');
          setLoadingFeeding(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/schedules/get_feeding_schedules.php?farmer_id=${farmer_id}`
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.schedules)) {
          setFeedingSchedules(data.schedules);
        } else {
          console.log('Failed to load feeding schedules:', data.message);
        }
      } catch (error) {
        console.log('Load feeding schedules error:', error);
      } finally {
        setLoadingFeeding(false);
      }
    };

    loadFeedingSchedules();
  }, []);

  // Sanitation Schedules loaded from the database for the logged-in farmer.
  const [sanitationSchedules, setSanitationSchedules] = useState<SanitationSchedule[]>([]);
  const [loadingSanitation, setLoadingSanitation] = useState(false);

  // Load the logged-in farmer's Sanitation Schedules.
  useEffect(() => {
    const loadSanitationSchedules = async () => {
      setLoadingSanitation(true);
      try {
        // The logged-in user session is stored in AsyncStorage on login.
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          console.log('No logged-in user found in AsyncStorage');
          setLoadingSanitation(false);
          return;
        }

        const user = JSON.parse(storedUser);
        const farmer_id = user?.farmer_id ?? user?.id ?? user?.user_id;

        if (!farmer_id) {
          console.log('No farmer_id found on stored user session');
          setLoadingSanitation(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/schedules/get_sanitation_schedules.php?farmer_id=${farmer_id}`
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.schedules)) {
          setSanitationSchedules(data.schedules);
        } else {
          console.log('Failed to load sanitation schedules:', data.message);
        }
      } catch (error) {
        console.log('Load sanitation schedules error:', error);
      } finally {
        setLoadingSanitation(false);
      }
    };

    loadSanitationSchedules();
  }, []);

  // Pig Pens for the logged-in farmer — loaded once here and passed down
  // to ManualOverrideControls as props, so the picker there never has to
  // fetch on its own and we avoid a duplicate network request.
  //
  // Hits a dedicated endpoint (api/iot/manual/get_pig_pens.php) built
  // specifically for the Manual Override picker, kept separate from the
  // main pig-pens listing endpoint. It expects a POST with a JSON body
  // ({ farmer_id }) and returns { success, pig_pens: [...] }.
  const [pigPens, setPigPens] = useState<PigPen[]>([]);
  const [loadingPigPens, setLoadingPigPens] = useState(false);

  useEffect(() => {
    const loadPigPens = async () => {
      setLoadingPigPens(true);
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          console.log('No logged-in user found in AsyncStorage');
          setLoadingPigPens(false);
          return;
        }

        const user = JSON.parse(storedUser);
        const farmer_id = user?.farmer_id ?? user?.id ?? user?.user_id;

        if (!farmer_id) {
          console.log('No farmer_id found on stored user session');
          setLoadingPigPens(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/iot/manual/get_pig_pens.php`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farmer_id }),
          }
        );
        const data = await response.json();

        if (data.success && Array.isArray(data.pig_pens)) {
          setPigPens(
            data.pig_pens.map((pen: any) => ({
              pen_id: pen.pen_id,
              pen_name: pen.pen_name,
              device_code: pen.device_code,
            }))
          );
        } else {
          console.log('Failed to load pig pens:', data.message);
        }
      } catch (error) {
        console.log('Load pig pens error:', error);
      } finally {
        setLoadingPigPens(false);
      }
    };

    loadPigPens();
  }, []);

  // Group Feeding Schedules by Pig Pen so each pen renders as a single card
  // containing all of its schedule entries.
  const feedingByPen = useMemo(() => {
    const groups: { pen_id: number; pen_name: string; schedules: FeedingSchedule[] }[] = [];
    const indexByPenId = new Map<number, number>();

    feedingSchedules.forEach((item) => {
      const existingIndex = indexByPenId.get(item.pen_id);
      if (existingIndex === undefined) {
        indexByPenId.set(item.pen_id, groups.length);
        groups.push({ pen_id: item.pen_id, pen_name: item.pen_name, schedules: [item] });
      } else {
        groups[existingIndex].schedules.push(item);
      }
    });

    return groups;
  }, [feedingSchedules]);

  // Group Sanitation Schedules by Pig Pen so each pen renders as a single card
  // containing all of its schedule entries.
  const sanitationByPen = useMemo(() => {
    const groups: { pen_id: number; pen_name: string; schedules: SanitationSchedule[] }[] = [];
    const indexByPenId = new Map<number, number>();

    sanitationSchedules.forEach((item) => {
      const existingIndex = indexByPenId.get(item.pen_id);
      if (existingIndex === undefined) {
        indexByPenId.set(item.pen_id, groups.length);
        groups.push({ pen_id: item.pen_id, pen_name: item.pen_name, schedules: [item] });
      } else {
        groups[existingIndex].schedules.push(item);
      }
    });

    return groups;
  }, [sanitationSchedules]);

  // Deletes the currently selected schedule (Feeding or Sanitation, based on
  // pendingDeleteType). Called when the user confirms deletion in DeleteScheduleModal.
  const handleDeleteSchedule = async () => {
    if (selectedScheduleId === null || pendingDeleteType === null || isDeletingSchedule) {
      return;
    }

    const isFeeding = pendingDeleteType === 'feeding';
    const endpoint = isFeeding ? 'delete_feeding_schedule.php' : 'delete_sanitation_schedule.php';
    const idField = isFeeding ? 'schedule_id' : 'sanitation_id';

    setIsDeletingSchedule(true);
    setShowDeleteModal(false);
    setDeleteLoadingMessage(
      isFeeding ? 'Deleting Feeding Schedule...' : 'Deleting Sanitation Schedule...'
    );
    setShowDeleteLoadingModal(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/schedules/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [idField]: selectedScheduleId }),
        }
      );
      const data = await response.json();

      setShowDeleteLoadingModal(false);

      if (data.success) {
        if (isFeeding) {
          setFeedingSchedules((prev) =>
            prev.filter((item) => item.schedule_id !== selectedScheduleId)
          );
        } else {
          setSanitationSchedules((prev) =>
            prev.filter((item) => item.sanitation_id !== selectedScheduleId)
          );
        }
        setDeleteSuccessTitle('Schedule Deleted');
        setDeleteSuccessMessage(
          isFeeding
            ? 'Feeding Schedule has been deleted successfully.'
            : 'Sanitation Schedule has been deleted successfully.'
        );
        setShowDeleteSuccessModal(true);
      } else {
        Alert.alert('Delete Failed', data.message ?? 'Schedule not found.');
      }
    } catch (error) {
      console.log('Delete schedule error:', error);
      setShowDeleteLoadingModal(false);
      Alert.alert('Delete Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsDeletingSchedule(false);
      setSelectedScheduleId(null);
      setPendingDeleteType(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScheduleHeader
        onAddSchedulePress={() =>
          router.push('/schedule/add-schedule')
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ManualOverrideControls pigPens={pigPens} loadingPigPens={loadingPigPens} />

        <View style={styles.tabsSection}>
          <ScheduleTypeTabs
            selectedTab={selectedTab}
            onChange={setSelectedTab}
          />
        </View>

        {selectedTab === 'feeding' ? (
          loadingFeeding ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color="#2F5D50" />
            </View>
          ) : feedingSchedules.length > 0 ? (
            <View style={styles.cardsSection}>
              {feedingByPen.map((group) => (
                <FeedingScheduleCard
                  key={group.pen_id}
                  target={group.pen_name}
                  entries={group.schedules.map((item) => ({
                    id: item.schedule_id,
                    scheduleTime: formatTo12Hour(item.feeding_time),
                    status: mapFeedingStatus(item.status),
                    feedAmountPerPig: item.feed_amount_per_pig,
                    totalFeedRequired: item.total_feed_required,
                    feedPerContainer: item.feed_per_container,
                    onEditPress: () =>
                      router.push({
                        pathname: '/schedule/edit-schedule',
                        params: {
                          schedule_id: String(item.schedule_id),
                          mode: 'feeding',
                        },
                      }),
                    onDeletePress: () => {
                      setSelectedScheduleId(item.schedule_id);
                      setPendingDeleteType('feeding');
                      setShowDeleteModal(true);
                    },
                  }))}
                />
              ))}
            </View>
          ) : (
            <EmptySchedule />
          )
        ) : loadingSanitation ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#2F5D50" />
          </View>
        ) : sanitationSchedules.length > 0 ? (
          <View style={styles.cardsSection}>
            {sanitationByPen.map((group) => (
              <SanitationScheduleCard
                key={group.pen_id}
                target={group.pen_name}
                entries={group.schedules.map((item) => ({
                  id: item.sanitation_id,
                  scheduleTime: formatTo12Hour(item.schedule_time),
                  durationMinutes: item.duration_minutes,
                  triggerTemperature: item.trigger_temperature,
                  status: mapSanitationStatus(item.status),
                  onEditPress: (sanitation_id: number | string) =>
                    router.push({
                      pathname: '/schedule/edit-schedule',
                      params: {
                        sanitation_id: String(sanitation_id),
                        mode: 'sanitation',
                      },
                    }),
                  onDeletePress: () => {
                    setSelectedScheduleId(item.sanitation_id);
                    setPendingDeleteType('sanitation');
                    setShowDeleteModal(true);
                  },
                }))}
              />
            ))}
          </View>
        ) : (
          <EmptySchedule />
        )}
      </ScrollView>

      <DeleteScheduleModal
        visible={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedScheduleId(null);
          setPendingDeleteType(null);
        }}
        onConfirm={() => {
          if (selectedScheduleId !== null && pendingDeleteType !== null) {
            handleDeleteSchedule();
          } else {
            setShowDeleteModal(false);
          }
        }}
      />

      <DeleteLoadingModal visible={showDeleteLoadingModal} message={deleteLoadingMessage} />

      <DeleteSuccessModal
        visible={showDeleteSuccessModal}
        title={deleteSuccessTitle}
        message={deleteSuccessMessage}
        onConfirm={() => setShowDeleteSuccessModal(false)}
      />
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 45, 39, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  message: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 19,
  },
  button: {
    marginTop: 22,
    width: '100%',
    backgroundColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  content: {
    paddingBottom: 20,
  },

  tabsSection: {
    marginTop: 14,
  },

  cardsSection: {
    marginTop: 14,
    gap: 14,
  },

  loadingSection: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});