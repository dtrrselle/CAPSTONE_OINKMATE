import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeletePigPenModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  penName?: string;
  isDeleting?: boolean;
}

const DeletePigPenModal: React.FC<DeletePigPenModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  penName = 'this pig pen',
  isDeleting = false,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={isDeleting ? undefined : onCancel}
      >
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="trash-outline"
              size={28}
              color="#D96C8D"
            />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>
              Delete Pig Pen?
            </Text>

            <Text style={styles.subtitle}>
              Are you sure you want to delete {penName}? This action cannot be undone.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, isDeleting && styles.disabledButton]}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.disabledButton]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
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

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCF0F3',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textBlock: {
    alignItems: 'center',
    gap: 8,
  },

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A2D27',
  },

  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#8A9994',
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
  },

  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#D96C8D',
  },

  disabledButton: {
    opacity: 0.6,
  },

  cancelButtonText: {
    color: '#4A5C57',
    fontWeight: '700',
  },

  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default DeletePigPenModal;