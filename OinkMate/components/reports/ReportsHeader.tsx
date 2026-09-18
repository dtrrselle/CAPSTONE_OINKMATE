import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';

interface ReportsHeaderProps {
  title?: string;
  subtitle?: string;
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  title = 'Reports',
  subtitle = 'Financial records and insights',
}) => {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
    paddingBottom: 5,
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  logoImage: {
    width: 52,
    height: 52,
  },

  titleBlock: {
    marginTop: -2,
    gap: 0,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A2D27',
    letterSpacing: -0.4,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
});

export default ReportsHeader;