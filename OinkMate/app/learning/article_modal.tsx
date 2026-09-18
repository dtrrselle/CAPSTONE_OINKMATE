import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Same shape used by the Learning Hub list screen.
export interface EducationalContent {
  id: string;
  title: string;
  category: string;
  author: string;
  description: string;
  body?: string;
  source_url?: string;
  image_url?: string;
  published_date?: string;
}

interface ArticleModalProps {
  visible: boolean;
  article: EducationalContent | null;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Splits the body copy into lines and gives bullet / numbered lines a bit of
// extra styling so plain text content still reads like a formatted article.
function renderBodyContent(body: string) {
  const lines = body.split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed === '') {
      return <View key={index} style={styles.bodySpacer} />;
    }

    const bulletMatch = /^[-*•]\s+(.*)/.exec(trimmed);
    const numberedMatch = /^(\d+[.)])\s+(.*)/.exec(trimmed);

    if (bulletMatch) {
      return (
        <View key={index} style={styles.listRow}>
          <Text style={styles.listBullet}>{'\u2022'}</Text>
          <Text style={styles.bodyText}>{bulletMatch[1]}</Text>
        </View>
      );
    }

    if (numberedMatch) {
      return (
        <View key={index} style={styles.listRow}>
          <Text style={styles.listNumber}>{numberedMatch[1]}</Text>
          <Text style={styles.bodyText}>{numberedMatch[2]}</Text>
        </View>
      );
    }

    return (
      <Text key={index} style={styles.bodyText}>
        {trimmed}
      </Text>
    );
  });
}

export default function ArticleModal({ visible, article, onClose }: ArticleModalProps) {
  // Drives the fade + slide-up entrance/exit so the modal feels animated
  // rather than just popping in/out.
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(24);
    }
  }, [visible]);

  const handleOpenSource = () => {
    if (article?.source_url) {
      Linking.openURL(article.source_url);
    }
  };

  if (!article) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Tapping the dimmed backdrop dismisses the modal */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          {/* Swallow taps on the card itself so they don't bubble to the backdrop */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Close article"
              >
                <Ionicons name="close" size={20} color="#33433D" />
              </TouchableOpacity>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                indicatorStyle="black"
                persistentScrollbar
                scrollIndicatorInsets={{ right: 1 }}
              >
                {/* Article Image */}
                {article.image_url ? (
                  <Image
                    source={{ uri: article.image_url }}
                    style={styles.headerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.headerImagePlaceholder}>
                    <Ionicons name="document-text-outline" size={44} color="#2F5D50" />
                  </View>
                )}

                <View style={styles.content}>
                  {/* Category Badge */}
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{article.category}</Text>
                  </View>

                  {/* Title */}
                  <Text style={styles.title}>{article.title}</Text>

                  {/* Author and Date */}
                  <Text style={styles.metaText}>
                    By {article.author}
                    {article.published_date ? ` • ${article.published_date}` : ''}
                  </Text>

                  {/* Short Description */}
                  {!!article.description && (
                    <Text style={styles.description}>{article.description}</Text>
                  )}

                  {/* Full Content */}
                  {!!article.body && (
                    <View style={styles.bodyWrap}>{renderBodyContent(article.body)}</View>
                  )}

                  {/* Source */}
                  {!!article.source_url && (
                    <View style={styles.sourceRow}>
                      <Text style={styles.sourceLabel}>Source: </Text>
                      <TouchableOpacity onPress={handleOpenSource} activeOpacity={0.7}>
                        <Text style={styles.sourceLink}>{article.source_url}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 17, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    width: '88%',
    maxHeight: SCREEN_HEIGHT * 0.82,
    minHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },

  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },

  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 28,
  },

  // Header Image
  headerImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#EAF7F1',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 12,
  },

  // Category Badge
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FBEEF1',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  categoryBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D96C8D',
    fontFamily: 'Arial',
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
    letterSpacing: -0.3,
    lineHeight: 26,
  },

  // Author and Date
  metaText: {
    fontSize: 15.5,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Arial',
  },

  // Short Description
  description: {
    fontSize: 17.5,
    fontWeight: '600',
    color: '#5C6F68',
    fontFamily: 'Arial',
    lineHeight: 21,
    marginTop: 2,
  },

  // Full Content
  bodyWrap: {
    marginTop: 6,
    gap: 8,
  },
  bodyText: {
    flex: 1,
    fontSize: 17.5,
    fontWeight: '400',
    color: '#33433D',
    fontFamily: 'Arial',
    lineHeight: 22,
  },
  bodySpacer: {
    height: 6,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  listBullet: {
    fontFamily: 'Arial',
    fontSize: 17.5,
    color: '#2F5D50',
    fontWeight: '700',
    lineHeight: 22,
  },
  listNumber: {
    fontFamily: 'Arial',
    fontSize: 17.5,
    color: '#2F5D50',
    fontWeight: '700',
    lineHeight: 22,
    minWidth: 20,
  },

  // Source
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F0',
  },
  sourceLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C6F68',
    fontFamily: 'Arial',
  },
  sourceLink: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F5D50',
    fontFamily: 'Arial',
    textDecorationLine: 'underline',
  },
});