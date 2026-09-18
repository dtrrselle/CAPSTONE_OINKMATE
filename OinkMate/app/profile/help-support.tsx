import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// TODO: replace with actual support contact details
const CONTACT_OPTIONS = [
  {
    key: 'email',
    icon: 'mail-outline' as const,
    label: 'Email Support',
    value: 'support@oinkmate.ph',
    action: () => Linking.openURL('mailto:support@oinkmate.ph'),
  },
  {
    key: 'phone',
    icon: 'call-outline' as const,
    label: 'Call Us',
    value: '+63 900 000 0000',
    action: () => Linking.openURL('tel:+639000000000'),
  },
  {
    key: 'facebook',
    icon: 'logo-facebook' as const,
    label: 'Facebook Page',
    value: 'facebook.com/oinkmate',
    action: () => Linking.openURL('https://facebook.com/oinkmate'),
  },
];

const SUPPORT_OPTIONS = [
  {
    key: 'feedback',
    icon: 'chatbubble-outline' as const,
    label: 'Send Feedback',
    description: 'Share your comments, suggestions, or report any issues.',
  },
];

const FAQS = [
  {
    key: 'faq1',
    question: 'How do I add a new pig pen?',
    answer: 'Go to Pig Pens from the Dashboard or Quick Access, then tap the + button at the top right corner.',
  },
  {
    key: 'faq2',
    question: 'How does the manual override control work?',
    answer: 'Open the Schedule screen. You will see Manual Override toggles for Feeding and Sanitation at the top — toggle them on to activate immediately outside the regular schedule.',
  },
  {
    key: 'faq3',
    question: 'How do I set up automatic feeding schedules?',
    answer: 'Go to the Schedule screen and tap Add Schedule. Set the time, frequency, and type (Feeding or Sanitation), then save.',
  },
  {
    key: 'faq4',
    question: 'Can I track my farm expenses?',
    answer: 'Yes. Access Expenses from the Dashboard Quick Access or the Reports module to log and review your farm costs.',
  },
];

export default function HelpSupport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const toggleFaq = (key: string) => {
    setOpenFaq((prev) => (prev === key ? null : key));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Ionicons name="chevron-back" size={20} color="#2F5D50" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact options */}
        <Text style={styles.sectionLabel}>Contact Us</Text>
        <View style={styles.card}>
          {CONTACT_OPTIONS.map((option, index) => (
            <View key={option.key}>
              <TouchableOpacity
                style={styles.contactRow}
                activeOpacity={0.7}
                onPress={option.action}
              >
                <View style={styles.contactIconWrap}>
                  <Ionicons name={option.icon} size={17} color="#2F5D50" />
                </View>
                <View style={styles.contactTextBlock}>
                  <Text style={styles.contactLabel}>{option.label}</Text>
                  <Text style={styles.contactValue}>{option.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#C3CDC9" />
              </TouchableOpacity>
              {index < CONTACT_OPTIONS.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Support options */}
        <Text style={styles.sectionLabel}>Support Options</Text>
        <View style={styles.card}>
          {SUPPORT_OPTIONS.map((option, index) => (
            <View key={option.key}>
              <TouchableOpacity
                style={styles.supportRow}
                activeOpacity={0.7}
                onPress={() => router.push('/profile/feedback')}
              >
                <View style={styles.supportIconWrap}>
                  <Ionicons name={option.icon} size={17} color="#D96C8D" />
                </View>
                <View style={styles.supportTextBlock}>
                  <Text style={styles.supportLabel}>{option.label}</Text>
                  <Text style={styles.supportDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="#C3CDC9" />
              </TouchableOpacity>
              {index < SUPPORT_OPTIONS.length - 1 && (
                <View style={styles.rowDivider} />
              )}
            </View>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionLabel}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          {FAQS.map((faq, index) => (
            <View key={faq.key}>
              <TouchableOpacity
                style={styles.faqRow}
                activeOpacity={0.7}
                onPress={() => toggleFaq(faq.key)}
              >
                <View style={styles.faqQuestionWrap}>
                  <Ionicons
                    name="help-circle-outline"
                    size={16}
                    color="#2F5D50"
                    style={{ marginTop: 1 }}
                  />
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                </View>
                <Ionicons
                  name={openFaq === faq.key ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color="#C3CDC9"
                />
              </TouchableOpacity>

              {openFaq === faq.key && (
                <View style={styles.faqAnswerWrap}>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              )}

              {index < FAQS.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  headerSpacer: {
    width: 36,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A2B22',
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9AACAB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: -2,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  rowDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
    marginHorizontal: 16,
  },

  /* Contact */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF7F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactTextBlock: {
    flex: 1,
    gap: 2,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  contactValue: {
    fontSize: 11.5,
    color: '#2F5D50',
    fontFamily: 'Inter',
    fontWeight: '600',
  },

  /* Support options */
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  supportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FBEEF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTextBlock: {
    flex: 1,
    gap: 2,
  },
  supportLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  supportDescription: {
    fontSize: 11,
    color: '#8A9994',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 15,
  },

  /* FAQ */
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  faqQuestionWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 12.5,
    color: '#4A5C57',
    fontFamily: 'Inter',
    fontWeight: '500',
    lineHeight: 19,
    backgroundColor: '#F7F8F9',
    borderRadius: 10,
    padding: 12,
  },

  bottomSpacer: { height: 24 },
});