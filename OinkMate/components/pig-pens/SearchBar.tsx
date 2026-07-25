import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  showFilterIcon?: boolean;
  onFilterPress?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search pig pen...',
  value,
  onChangeText,
  showFilterIcon = true,
  onFilterPress,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const text = isControlled ? value : internalValue;

  const handleChange = (t: string) => {
    if (!isControlled) setInternalValue(t);
    onChangeText?.(t);
  };

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={19} color="#8A9994" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#A0B5AD"
        value={text}
        onChangeText={handleChange}
        returnKeyType="search"
      />
      {showFilterIcon && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Filter"
        >
          <Ionicons name="options-outline" size={18} color="#2F5D50" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1A2D27',
    fontFamily: 'Inter',
    paddingVertical: 0,
  },
  filterButton: {
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#EEF1F0',
  },
});

export default SearchBar;