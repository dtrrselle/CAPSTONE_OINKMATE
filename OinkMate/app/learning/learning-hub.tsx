import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArticleModal, { EducationalContent } from './article_modal';

// NOTE: Update this to match the exact API base URL constant/config
// already used by the other OinkMate screens (e.g. imported from the
// project's shared API config). Kept local here since no new files
// may be created for this task.
const API_BASE_URL = 'https://oinkmate.online/oinkmate-api/api';

// "View More" now opens the article as an in-place modal (see
// app/learning/article-modal.tsx) instead of navigating to a new
// screen, so app/learning/article_details.tsx is no longer used by
// this screen and can be removed from the router if desired.

const CATEGORIES = [
  'All Categories',
  'Feeding Guide',
  'Sanitation Guide',
  'Pig Health',
  'Disease Prevention',
  'Farm Management',
  'Advisory',
];

export default function LearningHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Categories');

  const [isLoading, setIsLoading] = useState(true);
  const [educationalContents, setEducationalContents] = useState<EducationalContent[]>([]);

  // Drives the article "View More" modal — no navigation involved, the
  // Learning Hub list stays mounted and visible behind it.
  const [selectedArticle, setSelectedArticle] = useState<EducationalContent | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

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

  // Single source of truth for filtering: combines the search text and the
  // selected category so both list rendering and any future "no results"
  // messaging stay in sync without duplicating the filter logic.
  const filteredContents = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return educationalContents.filter((item) => {
      const matchesCategory =
        activeCategory === 'All Categories' || item.category === activeCategory;
      const matchesSearch =
        normalizedQuery === '' || item.title.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [educationalContents, activeCategory, searchQuery]);

  const hasContents = filteredContents.length > 0;

  // Opens the already-fetched article in the overlay modal — no navigation
  // and no extra API call needed.
  const handleViewArticle = (item: EducationalContent) => {
    setSelectedArticle(item);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header — mirrors the Expenses header exactly, minus the Add button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace('/(tabs)/reports')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={18} color="#2F5D50" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Educational Content</Text>
        </View>

        {/* Spacer to balance the back button so the title stays centered */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#2F5D50" />
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
                <Ionicons name="book-outline" size={28} color="#2F5D50" />
              </View>
              <Text style={styles.stateTitle}>No Educational Contents</Text>
              <Text style={styles.stateDescription}>
                Educational materials will appear here once available.
              </Text>
            </View>
          ) : (
            filteredContents.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => handleViewArticle(item)}
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

      {/* "View More" overlay — Learning Hub stays visible and dimmed behind it */}
      <ArticleModal
        visible={isModalVisible}
        article={selectedArticle}
        onClose={handleCloseModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  // Header — copied from the Expenses screen header, minus the Add button.
  // A same-width spacer view replaces it so the centered block stays centered.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A2D27',
    letterSpacing: -0.2,
    textAlign: 'center',
    fontFamily: 'Arial',
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
    fontSize: 17,
    color: '#1A2D27',
    fontFamily: 'Arial',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#5C6F68',
    fontFamily: 'Arial',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Arial',
  },
  authorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Arial',
    flexShrink: 1,
  },
  descriptionText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5C6F68',
    fontFamily: 'Arial',
    lineHeight: 18,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  readMoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Arial',
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
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Arial',
    textAlign: 'center',
    lineHeight: 18,
  },
});