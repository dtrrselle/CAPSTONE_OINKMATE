import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PigPensHeader from '../../components/pig-pens/PigPensHeader';
import PigSummaryCards from '../../components/pig-pens/PigSummaryCards';
import PenFilter from '../../components/pig-pens/PenFilter';
import SearchBar from '../../components/pig-pens/SearchBar';
import PigPenCard, { GrowthStage } from '../../components/pig-pens/PigPenCard';
import DeletePigPenModal from '../../components/pig-pens/DeletePigPenModal';

const API_BASE =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api/pig-pens';

const ENVIRONMENT_API_BASE =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api/iot/environment';

// How often (ms) to auto-refresh pig pens + latest environmental/feed
// data while this screen is focused. Roughly matches how often the
// Pico uploads new readings (every 10s), so the UI feels current
// without polling far more often than the data actually changes.
const PIG_PENS_REFRESH_INTERVAL_MS = 10000;

interface PigPen {
  pen_id: number;
  device_code: string;
  pen_name: string;
  description: string | null;
  pig_count: number | null;
  pig_age_at_registration: number | null;
  avg_weight: number | null;
  currentAge: string;
  growthStage: GrowthStage;
  feedType: string;
  recommendedFeed: number;
  source: string;
  // Latest environmental/feed readings, merged in from
  // get_latest_environment.php after pig pens are loaded. Left
  // undefined until that request resolves (or if a pen has no
  // reading yet), so PigPenCard falls back to its own placeholders.
  temperature?: string;
  humidity?: string;
  ammonia?: string;
  feed_level_1?: number;
  feed_level_2?: number;
  feed_level_3?: number;
  overall_level?: number;
  last_updated?: string | null;
}

// Shape of a single row returned by get_latest_environment.php.
interface LatestEnvironmentRecord {
  pen_id: number;
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  feed_level_1: number | null;
  feed_level_2: number | null;
  feed_level_3: number | null;
  overall_level: number | null;
  last_updated: string | null;
}

export default function PigPens() {
  const router = useRouter();

  const [pigPens, setPigPens] = useState<PigPen[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [penToDelete, setPenToDelete] = useState<PigPen | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterId, setSelectedFilterId] = useState('all');

  const fetchLatestEnvironment = useCallback(
    async (farmerId: number | string): Promise<Map<number, LatestEnvironmentRecord>> => {
      const envByPenId = new Map<number, LatestEnvironmentRecord>();

      try {
        const response = await fetch(
          `${ENVIRONMENT_API_BASE}/get_latest_environment.php?farmer_id=${encodeURIComponent(
            String(farmerId)
          )}`
        );

        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          result.data.forEach((record: LatestEnvironmentRecord) => {
            envByPenId.set(record.pen_id, record);
          });
        } else {
          console.log('Failed to load latest environment data:', result.message);
        }
      } catch (error) {
        // Never let a failed/unreachable environment request stop the
        // Pig Pens screen - pens are still shown with placeholder values.
        console.log('Error loading latest environment data:', error);
      }

      return envByPenId;
    },
    []
  );

  const loadPigPens = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const farmerId = user?.farmer_id;

      if (!farmerId) {
        console.log('No farmer_id found in session');
        setPigPens([]);
        return;
      }

      const response = await fetch(`${API_BASE}/get_pig_pens.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: farmerId }),
      });

      const result = await response.json();

      if (!result.success) {
        console.log('Failed to load pig pens:', result.message);
        setPigPens([]);
        return;
      }

      const basePigPens: PigPen[] = result.pig_pens || [];

      // Fetch latest environmental/feed readings for this farmer, matched
      // to each pen by pen_id further below. If this request fails, an
      // empty map is returned and every pen simply keeps its placeholder
      // environmental values.
      const envByPenId = await fetchLatestEnvironment(farmerId);

      const mergedPigPens: PigPen[] = basePigPens.map((pen) => {
        const env = envByPenId.get(pen.pen_id);

        if (!env) {
          return pen;
        }

        return {
          ...pen,
          temperature: env.temperature !== null ? `${env.temperature}°C` : undefined,
          humidity: env.humidity !== null ? `${env.humidity}%` : undefined,
          ammonia: env.ammonia !== null ? `${env.ammonia}` : undefined,
          feed_level_1: env.feed_level_1 ?? undefined,
          feed_level_2: env.feed_level_2 ?? undefined,
          feed_level_3: env.feed_level_3 ?? undefined,
          overall_level: env.overall_level ?? undefined,
          last_updated: env.last_updated,
        };
      });

      setPigPens(mergedPigPens);
    } catch (error) {
      console.log('Error loading pig pens:', error);
      setPigPens([]);
    }
  }, [fetchLatestEnvironment]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // Initial load when the screen gains focus - shows the loading
      // spinner since there's no data on screen yet.
      setLoading(true);
      loadPigPens().finally(() => {
        if (isActive) setLoading(false);
      });

      // Auto-refresh: re-fetch pig pens + latest environmental/feed
      // readings on an interval while this screen stays focused, so
      // temperature/humidity/ammonia/feed levels stay current without
      // needing to leave and re-enter the screen. Background refreshes
      // do NOT toggle the loading spinner - only the initial load does.
      const refreshIntervalId = setInterval(() => {
        loadPigPens();
      }, PIG_PENS_REFRESH_INTERVAL_MS);

      return () => {
        isActive = false;
        clearInterval(refreshIntervalId);
      };
    }, [loadPigPens])
  );

  const summaryStats = useMemo(() => {
    const totalPens = pigPens.length;
    const totalPigs = pigPens.reduce(
      (sum, pen) => sum + (pen.pig_count ?? 0),
      0
    );

    // Growth Stage counts now come from the backend Recommendation Engine
    // (feeding_reference.csv) via pen.growthStage.
    const creepPens = pigPens.filter((pen) => pen.growthStage === 'Creep').length;
    const preStarterPens = pigPens.filter((pen) => pen.growthStage === 'Pre-Starter').length;
    const starterPens = pigPens.filter((pen) => pen.growthStage === 'Starter').length;
    const growerPens = pigPens.filter((pen) => pen.growthStage === 'Grower').length;
    const finisherPens = pigPens.filter((pen) => pen.growthStage === 'Finisher').length;

    return {
      totalPens,
      totalPigs,
      creepPens,
      preStarterPens,
      starterPens,
      growerPens,
      finisherPens,
    };
  }, [pigPens]);

  const filteredPigPens = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return pigPens.filter((pen) => {
      // Growth Stage now comes from the backend recommendation engine via
      // pen.growthStage.
      const matchesFilter =
        selectedFilterId === 'all' ||
        (pen.growthStage ?? '').toLowerCase() === selectedFilterId;

      const matchesSearch =
        query === '' ||
        (pen.pen_name ?? '').toLowerCase().includes(query) ||
        (pen.device_code ?? '').toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [pigPens, searchQuery, selectedFilterId]);

  const handleDeletePress = (pen: PigPen) => {
    setPenToDelete(pen);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setPenToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!penToDelete) return;

    setIsDeleting(true);

    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const farmerId = user?.farmer_id;

      const response = await fetch(`${API_BASE}/delete_pig_pen.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pen_id: penToDelete.pen_id,
          farmer_id: farmerId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await loadPigPens();
        setShowDeleteModal(false);
        setPenToDelete(null);
        setShowSuccessModal(true);
      } else {
        console.log('Failed to delete pig pen:', result.message);
      }
    } catch (error) {
      console.log('Error deleting pig pen:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasPigPens = pigPens.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <PigPensHeader
        onAddPenPress={() =>
          router.push('/pigpens/add-pig-pen')
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <PigSummaryCards
            totalPens={summaryStats.totalPens}
            totalPigs={summaryStats.totalPigs}
            creepPens={summaryStats.creepPens}
            preStarterPens={summaryStats.preStarterPens}
            starterPens={summaryStats.starterPens}
            growerPens={summaryStats.growerPens}
            finisherPens={summaryStats.finisherPens}
          />
        </View>

        <View style={styles.filterSection}>
          <PenFilter
            defaultSelectedId={selectedFilterId}
            onSelect={(id) => setSelectedFilterId(id)}
          />
        </View>

        <View style={styles.searchSection}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {loading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#2F5D50" />
          </View>
        ) : filteredPigPens.length > 0 ? (
          <View style={styles.cardsSection}>
            {filteredPigPens.map((pen) => (
              <PigPenCard
                key={pen.pen_id}
                penName={pen.pen_name}
                deviceCode={pen.device_code}
                pigCount={pen.pig_count ?? 0}
                growthStage={pen.growthStage}
                currentAge={pen.currentAge}
                temperature={pen.temperature ?? 'No Data'}
                humidity={pen.humidity ?? 'No Data'}
                ammonia={pen.ammonia ?? 'No Data'}
                feedLevel={pen.overall_level}
                feedLevel1={pen.feed_level_1}
                feedLevel2={pen.feed_level_2}
                feedLevel3={pen.feed_level_3}
                isDeleting={isDeleting && penToDelete?.pen_id === pen.pen_id}
                onEditPress={() => {
                  console.log('EDIT PEN:', pen);
                  console.log('EDIT PEN ID:', pen.pen_id);
                  router.push({
                    pathname: '/pigpens/edit-pig-pen',
                    params: {
                      pen_id: pen.pen_id,
                    },
                  });
                }}
                onDeletePress={() => handleDeletePress(pen)}
                onViewDetailsPress={() => {
                  console.log('VIEW DETAILS PEN:', pen);
                  console.log('VIEW DETAILS PEN ID:', pen.pen_id);
                  router.push({
                    pathname: '/pigpens/pig-pen-details',
                    params: {
                      pen_id: pen.pen_id,
                    },
                  });
                }}
              />
            ))}
          </View>
        ) : hasPigPens ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No Matching Pig Pens</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filter.
            </Text>
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptyTitle}>No Pig Pens Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap Add Pig Pen to create your first pig pen.
            </Text>
          </View>
        )}
      </ScrollView>

      <DeletePigPenModal
        visible={showDeleteModal}
        penName={penToDelete?.pen_name}
        isDeleting={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowSuccessModal(false)}
        >
          <Pressable style={styles.successModal} onPress={() => {}}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#2F5D50" />
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.successTitle}>Pig Pen Deleted</Text>
              <Text style={styles.successSubtitle}>
                The pig pen and its records have been removed, and the device
                is now available for reassignment.
              </Text>
            </View>

            <Pressable
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  content: {
    paddingBottom: 40,
  },

  section: {
    marginTop: 20,
  },

  filterSection: {
    marginTop: 16,
  },

  searchSection: {
    marginTop: 12,
  },

  cardsSection: {
    marginTop: 16,
    gap: 14,
  },

  loadingSection: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptySection: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 6,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },

  emptySubtitle: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,45,36,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  successModal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },

  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF7F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textBlock: {
    alignItems: 'center',
    gap: 8,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },

  successSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#8A9994',
    lineHeight: 20,
    fontFamily: 'Inter',
  },

  successButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2F5D50',
  },

  successButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});