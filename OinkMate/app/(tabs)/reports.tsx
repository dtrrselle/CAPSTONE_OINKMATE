import React from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';

import ReportsHeader from '../../components/reports/ReportsHeader';
import ReportsMenu from '../../components/reports/ReportsMenu';

export default function Reports() {
  const router = useRouter();

  return (

    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ReportsHeader />

        <ReportsMenu
          onExpenseTrackingPress={() =>
            router.push('/expenses/expenses')
          }
          onFinancialAnalysisPress={() =>
            router.push('/reports/roi-analysis')
          }
          onLearningHubPress={() =>
            router.push('/learning/learning-hub')
          }
        />
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },

  content: {
    paddingBottom: 30,
  },
});