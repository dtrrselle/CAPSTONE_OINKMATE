import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ModalStage = 'none' | 'confirm' | 'loading' | 'success' | 'error';

// ── Status Modal ─────────────────────────────────────────────────────────
// Same visual pattern as DeleteScheduleModal (icon wrap, title, subtitle,
// action row) for confirm/success/error, and the same loading experience
// as LogoutButton (ActivityIndicator + label inside the modal card) for
// the loading stage. No new modal or loading style is introduced.
interface StatusModalProps {
  stage: ModalStage;
  title: string;
  message: string;
  loadingLabel: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onDismiss: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({
  stage,
  title,
  message,
  loadingLabel,
  confirmLabel = 'Yes, Add Pig Pen',
  onCancel,
  onConfirm,
  onDismiss,
}) => {
  const visible = stage !== 'none';
  const isError = stage === 'error';
  const iconName =
    stage === 'success'
      ? 'checkmark-circle-outline'
      : stage === 'error'
      ? 'alert-circle-outline'
      : 'help-circle-outline';
  const accentColor = isError ? '#D96C8D' : '#2F5D50';
  const iconBg = isError ? '#FCF0F3' : '#EAF7F1';
  const iconBorder = isError ? '#F6DCE3' : '#D8EAE4';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <Pressable
        style={modalStyles.overlay}
        onPress={stage === 'confirm' ? onCancel : undefined}
      >
        {stage === 'loading' ? (
          <Pressable style={modalStyles.loadingCard} onPress={() => {}}>
            <View style={modalStyles.loadingBlock}>
              <ActivityIndicator size="small" color="#2F5D50" />
              <Text style={modalStyles.loadingText}>{loadingLabel}</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable style={modalStyles.card} onPress={() => {}}>
            <View
              style={[
                modalStyles.iconWrap,
                { backgroundColor: iconBg, borderColor: iconBorder },
              ]}
            >
              <Ionicons name={iconName as any} size={28} color={accentColor} />
            </View>

            <View style={modalStyles.textBlock}>
              <Text style={modalStyles.title}>{title}</Text>
              <Text style={modalStyles.subtitle}>{message}</Text>
            </View>

            {stage === 'confirm' ? (
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={onCancel}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.confirmButton, { backgroundColor: accentColor, shadowColor: accentColor }]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                  <Text style={modalStyles.confirmButtonText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={[modalStyles.confirmButton, { flex: 1, backgroundColor: accentColor, shadowColor: accentColor }]}
                  onPress={onDismiss}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.confirmButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 45, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  /* Confirm / success / error card — mirrors DeleteScheduleModal */
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F0F3F2',
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  /* Loading card — mirrors LogoutButton's loading experience */
  loadingCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  loadingBlock: {
    paddingVertical: 14,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2F5D50',
    fontFamily: 'Inter',
  },
});

export default function AddPigPen() {
  const router = useRouter();

  const handleBack = () => {
    router.replace('/(tabs)/pig-pens');
  };

  const [penName, setPenName] = useState('');
  const [description, setDescription] = useState('');
  const [totalPigs, setTotalPigs] = useState('');
  // Age in days at registration. The backend derives age_category from this
  // using feeding_reference.csv — it's never picked manually here.
  const [pigAgeAtRegistration, setPigAgeAtRegistration] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [averageWeight, setAverageWeight] = useState('');

  const [penNameError, setPenNameError] = useState('');
  const [totalPigsError, setTotalPigsError] = useState('');
  const [pigAgeError, setPigAgeError] = useState('');
  const [deviceCodeError, setDeviceCodeError] = useState('');

  const [modalStage, setModalStage] = useState<ModalStage>('none');
  const [resultTitle, setResultTitle] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  const validatePenName = (v: string) => (!v.trim() ? 'Pen name is required' : '');
  const validateTotalPigs = (v: string) => {
    if (!v.trim()) return 'Number of pigs is required';
    if (!/^\d+$/.test(v.trim()) || Number(v.trim()) <= 0) return 'Enter a valid number of pigs';
    return '';
  };
  const validateDeviceCode = (v: string) => (!v.trim() ? 'Device code is required' : '');
  const validatePigAge = (v: string) => {
    if (!v.trim()) return 'Age in days is required';
    if (!/^\d+$/.test(v.trim()) || Number(v.trim()) <= 0) return 'Enter a valid age in days';
    return '';
  };

  // STEP 1 — validate, then open the confirmation modal. No submit here yet.
  const handleSavePress = () => {
    console.log("SAVE BUTTON CLICKED");

    const pnErr = validatePenName(penName);
    const tpErr = validateTotalPigs(totalPigs);
    const dcErr = validateDeviceCode(deviceCode);
    const paErr = validatePigAge(pigAgeAtRegistration);

    setPenNameError(pnErr);
    setTotalPigsError(tpErr);
    setDeviceCodeError(dcErr);
    setPigAgeError(paErr);

    if (pnErr) console.log("Validation failed: Pen Name required");
    if (tpErr) console.log("Validation failed: " + tpErr);
    if (dcErr) console.log("Validation failed: Device Code required");
    if (paErr) console.log("Validation failed: " + paErr);

    if (pnErr || tpErr || dcErr || paErr) {
      return;
    }

    setModalStage('confirm');
  };

  const handleCancelConfirm = () => {
    setModalStage('none');
  };

  // STEP 2 — user confirmed: close confirm modal, show loading, then submit.
  const handleConfirmAdd = async () => {
    setModalStage('loading');

    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const farmerId = user?.farmer_id;

      if (!farmerId) {
        console.log("Validation failed: farmer_id not found in session");
        setResultTitle('Unable to Add Pig Pen');
        setResultMessage('Your session has expired. Please sign in again.');
        setModalStage('error');
        return;
      }

      console.log("SENDING REQUEST");
      const response = await fetch(
        'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api/pig-pens/add_pig_pen.php',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id: farmerId,
            device_code: deviceCode.trim(),
            pen_name: penName.trim(),
            description: description.trim(),
            pig_count: Number(totalPigs),
            pig_age_at_registration: Number(pigAgeAtRegistration),
            avg_weight: averageWeight.trim() ? Number(averageWeight) : null,
          }),
        }
      );
      console.log("RESPONSE RECEIVED");


      const result = await response.json();

      
      console.log("API RESPONSE:", result);

      if (result.success) {
        setModalStage('success');
        return;
      }

      const msg: string = result.message || '';
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes('already assigned')) {
        setResultTitle('Device Code Already Used');
        setResultMessage('This device code is already assigned to another pig pen.');
      } else if (lowerMsg.includes('does not exist')) {
        setResultTitle('Invalid Device Code');
        setResultMessage('The entered device code does not exist. Please check and try again.');
      } else {
        setResultTitle('Unable to Add Pig Pen');
        setResultMessage(msg || 'Something went wrong. Please try again.');
      }
      setModalStage('error');
    } catch (error) {
      console.log("SAVE ERROR:", error);
      setResultTitle('Unable to Add Pig Pen');
      setResultMessage('Something went wrong. Please try again.');
      setModalStage('error');
    }
  };

  // SUCCESS — dismiss and navigate back to the Pig Pens list.
  const handleSuccessDismiss = () => {
    setModalStage('none');
    router.replace('/(tabs)/pig-pens');
  };

  // ERROR — just dismiss and let the farmer try again on this screen.
  const handleErrorDismiss = () => {
    setModalStage('none');
  };

  const activeTitle =
    modalStage === 'confirm'
      ? 'Add Pig Pen'
      : modalStage === 'success'
      ? 'Pig Pen Added'
      : resultTitle;

  const activeMessage =
    modalStage === 'confirm'
      ? 'Are you sure you want to add this pig pen?'
      : modalStage === 'success'
      ? 'Pig pen created successfully.'
      : resultMessage;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Pig Pen</Text>
        <View style={styles.headerPlaceholder} />
      </View>

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
            placeholder="Enter pen name"
            placeholderTextColor="#B0C0BC"
            value={penName}
            onChangeText={(v) => { setPenName(v); if (penNameError) setPenNameError(validatePenName(v)); }}
            onBlur={() => setPenNameError(validatePenName(penName))}
          />
          {!!penNameError && <Text style={styles.fieldError}>{penNameError}</Text>}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="document-text-outline" size={15} color="#2F5D50" />
            <Text style={styles.cardLabel}>Description (Optional)</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Add any notes about this pig pen"
            placeholderTextColor="#B0C0BC"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
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
            placeholder="Enter number of pigs"
            placeholderTextColor="#B0C0BC"
            keyboardType="numeric"
            value={totalPigs}
            onChangeText={(v) => { setTotalPigs(v); if (totalPigsError) setTotalPigsError(validateTotalPigs(v)); }}
            onBlur={() => setTotalPigsError(validateTotalPigs(totalPigs))}
          />
          {!!totalPigsError && <Text style={styles.fieldError}>{totalPigsError}</Text>}
        </View>

        {/* Age at Registration */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="hourglass-outline" size={15} color="#2F5D50" />
            <Text style={styles.cardLabel}>Age in Days</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Enter the pigs' age in days"
            placeholderTextColor="#B0C0BC"
            keyboardType="numeric"
            value={pigAgeAtRegistration}
            onChangeText={(v) => { setPigAgeAtRegistration(v); if (pigAgeError) setPigAgeError(validatePigAge(v)); }}
            onBlur={() => setPigAgeError(validatePigAge(pigAgeAtRegistration))}
          />
          <Text style={styles.helperText}>
            Growth Stage will be computed automatically based on this age.
          </Text>
          {!!pigAgeError && <Text style={styles.fieldError}>{pigAgeError}</Text>}
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
            onChangeText={(v) => { setDeviceCode(v); if (deviceCodeError) setDeviceCodeError(validateDeviceCode(v)); }}
            onBlur={() => setDeviceCodeError(validateDeviceCode(deviceCode))}
          />
          <Text style={styles.helperText}>
            Enter the unique device code assigned to this pig pen.
          </Text>
          {!!deviceCodeError && <Text style={styles.fieldError}>{deviceCodeError}</Text>}
        </View>

        {/* Average Weight */}
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <Ionicons name="speedometer-outline" size={15} color="#2F5D50" />
            <Text style={styles.cardLabel}>Average Weight (Optional)</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="Enter average weight in kg"
            placeholderTextColor="#B0C0BC"
            keyboardType="numeric"
            value={averageWeight}
            onChangeText={setAverageWeight}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleSavePress}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Save Pig Pen</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </KeyboardAvoidingView>

      <StatusModal
        stage={modalStage}
        title={activeTitle}
        message={activeMessage}
        loadingLabel="Adding pig pen..."
        onCancel={handleCancelConfirm}
        onConfirm={handleConfirmAdd}
        onDismiss={modalStage === 'success' ? handleSuccessDismiss : handleErrorDismiss}
      />
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

  /* Helper Text */
  helperText: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
    marginTop: -4,
  },

  /* Field Error */
  fieldError: {
    fontSize: 11,
    color: '#C0394B',
    fontFamily: 'Inter',
    fontWeight: '500',
    marginTop: -4,
  },

  /* Text Area */
  textArea: {
    minHeight: 80,
    paddingTop: 13,
  },

  /* Dropdown */
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
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  bottomSpacer: {
    height: 32,
  },
});