import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: confirm this is the exact, non-truncated ngrok URL (it changes every
// time the tunnel restarts on the free tier)
const API_BASE_URL = 'https://unmotivated-marietta-unbuffered.ngrok-free.dev';

type ModalState = 'none' | 'validation' | 'confirm' | 'loading' | 'success' | 'error';

// -----------------------------------------------------------------------
// Reusable animated modal shell — fades in the overlay and scales the card
// -----------------------------------------------------------------------
function AnimatedModalShell({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.9);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose || (() => {})}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
        <Animated.View style={[styles.modalCard, { transform: [{ scale: cardScale }] }]}>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function Feedback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState('');
  const [modalState, setModalState] = useState<ModalState>('none');

  const submitFeedback = async () => {
    setModalState('loading');
    const MIN_LOADING_MS = 3000; // minimum time the loading modal stays visible
    const startedAt = Date.now();

    const waitForMinDuration = async () => {
      const elapsed = Date.now() - startedAt;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
    };

    try {
      const userJson = await AsyncStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      const farmer_id = user?.farmer_id;

      console.log('[Feedback] AsyncStorage user raw:', userJson);
      console.log('[Feedback] resolved farmer_id:', farmer_id);

      const response = await fetch(
        `${API_BASE_URL}/oinkmate-api/api/profile/submit_feedback.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
          body: JSON.stringify({
            farmer_id: farmer_id,
            feedback: feedback.trim(),
          }),
        }
      );

      // ── DEBUG: log the raw response so we can see the real failure reason ──
      console.log('[Feedback] status:', response.status);
      const rawText = await response.text();
      console.log('[Feedback] raw response body:', rawText);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.log('[Feedback] JSON parse failed:', parseErr);
        setModalState('error');
        return;
      }

      console.log('[Feedback] parsed data:', data);

      if (data.success) {
        await waitForMinDuration();
        setModalState('success');
      } else {
        console.log('[Feedback] server returned success:false ->', data.message);
        await waitForMinDuration();
        setModalState('error');
      }
    } catch (error) {
      console.log('[Feedback] fetch threw an error:', error);
      await waitForMinDuration();
      setModalState('error');
    }
  };

  const handleSubmitPress = () => {
    if (!feedback.trim()) {
      setModalState('validation');
      return;
    }
    setModalState('confirm');
  };

  const handleDone = () => {
    setModalState('none');
    setFeedback('');
    router.replace('/profile/help-support');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Feedback</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.introText}>
          We value your feedback. Share your comments, suggestions, or report any issues to help improve OinkMate.
        </Text>

        <Text style={styles.sectionLabel}>Feedback</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.textInput}
            placeholder="Write your comments here..."
            placeholderTextColor="#9AACAB"
            value={feedback}
            onChangeText={setFeedback}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmitPress}
        >
          <Text style={styles.submitBtnText}>Submit Feedback</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Validation Modal — feedback field is empty */}
      <AnimatedModalShell
        visible={modalState === 'validation'}
        onRequestClose={() => setModalState('none')}
      >
        <View style={styles.iconWrapWarning}>
          <Ionicons name="alert-circle-outline" size={38} color="#D97706" />
        </View>
        <Text style={styles.modalTitle}>Feedback Required</Text>
        <Text style={styles.modalMessage}>Please enter your feedback.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => setModalState('none')}
        >
          <Text style={styles.primaryBtnText}>Okay</Text>
        </TouchableOpacity>
      </AnimatedModalShell>

      {/* Confirmation Modal */}
      <AnimatedModalShell
        visible={modalState === 'confirm'}
        onRequestClose={() => setModalState('none')}
      >
        <Text style={styles.modalTitle}>Submit Feedback?</Text>
        <Text style={styles.modalMessage}>
          Are you sure you want to submit your feedback? Your comments will be sent to the OinkMate team.
        </Text>
        <View style={styles.modalBtnRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.85}
            onPress={() => setModalState('none')}
          >
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtnHalf}
            activeOpacity={0.85}
            onPress={submitFeedback}
          >
            <Text style={styles.primaryBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </AnimatedModalShell>

      {/* Loading Modal — not dismissible */}
      <AnimatedModalShell visible={modalState === 'loading'}>
        <ActivityIndicator size="large" color="#2F5D50" style={styles.loadingSpinner} />
        <Text style={styles.modalTitle}>Submitting Feedback...</Text>
        <Text style={styles.modalMessage}>
          Please wait while we securely send your feedback.
        </Text>
      </AnimatedModalShell>

      {/* Success Modal */}
      <AnimatedModalShell visible={modalState === 'success'} onRequestClose={handleDone}>
        <View style={styles.iconWrapSuccess}>
          <Ionicons name="checkmark-circle" size={40} color="#2F5D50" />
        </View>
        <Text style={styles.modalTitle}>Feedback Submitted</Text>
        <Text style={styles.modalMessage}>
          Thank you for sharing your feedback. Your comments have been received successfully and will help us improve OinkMate.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={handleDone}
        >
          <Text style={styles.primaryBtnText}>Done</Text>
        </TouchableOpacity>
      </AnimatedModalShell>

      {/* Error Modal */}
      <AnimatedModalShell
        visible={modalState === 'error'}
        onRequestClose={() => setModalState('none')}
      >
        <View style={styles.iconWrapError}>
          <Ionicons name="close-circle" size={40} color="#C0392B" />
        </View>
        <Text style={styles.modalTitle}>Submission Failed</Text>
        <Text style={styles.modalMessage}>
          We couldn't submit your feedback right now. Please check your internet connection and try again.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={submitFeedback}
        >
          <Text style={styles.primaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </AnimatedModalShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  /* Header — copied exactly from help-support.tsx, only title text changes */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backBtn: {
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
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B22',
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },

  introText: {
    fontSize: 12.5,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 19,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    padding: 14,
  },

  textInput: {
    minHeight: 180,
    fontSize: 13,
    color: '#1A2D27',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 19,
  },

  /* Submit button — existing OinkMate green button style */
  submitBtn: {
    backgroundColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: 0.2,
  },

  bottomSpacer: { height: 24 },

  /* ---------------- Modals ---------------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 45, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A2B22',
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 12.5,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },

  /* Icon wraps */
  iconWrapSuccess: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapError: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FBEAE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconWrapWarning: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FDF3E3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  loadingSpinner: {
    marginBottom: 16,
  },

  /* Buttons within modals */
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
    letterSpacing: 0.2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
    letterSpacing: 0.2,
  },
  primaryBtnHalf: {
    flex: 1,
    backgroundColor: '#2F5D50',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});