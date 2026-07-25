import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';

export default function ROIAnalysis() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        ROI Analysis Screen
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
});