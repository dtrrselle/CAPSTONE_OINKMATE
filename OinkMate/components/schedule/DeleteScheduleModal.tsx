import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeleteScheduleModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  scheduleLabel?: string;
}

const DeleteScheduleModal: React.FC<DeleteScheduleModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  scheduleLabel = 'this schedule',
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={() => {}}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="trash-outline" size={28} color="#D96C8D" />
          </View>

          {/* Text */}
          <View style={styles.textBlock}>
            <Text style={styles.title}>Delete Schedule?</Text>
            <Text style={styles.subtitle}>
              Are you sure you want to delete {scheduleLabel}? This action cannot be undone.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={onConfirm} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete</Text>
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
    backgroundColor: 'rgba(15, 45, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modal: {
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

  /* Icon */
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FCF0F3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F6DCE3',
  },

  /* Text */
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

  /* Actions */
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
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#D96C8D',
    shadowColor: '#D96C8D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});

export default DeleteScheduleModal;