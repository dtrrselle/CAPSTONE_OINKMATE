import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileMenuItemConfig {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentBg: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

interface ProfileMenuProps {
  onEditProfilePress?: () => void;
  onFarmInformationPress?: () => void;
  onAboutPress?: () => void;
  onHelpSupportPress?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  onEditProfilePress,
  onFarmInformationPress,
  onAboutPress,
  onHelpSupportPress,
}) => {
  const items: ProfileMenuItemConfig[] = [
    {
      key: 'edit_profile',
      icon: 'person-outline',
      accent: '#2F5D50',
      accentBg: '#EAF7F1',
      title: 'Edit Profile',
      subtitle: 'Update personal information',
      onPress: onEditProfilePress,
    },
    {
      key: 'farm_information',
      icon: 'home-outline',
      accent: '#D96C8D',
      accentBg: '#FBEEF1',
      title: 'Farm Information',
      subtitle: 'View farm details',
      onPress: onFarmInformationPress,
    },
    {
      key: 'about',
      icon: 'information-circle-outline',
      accent: '#5B7FB5',
      accentBg: '#EAF0FB',
      title: 'About OinkMate',
      subtitle: 'App information',
      onPress: onAboutPress,
    },
    {
      key: 'help_support',
      icon: 'help-circle-outline',
      accent: '#2F5D50',
      accentBg: '#EAF7F1',
      title: 'Help & Support',
      subtitle: 'Guides and assistance',
      onPress: onHelpSupportPress,
    },
  ];

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.menuItem}
          onPress={item.onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <View style={[styles.iconWrap, { backgroundColor: item.accentBg }]}>
            <Ionicons name={item.icon} size={18} color={item.accent} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={item.accent} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 12,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});

export default ProfileMenu;