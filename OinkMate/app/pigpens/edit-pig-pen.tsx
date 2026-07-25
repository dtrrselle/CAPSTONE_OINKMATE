import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
}

function getErrorModalConfig(code?: string, fallbackMessage?: string) {
  switch (code) {
    case 'DUPLICATE_NAME':
      return {
        title: 'Duplicate Pig Pen Name',
        message: 'A pig pen with this name already exists.',
      };
    case 'INVALID_DEVICE_CODE':
      return {
        title: 'Invalid Device Code',
        message: 'The entered device code does not exist.',
      };
    case 'DEVICE_ASSIGNED':
      return {
        title: 'Device Already Assigned',
        message: 'This device code is already assigned to another pig pen.',
      };
    case 'PEN_NOT_FOUND':
      return {
        title: 'Pig Pen Not Found',
        message: 'We could not find this pig pen.',
      };
    default:
      return {
        title: 'Update Failed',
        message: fallbackMessage || 'Something went wrong while updating the pig pen.',
      };
  }
}

export default function EditPigPen() {
  const router = useRouter();
  const { pen_id } = useLocalSearchParams<{ pen_id: string }>();

  const [farmerId, setFarmerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [penName, setPenName] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [description, setDescription] = useState('');
  const [totalPigs, setTotalPigs] = useState('');
  // Growth Stage is read-only here — it's computed by the backend
  // (feeding_helper.php) from feeding_reference.csv based on current age.
  // It is never entered or edited manually.
  const [growthStage, setGrowthStage] = useState('');
  const [avgWeight, setAvgWeight] = useState('');
  // pig_age_at_registration is only ever entered when a pig pen is first
  // created — it's never edited here. We just hold onto the original
  // value internally (no input field for it) so it can be resent as-is
  // on Save, since the backend needs it to (re)compute Growth Stage.
  const [pigAgeAtRegistration, setPigAgeAtRegistration] = useState<number | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    visible: false,
    title: '',
    message: '',
  });

  const handleBack = () => {
    router.replace('/(tabs)/pig-pens');
  };

  const loadPigPen = useCallback(async () => {
    setLoading(true);

    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      setFarmerId(user?.farmer_id ?? null);

      if (!pen_id) {
        setErrorModal({
          visible: true,
          title: 'Missing Pig Pen',
          message: 'No pig pen was selected to edit.',
        });
        setLoading(false);
        return;
      }

      const url = `${API_BASE_URL}/api/pig-pens/get_pig_pen_details.php?pen_id=${pen_id}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.pig_pen) {
        const pen = data.pig_pen;
        setPenName(pen.pen_name ?? '');
        setDeviceCode(pen.device_code ?? '');
        setDescription(pen.description ?? '');
        setTotalPigs(pen.pig_count != null ? String(pen.pig_count) : '');
        setGrowthStage(pen.growthStage ?? '');
        setAvgWeight(pen.avg_weight != null ? String(pen.avg_weight) : '');
        setPigAgeAtRegistration(
          pen.pig_age_at_registration != null ? Number(pen.pig_age_at_registration) : null
        );
      } else {
        setErrorModal({
          visible: true,
          title: 'Pig Pen Not Found',
          message: 'We could not find this pig pen.',
        });
      }
    } catch (err) {
      setErrorModal({
        visible: true,
        title: 'Something Went Wrong',
        message: 'Failed to load pig pen details. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [pen_id]);

  useEffect(() => {
    loadPigPen();
  }, [loadPigPen]);

  const handleUpdatePress = () => {
    if (
      !penName.trim() ||
      !deviceCode.trim() ||
      !totalPigs.trim() ||
      !avgWeight.trim()
    ) {
      setErrorModal({
        visible: true,
        title: 'Missing Information',
        message: 'Please fill out all required fields before saving.',
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/pig-pens/update_pig_pen.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pen_id: Number(pen_id),
          farmer_id: farmerId,
          device_code: deviceCode.trim(),
          pen_name: penName.trim(),
          description: description.trim(),
          pig_count: Number(totalPigs),
          avg_weight: Number(avgWeight),
          // Resent as-is (never edited by the farmer here) so the
          // backend can (re)compute Growth Stage correctly.
          pig_age_at_registration: pigAgeAtRegistration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowSuccessModal(true);
      } else {
        const modalConfig = getErrorModalConfig(data.error_code, data.message);
        setErrorModal({ visible: true, ...modalConfig });
      }
    } catch (err) {
      setErrorModal({
        visible: true,
        title: 'Something Went Wrong',
        message: 'We could not reach the server. Please check your connection and try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.replace('/(tabs)/pig-pens');
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Pig Pen</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2F5D50" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Pen Name */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="home-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Pen Name</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={penName}
              onChangeText={setPenName}
            />
          </View>

          {/* Number of Pigs */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="paw-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Number of Pigs</Text>
            </View>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={totalPigs}
              onChangeText={setTotalPigs}
            />
          </View>

          {/* Growth Stage — read-only, auto-computed by the backend from
              feeding_reference.csv based on the pigs' current age. Not
              editable here. */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="layers-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Growth Stage</Text>
            </View>
            <View style={[styles.dropdownInput, styles.readOnlyInput]}>
              <Text style={styles.dropdownInputText}>
                {growthStage || '—'}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Automatically computed based on the pigs' current age. This
              updates on its own and cannot be edited manually.
            </Text>
          </View>

          {/* Average Weight */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="scale-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Average Weight (kg)</Text>
            </View>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={avgWeight}
              onChangeText={setAvgWeight}
            />
          </View>

          {/* Device Code */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="hardware-chip-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Device Code</Text>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Enter Device Code (e.g. OINKMATE-001)"
              placeholderTextColor="#B0C0BC"
              autoCapitalize="characters"
              value={deviceCode}
              onChangeText={setDeviceCode}
            />
            <Text style={styles.helperText}>
              Enter the unique device code assigned to this pig pen.
            </Text>
          </View>

          {/* Description */}
          <View style={styles.card}>
            <View style={styles.cardLabelRow}>
              <Ionicons name="document-text-outline" size={15} color="#2F5D50" />
              <Text style={styles.cardLabel}>Description</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add a short description for this pen"
              placeholderTextColor="#B0C0BC"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleUpdatePress}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Update Pig Pen</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Changes?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to update this pig pen?
            </Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.85}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                activeOpacity={0.85}
                onPress={handleConfirmSave}
              >
                <Text style={styles.modalConfirmText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessOk}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle" size={32} color="#2F9E64" />
            </View>
            <Text style={styles.modalTitle}>Pig Pen Updated</Text>
            <Text style={styles.modalMessage}>Pig pen updated successfully.</Text>
            <TouchableOpacity
              style={styles.modalOkButton}
              activeOpacity={0.85}
              onPress={handleSuccessOk}
            >
              <Text style={styles.modalOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, styles.modalIconWrapError]}>
              <Ionicons name="alert-circle" size={32} color="#B3261E" />
            </View>
            <Text style={styles.modalTitle}>{errorModal.title}</Text>
            <Text style={styles.modalMessage}>{errorModal.message}</Text>
            <TouchableOpacity
              style={styles.modalOkButton}
              activeOpacity={0.85}
              onPress={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalOkText}>OK</Text>
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

  /* Loading */
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* Text Input */
  textInput: {
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#1A2D27',
    fontFamily: 'Inter',
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  textArea: {
    minHeight: 90,
  },

  /* Dropdown Input */
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  dropdownInputText: {
    fontSize: 13,
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  dropdownPlaceholderText: {
    color: '#B0C0BC',
  },
  readOnlyInput: {
    backgroundColor: '#EEF1F0',
    opacity: 0.85,
  },

  /* Dropdown Options */
  optionList: {
    width: '100%',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F7F8F9',
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  optionRowSelected: {
    backgroundColor: '#EAF7F1',
    borderColor: '#2F5D50',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  optionTextSelected: {
    color: '#2F5D50',
    fontWeight: '800',
  },

  /* Helper Text */
  helperText: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
    marginTop: -4,
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
    opacity: 0.7,
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

  /* Modals */
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
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalIconWrapError: {
    backgroundColor: '#FFF0F0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: '#4A5C57',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 8,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#DCEAE5',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#2F5D50',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  modalOkButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#2F5D50',
    marginTop: 4,
  },
  modalOkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});