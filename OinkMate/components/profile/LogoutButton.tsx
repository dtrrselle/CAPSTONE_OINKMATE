import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LogoutButtonProps {
  label?: string;
  /**
   * Route to navigate to after logout. Update this to match your
   * existing Sign In route if it differs from the default.
   */
  signInRoute?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({
  label = 'Logout',
  signInRoute = '/authentication/signin',
}) => {
  const router = useRouter();
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutPress = () => {
    setIsConfirmVisible(true);
  };

  const handleCancel = () => {
    setIsConfirmVisible(false);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Keep the existing brief loading state before redirecting.
      await new Promise((resolve) => setTimeout(resolve, 900));
      await AsyncStorage.removeItem('user');
      router.replace(signInRoute as any);
    } catch (error) {
      console.log('Logout error:', error);
      router.replace(signInRoute as any);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogoutPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Logout"
      >
        <Ionicons name="log-out-outline" size={18} color="#E53935" />
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>

      <Modal
        visible={isConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {isLoggingOut ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color="#2F5D50" />
                <Text style={styles.loadingText}>Logging out...</Text>
              </View>
            ) : (
              <>
                <View style={styles.iconWrap}>
                  <Ionicons name="log-out-outline" size={26} color="#2F5D50" />
                </View>

                <Text style={styles.modalTitle}>Logout</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to logout?
                </Text>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmLogout}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmButtonText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /* Trigger button */
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FCF0F0',
    borderRadius: 18,
    paddingVertical: 14,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#F8D7D7',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
    fontFamily: 'Inter',
  },

  /* Modal */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 45, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
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
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  modalMessage: {
    fontSize: 13,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#DCEAE5',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2F5D50',
    fontFamily: 'Inter',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#2F5D50',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },

  /* Loading */
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

export default LogoutButton;