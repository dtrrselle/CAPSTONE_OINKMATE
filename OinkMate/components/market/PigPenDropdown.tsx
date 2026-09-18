import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PigPen } from '../../app/market/market-home';

interface PigPenDropdownProps {
  pigPens: PigPen[];
  selectedPen: PigPen | null;
  onSelectPen: (pen: PigPen) => void;
  loading?: boolean;
  error?: string | null;
}

export default function PigPenDropdown({
  pigPens,
  selectedPen,
  onSelectPen,
  loading = false,
  error = null,
}: PigPenDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (pen: PigPen) => {
    onSelectPen(pen);
    setOpen(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Select Pig Pen</Text>

      <TouchableOpacity
        style={styles.selector}
        activeOpacity={0.85}
        disabled={loading || pigPens.length === 0}
        onPress={() => setOpen((prev) => !prev)}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#2F5D50" />
        ) : (
          <Text style={styles.selectorText}>
            {selectedPen ? selectedPen.pen_name : 'No pig pen selected'}
          </Text>
        )}
        {!loading && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#555" />}
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>Couldn't load pig pens. Pull to try again.</Text>}

      {open && !loading && (
        <View style={styles.optionsList}>
          {pigPens.map((pen, index) => (
            <TouchableOpacity
              key={pen.pen_id}
              style={[
                styles.option,
                index === pigPens.length - 1 && styles.optionLast,
                selectedPen?.pen_id === pen.pen_id && styles.optionSelected,
              ]}
              activeOpacity={0.85}
              onPress={() => handleSelect(pen)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedPen?.pen_id === pen.pen_id && styles.optionTextSelected,
                ]}
              >
                {pen.pen_name}
              </Text>
              {selectedPen?.pen_id === pen.pen_id && (
                <Ionicons name="checkmark" size={16} color="#2F5D50" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
    marginBottom: 10,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45252',
    fontFamily: 'Inter',
    marginTop: 8,
    textAlign: 'center',
  },
  optionsList: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F7F8F9',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionSelected: {
    backgroundColor: '#EAF7EF',
  },
  optionText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#3A3A3A',
    fontFamily: 'Inter',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#2F5D50',
  },
});