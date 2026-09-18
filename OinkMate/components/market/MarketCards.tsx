import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { MarketRecommendationData, MarketPriceData } from '../../app/market/market-home';

interface MarketCardsProps {
  data: MarketRecommendationData | null;
  loading?: boolean;
  error?: string | null;
  priceData: MarketPriceData | null;
  priceLoading?: boolean;
  priceError?: string | null;
}

// Formats a number as Philippine Peso, e.g. 18500 -> "₱18,500.00"
function formatPeso(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const [intPart, decPart] = Math.abs(safeAmount).toFixed(2).split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = safeAmount < 0 ? '-' : '';
  return `${sign}₱${withCommas}.${decPart}`;
}

export default function MarketCards({
  data,
  loading = false,
  error = null,
  priceData,
  priceLoading = false,
  priceError = null,
}: MarketCardsProps) {
  const placeholder = loading ? '…' : '—';
  const pricePlaceholder = priceLoading ? '…' : '—';

  // Estimated Market Value = Estimated Live Weight × Pig Count × Current Market Price
  const canComputeValue = !!data && !!priceData;
  const estimatedMarketValue = canComputeValue
    ? data!.estimated_live_weight * data!.pig_count * priceData!.current_market_price
    : null;

  const stats: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    isLoading: boolean;
  }[] = [
    {
      key: 'age',
      icon: 'calendar-outline',
      label: 'Estimated Age',
      value: data ? `${data.current_age_days} Days` : placeholder,
      isLoading: loading,
    },
    {
      key: 'stage',
      icon: 'trending-up-outline',
      label: 'Growth Stage',
      value: data ? data.age_category : placeholder,
      isLoading: loading,
    },
    {
      key: 'count',
      icon: 'paw-outline',
      label: 'Pig Count',
      value: data ? String(data.pig_count) : placeholder,
      isLoading: loading,
    },
    {
      key: 'weight',
      icon: 'barbell-outline',
      label: 'Estimated Live Weight',
      value: data ? `${data.estimated_live_weight} kg` : placeholder,
      isLoading: loading,
    },
    {
      key: 'price',
      icon: 'pricetag-outline',
      label: 'Current Market Price',
      value: priceData ? `₱${priceData.current_market_price.toFixed(2)}/kg` : pricePlaceholder,
      isLoading: priceLoading,
    },
    {
      key: 'value',
      icon: 'cash-outline',
      label: 'Estimated Market Value',
      value: estimatedMarketValue !== null ? formatPeso(estimatedMarketValue) : pricePlaceholder,
      isLoading: loading || priceLoading,
    },
  ];

  return (
    <View>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={stat.key} style={styles.card}>
            <View style={styles.iconWrapper}>
              {stat.isLoading ? (
                <ActivityIndicator size="small" color="#2F5D50" />
              ) : (
                <Ionicons name={stat.icon} size={16} color="#2F5D50" />
              )}
            </View>
            <Text style={styles.label}>{stat.label}</Text>
            <Text style={styles.value}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {error && <Text style={styles.errorText}>Couldn't load market data. Pull to try again.</Text>}
      {priceError && <Text style={styles.errorText}>Couldn't load current market price. Pull to try again.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7570',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B45252',
    fontFamily: 'Inter',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 8,
  },
});