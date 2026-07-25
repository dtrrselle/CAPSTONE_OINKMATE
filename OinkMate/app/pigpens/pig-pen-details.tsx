import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

interface PigPen {
  pen_id: number;
  device_code: string;
  pen_name: string;
  description: string;
  created_at: string;
  pig_count: number;
  avg_weight: number;
  updated_at: string;
  currentAge: string;
  growthStage: string;
  feedType: string;
  recommendedFeed: number;
  source: string;
}

function formatDate(dateString?: string) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function PigPenDetails() {
  const router = useRouter();
  const { pen_id } = useLocalSearchParams<{ pen_id: string }>();

  const [pigPen, setPigPen] = useState<PigPen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPigPenDetails = useCallback(async () => {
    if (!pen_id) {
      setError('Missing pen ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/api/pig-pens/get_pig_pen_details.php?pen_id=${pen_id}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.pig_pen) {
        setPigPen(data.pig_pen);
      } else {
        setPigPen(null);
      }
    } catch (err) {
      setError('Something went wrong while loading pen details.');
      setPigPen(null);
    } finally {
      setLoading(false);
    }
  }, [pen_id]);

  useEffect(() => {
    fetchPigPenDetails();
  }, [fetchPigPenDetails]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pig Pen Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2F5D50" />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={28} color="#B3261E" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !pigPen ? (
        <View style={styles.centerState}>
          <Ionicons name="home-outline" size={28} color="#8A9994" />
          <Text style={styles.emptyText}>Pig Pen Not Found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewTopRow}>
              <View style={styles.penIconWrap}>
                <Ionicons name="home" size={24} color="#2F5D50" />
              </View>
              <View style={styles.overviewTitleBlock}>
                <Text style={styles.penName}>{pigPen.pen_name}</Text>
                <Text style={styles.penSubtext}>{pigPen.pig_count} Pigs</Text>
              </View>
            </View>

            <View style={styles.chipsRow}>
              <View style={[styles.chip, styles.chipGreen]}>
                <Ionicons name="layers-outline" size={13} color="#2F5D50" />
                <Text style={styles.chipTextGreen}>{pigPen.growthStage}</Text>
              </View>
            </View>
          </View>

          {/* Pen Information — from pig_pens */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="information-circle-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Pen Information</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Pen Name</Text>
              <Text style={styles.infoValue}>{pigPen.pen_name}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Device Code</Text>
              <Text style={styles.infoValue}>{pigPen.device_code}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Date Added</Text>
              <Text style={styles.infoValue}>{formatDate(pigPen.created_at)}</Text>
            </View>
          </View>

          {/* Description — from pig_pens */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="document-text-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>
              {pigPen.description || 'No description available.'}
            </Text>
          </View>

          {/* Pen Records — from pig_pen_records */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="clipboard-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Pen Records</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Number of Pigs</Text>
              <Text style={styles.infoValue}>{pigPen.pig_count}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Current Age</Text>
              <Text style={styles.infoValue}>{pigPen.currentAge}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Average Weight</Text>
              <Text style={styles.infoValue}>{pigPen.avg_weight} kg</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Last Updated</Text>
              <Text style={styles.infoValue}>{formatDate(pigPen.updated_at)}</Text>
            </View>
          </View>

          {/* Feeding Recommendation — from the backend Recommendation Engine */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="nutrition-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Feeding Recommendation</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Growth Stage</Text>
              <Text style={styles.infoValue}>{pigPen.growthStage}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Feed Type</Text>
              <Text style={styles.infoValue}>{pigPen.feedType}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Recommended Feed Intake</Text>
              <Text style={styles.infoValue}>{pigPen.recommendedFeed} kg/day per pig</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Source</Text>
              <Text style={styles.infoValue}>{pigPen.source}</Text>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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

  /* Center states (loading / error / empty) */
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#B3261E',
    fontFamily: 'Inter',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '700',
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

  /* Overview Card */
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  overviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  penIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTitleBlock: {
    gap: 3,
  },
  penName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
  },
  penSubtext: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chipGreen: {
    backgroundColor: '#EAF7F1',
  },
  chipTextGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
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

  /* Info rows */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoKey: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#1A2D27',
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
  },

  /* Description */
  descriptionText: {
    fontSize: 13,
    color: '#4A5C57',
    fontFamily: 'Inter',
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },
});