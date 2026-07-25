import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Database record shape this screen renders. The list endpoint only
// returns the fields below; `body` / `source_url` are fetched later
// by the Details screen via get_educational_content_details.php.
interface EducationalContent {
  id: string;
  title: string;
  category: string;
  author: string;
  description: string;
  body?: string;
  source_url?: string;
}

// NOTE: Update this to match the exact API base URL constant/config
// already used by the other OinkMate screens (e.g. imported from the
// project's shared API config). Kept local here since no new files
// may be created for this task.
const API_BASE_URL = 'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api';

const CATEGORIES = ['All', 'Feeding', 'Health', 'Sanitation', 'Housing', 'Biosecurity'];

export default function LearningHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [isLoading, setIsLoading] = useState(true);
  const [educationalContents, setEducationalContents] = useState<EducationalContent[]>([]);

  useEffect(() => {
    fetchEducationalContents();
  }, []);

  const fetchEducationalContents = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`${API_BASE_URL}/learning/get_educational_contents.php`);
      const json = await response.json();

      if (json.success) {
        setEducationalContents(json.data);
      } else {
        setEducationalContents([]);
      }
    } catch (error) {
      console.log('Error fetching educational contents:', error);
      setEducationalContents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasContents = educationalContents.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header — same design language as ReportsHeader */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <View style={styles.titleBlock}>
          <Text style={styles.headerTitle}>Educational Contents</Text>
          <Text style={styles.headerSubtitle}>Learn proper piggery management practices</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8A9994" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search educational contents..."
            placeholderTextColor="#A9B5B0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORIES.map((category) => {
            const isActive = category === activeCategory;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content List */}
        <View style={styles.listSection}>
          {isLoading ? (
            <View style={styles.stateCard}>
              <View style={styles.loadingSpinnerWrap}>
                <Ionicons name="reload" size={26} color="#2F5D50" />
              </View>
              <Text style={styles.stateTitle}>Loading Educational Contents</Text>
              <Text style={styles.stateDescription}>
                Please wait while we fetch the latest materials.
              </Text>
            </View>
          ) : !hasContents ? (
            <View style={styles.stateCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="book-outline" size={28} color="#D96C8D" />
              </View>
              <Text style={styles.stateTitle}>No Educational Contents</Text>
              <Text style={styles.stateDescription}>
                Educational materials will appear here once available.
              </Text>
            </View>
          ) : (
            educationalContents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={styles.thumbnailWrap}>
                  <Ionicons name="document-text-outline" size={26} color="#2F5D50" />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <Text style={styles.authorText} numberOfLines={1}>
                      {item.author}
                    </Text>
                  </View>

                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.readMoreText}>Read More</Text>
                    <Ionicons name="chevron-forward" size={16} color="#2F5D50" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  // Header — mirrors ReportsHeader design exactly
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 5,
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  titleBlock: {
    marginTop: -2,
    gap: 0,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2D27',
    letterSpacing: -0.4,
    fontFamily: 'Inter',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A2D27',
    fontFamily: 'Inter',
    padding: 0,
  },

  // Category Chips
  chipsRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAF7F1',
  },
  chipActive: {
    backgroundColor: '#2F5D50',
    borderColor: '#2F5D50',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C6F68',
    fontFamily: 'Inter',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // List
  listSection: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  thumbnailWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.1,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#FBEEF1',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Inter',
  },
  authorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
    flexShrink: 1,
  },
  descriptionText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#5C6F68',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
  },

  // Loading / Empty States
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  loadingSpinnerWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBEEF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 18,
  },
});