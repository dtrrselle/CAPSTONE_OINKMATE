import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SystemStatusBanner from '@/components/dashboard/SystemStatusBanner';
import FarmOverview from '@/components/dashboard/FarmOverview';
import QuickAccessGrid from '@/components/dashboard/QuickAccessGrid';


interface StoredUser {
  user_id?: number;
  farmer_id?: number;
  fullname?: string;
  email?: string;
  role?: string;
  contact_number?: string;
  farm_name?: string;
  farm_address?: string;
}

interface FarmOverviewData {
  total_pig_pens: number;
  total_pigs: number;
  active_pens: number;
}

const ZERO_FARM_OVERVIEW: FarmOverviewData = {
  total_pig_pens: 0,
  total_pigs: 0,
  active_pens: 0,
};

// Matches the host used by the other API calls in this app — update if this
// ngrok URL changes.
const API_BASE_URL = 'https://oinkmate.online/oinkmate-api/api';

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [now, setNow] = useState(new Date());
  const [farmOverview, setFarmOverview] = useState<FarmOverviewData>(ZERO_FARM_OVERVIEW);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load the logged-in user's session from AsyncStorage.
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log('Error loading user session:', error);
        setUser(null);
      }
    };

    loadUser();
  }, []);

  // Load Farm Overview stats once we know who the logged-in farmer is.
  useEffect(() => {
    if (!user?.farmer_id) return;

    const loadFarmOverview = async () => {
      try {
        const url = `${API_BASE_URL}/dashboard/get_farm_overview.php?farmer_id=${encodeURIComponent(
          String(user.farmer_id)
        )}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
          setFarmOverview({
            total_pig_pens: Number(data.data.total_pig_pens) || 0,
            total_pigs: Number(data.data.total_pigs) || 0,
            active_pens: Number(data.data.active_pens) || 0,
          });
        } else {
          // Keep showing zeros rather than surfacing an error on the dashboard.
          setFarmOverview(ZERO_FARM_OVERVIEW);
        }
      } catch (error) {
        console.log('Error loading farm overview:', error);
        setFarmOverview(ZERO_FARM_OVERVIEW);
      }
    };

    loadFarmOverview();
  }, [user?.farmer_id]);

  // Load the unread notification count for the bell badge. Kept separate
  // from Farm Overview on purpose — different endpoint, different concern.
  const loadUnreadNotifications = useCallback(async () => {
    if (!user?.farmer_id) return;

    try {
      const url = `${API_BASE_URL}/notifications/get_notifications.php?farmer_id=${encodeURIComponent(
        String(user.farmer_id)
      )}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && Array.isArray(data.notifications)) {
        const unread = data.notifications.filter(
          (notification: { status?: string }) => notification.status === 'unread'
        ).length;
        setUnreadCount(unread);
      } else {
        // Keep showing zero rather than surfacing an error on the dashboard.
        setUnreadCount(0);
      }
    } catch (error) {
      console.log('Error loading notifications:', error);
      // Retain the existing valid unread count rather than crashing or
      // flashing to zero on a transient network error.
    }
  }, [user?.farmer_id]);

  // Initial load once we know who the logged-in farmer is.
  useEffect(() => {
    loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  // Refresh the unread count whenever the Dashboard screen regains focus
  // (e.g. returning from the Notifications screen after reading/marking
  // items as read). Focus-triggered only — no polling/timer.
  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications])
  );

  // Keep the date/time displayed in the header up to date.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header stays fixed — outside ScrollView so it doesn't scroll */}
      <DashboardHeader
        farmerName={user?.fullname}
        currentDate={formatDate(now)}
        currentTime={formatTime(now)}
        unreadCount={unreadCount}
        onNotificationPress={() =>
          router.push('/notifications/notifications')
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <SystemStatusBanner />

        <FarmOverview
          totalPigPens={farmOverview.total_pig_pens}
          totalPigs={farmOverview.total_pigs}
          activePens={farmOverview.active_pens}
        />

        <QuickAccessGrid />

       

      
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
    paddingBottom: 40,
  },
});