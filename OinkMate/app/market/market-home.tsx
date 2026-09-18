import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MarketHeader from '../../components/market/MarketHeader';
import PigPenDropdown from '../../components/market/PigPenDropdown';
import MarketCards from '../../components/market/MarketCards';
import RecommendationCard from '../../components/market/RecommendationCard';

// Matches the host used elsewhere in the app (e.g. expenses.tsx) — update if this ngrok URL changes.
const API_BASE_URL = 'https://oinkmate.online/oinkmate-api/api';

export interface PigPen {
  pen_id: number;
  pen_name: string;
  [key: string]: any;
}

export interface MarketRecommendation {
  status: string;
  badgeColor: string;
  reasons: string[];
}

export interface MarketRecommendationData {
  pen_id: number;
  pen_name: string;
  description: string;
  pig_count: number;
  registration_age_days: number;
  current_age_days: number;
  registration_average_weight: number;
  age_category: string;
  estimated_live_weight: number;
  recommendation: MarketRecommendation;
}

export interface MarketPriceData {
  province: string;
  current_market_price: number;
  unit: string;
  commodity: string;
  source: string;
}

interface GetPigPensResponse {
  success: boolean;
  pig_pens?: PigPen[];
  message?: string;
}

interface GetMarketRecommendationResponse extends Partial<MarketRecommendationData> {
  success: boolean;
  message?: string;
}

interface GetMarketPriceResponse extends Partial<MarketPriceData> {
  success: boolean;
  message?: string;
}

export default function MarketHome() {
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [pigPens, setPigPens] = useState<PigPen[]>([]);
  const [selectedPen, setSelectedPen] = useState<PigPen | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [marketData, setMarketData] = useState<MarketRecommendationData | null>(null);
  const [marketLoading, setMarketLoading] = useState<boolean>(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  const [priceData, setPriceData] = useState<MarketPriceData | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Load the logged-in farmer, same pattern used in expenses.tsx.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        const parsedUser = raw ? JSON.parse(raw) : null;
        setFarmerId(parsedUser?.farmer_id ?? null);
      } catch (err) {
        setError('Failed to load logged-in farmer');
        setLoading(false);
      }
    })();
  }, []);

  const fetchPigPens = useCallback(async (selectedFarmerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/pig-pens/get_pig_pens.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: selectedFarmerId }),
      });
      const data: GetPigPensResponse = await response.json();

      if (!data.success || !data.pig_pens) {
        throw new Error(data.message || 'Failed to load pig pens');
      }

      setPigPens(data.pig_pens);

      // Auto-select when there's exactly one pig pen — no user interaction needed.
      // This also triggers the market-recommendation + market-price fetches
      // below via the useEffect watching selectedPen.
      if (data.pig_pens.length === 1) {
        setSelectedPen(data.pig_pens[0]);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load pig pens');
      setPigPens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmerId) {
      fetchPigPens(farmerId);
    }
  }, [farmerId, fetchPigPens]);

  // Fetch the live PSA market price for the selected pen's farm province.
  const fetchMarketPrice = useCallback(async (penId: number) => {
    setPriceLoading(true);
    setPriceError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/market/get_market_price.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pen_id: penId }),
      });
      const data: GetMarketPriceResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load market price');
      }

      setPriceData(data as MarketPriceData);
    } catch (err: any) {
      setPriceError(err?.message ?? 'Failed to load market price');
      setPriceData(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Fetch Market Recommendation data whenever the selected pen changes,
  // then fetch the live market price right after it.
  const fetchMarketRecommendation = useCallback(async (penId: number) => {
    setMarketLoading(true);
    setMarketError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/market/get_market_recommendation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pen_id: penId }),
      });
      const data: GetMarketRecommendationResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load market recommendation');
      }

      setMarketData(data as MarketRecommendationData);
    } catch (err: any) {
      setMarketError(err?.message ?? 'Failed to load market recommendation');
      setMarketData(null);
    } finally {
      setMarketLoading(false);
    }

    // Market price is fetched after the recommendation call, regardless of
    // whether the recommendation succeeded, so the price card can still
    // resolve independently.
    fetchMarketPrice(penId);
  }, [fetchMarketPrice]);

  useEffect(() => {
    if (selectedPen) {
      fetchMarketRecommendation(selectedPen.pen_id);
    } else {
      setMarketData(null);
      setPriceData(null);
    }
  }, [selectedPen, fetchMarketRecommendation]);

  const handleSelectPen = (pen: PigPen) => {
    setSelectedPen(pen);
  };

  return (
    <View style={styles.screen}>
      <MarketHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PigPenDropdown
          pigPens={pigPens}
          selectedPen={selectedPen}
          onSelectPen={handleSelectPen}
          loading={loading}
          error={error}
        />
        <MarketCards
          data={marketData}
          loading={marketLoading}
          error={marketError}
          priceData={priceData}
          priceLoading={priceLoading}
          priceError={priceError}
        />
        {marketData?.recommendation ? (
          <RecommendationCard recommendation={marketData.recommendation} />
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F8F9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  bottomSpacer: {
    height: 32,
  },
});