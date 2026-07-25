import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FieldConfig {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}

const PERSONAL_FIELDS: FieldConfig[] = [
  { key: 'fullName', icon: 'person-outline', label: 'Full Name', placeholder: 'Enter your full name' },
  { key: 'email', icon: 'mail-outline', label: 'Email', placeholder: 'Enter your email', keyboardType: 'email-address' },
  { key: 'phone', icon: 'call-outline', label: 'Phone Number', placeholder: 'Enter your phone number', keyboardType: 'phone-pad' },
];

const FARM_FIELDS: FieldConfig[] = [
  { key: 'farmName', icon: 'home-outline', label: 'Farm Name', placeholder: 'Enter your farm name' },
  { key: 'location', icon: 'location-outline', label: 'Farm Location', placeholder: 'Enter your farm location' },
];

// NOTE: dapat naka-open at naka-RUN yung ngrok tunnel mo (ngrok http <port>)
// bago mo i-test 'to, kasi kailangan live yung URL na 'to para may sumagot.
const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

export default function EditProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<Record<string, string>>({
    fullName: '',
    email: '',
    phone: '',
    farmName: '',
    location: '',
  });

  const [farmerId, setFarmerId] = useState<string | number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (!userJson) {
          console.log('No user found in AsyncStorage');
          setLoadingProfile(false);
          return;
        }

        const user = JSON.parse(userJson);
        const fid = user.farmer_id;
        if (!fid) {
          console.log('No farmer_id on stored user object:', user);
          setLoadingProfile(false);
          return;
        }
        setFarmerId(fid);

        const response = await fetch(
          `${API_BASE_URL}/api/profile/get_profile.php?farmer_id=${fid}`
        );
        const data = await response.json();
        console.log("PROFILE DATA:", data);

        if (data.success && data.profile) {
          const newFormData = {
            fullName: String(data.profile.fullname ?? ''),
            email: String(data.profile.email ?? ''),
            phone: String(data.profile.contact_number ?? ''),
            farmName: String(data.profile.farm_name ?? ''),
            location: String(data.profile.farm_address ?? ''),
          };
          setValues(newFormData);
          console.log("FORM DATA:", newFormData);
        } else {
          console.log('Profile fetch unsuccessful:', data.message);
        }
      } catch (error) {
        console.log('Failed to load profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = (): string | null => {
    if (
      !values.fullName.trim() ||
      !values.email.trim() ||
      !values.phone.trim() ||
      !values.farmName.trim() ||
      !values.location.trim()
    ) {
      return 'Please complete all required fields';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email.trim())) {
      return 'Invalid Email Address';
    }

    const digitsOnly = /^\d{11}$/;
    if (!digitsOnly.test(values.phone.trim())) {
      return 'Phone Number must contain exactly 11 digits';
    }

    return null;
  };

  const handleSavePress = () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      setShowError(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/update_profile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: farmerId,
          fullname: values.fullName.trim(),
          email: values.email.trim(),
          contact_number: values.phone.trim(),
          farm_name: values.farmName.trim(),
          farm_address: values.location.trim(),
        }),
      });
      const data = await response.json();
      console.log('update_profile.php response:', data);

      if (data.success) {
        // Re-fetch the freshly-saved profile from the backend (source of truth)
        // and sync it into AsyncStorage so the Profile screen shows it immediately.
        try {
          const refreshResponse = await fetch(
            `${API_BASE_URL}/api/profile/get_profile.php?farmer_id=${farmerId}`
          );
          const refreshData = await refreshResponse.json();
          console.log('Post-save get_profile.php response:', refreshData);

          const storedUserJson = await AsyncStorage.getItem('user');
          const storedUser = storedUserJson ? JSON.parse(storedUserJson) : {};

          if (refreshData.success && refreshData.profile) {
            const updatedUser = {
              ...storedUser,
              fullname: refreshData.profile.fullname,
              email: refreshData.profile.email,
              contact_number: refreshData.profile.contact_number,
              farm_name: refreshData.profile.farm_name,
              farm_address: refreshData.profile.farm_address,
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('AsyncStorage "user" updated:', updatedUser);
          } else {
            // Fallback: use what we just submitted if the refresh call fails
            const updatedUser = {
              ...storedUser,
              fullname: values.fullName.trim(),
              email: values.email.trim(),
              contact_number: values.phone.trim(),
              farm_name: values.farmName.trim(),
              farm_address: values.location.trim(),
            };
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('AsyncStorage "user" updated (fallback):', updatedUser);
          }
        } catch (storageErr) {
          console.log('Failed to sync local user cache:', storageErr);
        }

        setShowSuccess(true);
      } else {
        setErrorMessage(data.message || 'Failed to update profile');
        setShowError(true);
      }
    } catch (error) {
      console.log('Save profile error:', error);
      setErrorMessage('Failed to update profile');
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FieldConfig) => (
    <View key={field.key} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={field.icon} size={16} color="#8A9994" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor="#B0BCB9"
          keyboardType={field.keyboardType ?? 'default'}
          value={values[field.key]}
          onChangeText={(text) => handleChange(field.key, text)}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#2F5D50" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Information */}
          <Text style={styles.sectionLabel}>Personal Information</Text>
          <View style={styles.card}>
            {PERSONAL_FIELDS.map(renderField)}
          </View>

          {/* Farm Information */}
          <Text style={styles.sectionLabel}>Farm Information</Text>
          <View style={styles.card}>
            {FARM_FIELDS.map(renderField)}
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleSavePress}
            disabled={saving}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Save Confirmation Modal */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setShowConfirm(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#2F5D50" />
            </View>

            <View style={styles.modalTextBlock}>
              <Text style={styles.modalTitle}>Save Changes?</Text>
              <Text style={styles.modalSubtitle}>
                Are you sure you want to save your profile changes?
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmSave}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setShowSuccess(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#2F5D50" />
            </View>

            <View style={styles.modalTextBlock}>
              <Text style={styles.modalTitle}>Profile Updated Successfully</Text>
              <Text style={styles.modalSubtitle}>
                Your profile information has been updated.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowSuccess(false)}
              >
                <Text style={styles.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showError}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setShowError(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#FBEAEA' }]}>
              <Ionicons name="alert-circle-outline" size={28} color="#C0392B" />
            </View>

            <View style={styles.modalTextBlock}>
              <Text style={styles.modalTitle}>Something Went Wrong</Text>
              <Text style={styles.modalSubtitle}>{errorMessage}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowError(false)}
              >
                <Text style={styles.confirmButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },
  inner: {
    flex: 1,
  },

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

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5C57',
    fontFamily: 'Inter',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F8F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2EDEA',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  inputIcon: {
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#1A2D27',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2F5D50',
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  bottomSpacer: {
    height: 24,
  },

  /* Modals — mirrors DeletePigPenModal structure, green-themed */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,45,36,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EAF7F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTextBlock: {
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#8A9994',
    lineHeight: 20,
  },
  modalActions: {
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
  },
  cancelButtonText: {
    color: '#4A5C57',
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2F5D50',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});