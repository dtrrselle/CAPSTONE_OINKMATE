import React, { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ProfileHeader from '../../components/profile/ProfileHeader';
import FarmerProfileCard from '../../components/profile/FarmerProfileCard';
import ProfileMenu from '../../components/profile/ProfileMenu';
import LogoutButton from '../../components/profile/LogoutButton';

const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

interface FarmerUser {
  farmer_id?: number;
  fullname?: string;
  farm_name?: string;
  farm_address?: string;
}

export default function Profile() {
  const router = useRouter();

  const [farmer, setFarmer] = useState<FarmerUser | null>(null);
  const [totalPigPens, setTotalPigPens] = useState<number | undefined>(undefined);
  const [totalPigs, setTotalPigs] = useState<number | undefined>(undefined);

  const loadUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      console.log('[Profile] loaded user from AsyncStorage:', user);
      setFarmer(user);

      if (user?.farmer_id) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/profile/get_profile_stats.php?farmer_id=${user.farmer_id}`
          );
          const data = await response.json();

          if (data.success) {
            setTotalPigPens(data.total_pens);
            setTotalPigs(data.total_pigs);
          }
        } catch (statsErr) {
          // Leave stats undefined if the request fails
        }
      }
    } catch (err) {
      setFarmer(null);
    }
  }, []);

  // Reload profile data (AsyncStorage user + stats) every time this screen
  // becomes focused, e.g. when navigating back from Edit Profile.
  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <ProfileHeader />

        <FarmerProfileCard
          farmerName={farmer?.fullname}
          farmName={farmer?.farm_name}
          location={farmer?.farm_address}
          totalPigPens={totalPigPens}
          totalPigs={totalPigs}
        />

        <ProfileMenu
          onEditProfilePress={() =>
            router.push('/profile/edit-profile')
          }
          onFarmInformationPress={() =>
            router.push('/profile/farm-information')
          }
          onAboutPress={() =>
            router.push('/profile/about')
          }
          onHelpSupportPress={() =>
            router.push('/profile/help-support')
          }
        />

        <LogoutButton />
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