import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FarmerProfileCardProps {
  farmerName?: string;
  farmName?: string;
  location?: string;
  totalPigPens?: number;
  totalPigs?: number;
}

const FarmerProfileCard: React.FC<FarmerProfileCardProps> = ({
  farmerName,
  farmName,
  location,
  totalPigPens,
  totalPigs,
}) => {
  return (
    <View style={styles.card}>
      {/* IDENTITY */}
      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          <Ionicons name="person" size={26} color="#2F5D50" />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.farmerName}>{farmerName || 'Not Available'}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="home-outline" size={12} color="#8A9994" />
            <Text style={styles.metaText}>{farmName || 'Not Available'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#8A9994" />
            <Text style={styles.metaText}>{location || 'Not Available'}</Text>
          </View>
        </View>
      </View>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* STATISTICS */}
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <View style={[styles.statIconWrap, { backgroundColor: '#EAF7F1' }]}>
            <Ionicons name="home-outline" size={15} color="#2F5D50" />
          </View>
          <View>
            <Text style={styles.statValue}>
              {totalPigPens != null ? totalPigPens : 'Not Available'}
            </Text>
            <Text style={styles.statLabel}>Total Pig Pens</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBlock}>
          <View style={[styles.statIconWrap, { backgroundColor: '#FBEEF1' }]}>
            <Ionicons name="paw-outline" size={15} color="#D96C8D" />
          </View>
          <View>
            <Text style={styles.statValue}>
              {totalPigs != null ? totalPigs : 'Not Available'}
            </Text>
            <Text style={styles.statLabel}>Total Pigs</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 5,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EEF1F0',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginTop: 14,
  },

  /* Identity */
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8EAE4',
  },
  identityText: {
    flex: 1,
    gap: 3,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: '#F0F3F2',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  statLabel: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F0F3F2',
    marginHorizontal: 8,
  },
});

export default FarmerProfileCard;