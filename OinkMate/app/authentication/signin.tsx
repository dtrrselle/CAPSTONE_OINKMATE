import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Keyboard,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Swap to require('../assets/logo.png') once you have the asset ─────────
const LOGO_SOURCE = require('../../assets/images/logo.png');

// ── Feedback modal (OinkMate themed) ───────────────────────────────────────
// Centered, visible regardless of scroll position — replaces messages that
// could get scrolled out of view on long forms / small screens.
type ModalKind = 'success' | 'error' | 'info';
interface ModalState {
  visible: boolean;
  kind: ModalKind;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
}
const INITIAL_MODAL: ModalState = {
  visible: false,
  kind: 'info',
  title: '',
  message: '',
  primaryLabel: 'OK',
  onPrimary: () => {},
};

function AuthModal({ visible, kind, title, message, primaryLabel, onPrimary }: Omit<ModalState, never>) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 65 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const icon = kind === 'success' ? 'checkmark-circle' : kind === 'error' ? 'close-circle' : 'information-circle';
  const color = kind === 'success' ? '#2F5D50' : kind === 'error' ? '#C0394B' : '#3B5BDB';
  const iconBg = kind === 'success' ? '#EBF7F2' : kind === 'error' ? '#FEF0F2' : '#EEF4FF';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onPrimary}>
      <View style={modalS.backdrop}>
        <Animated.View style={[modalS.card, { opacity, transform: [{ scale }] }]}>
          <View style={[modalS.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={38} color={color} />
          </View>
          <Text style={modalS.title}>{title}</Text>
          <Text style={modalS.message}>{message}</Text>
          <TouchableOpacity
            style={[modalS.btn, { backgroundColor: color }]}
            onPress={onPrimary}
            activeOpacity={0.85}
          >
            <Text style={modalS.btnText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const modalS = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(47,93,80,0.38)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 24,
    paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  title:   { fontSize: 19, fontWeight: '700', color: '#2F5D50', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn:     { width: '100%', height: 50, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15.5 },
});

export default function SignIn() {
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;
  const cardWidth = isTablet ? Math.min(500, width * 0.7) : width - 44;

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [emailFocused,    setEmailFocused]    = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [emailError,    setEmailError]    = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL);
  const closeModal = () => setModal(m => ({ ...m, visible: false }));
  const showModal  = (cfg: Partial<ModalState>) =>
    setModal({ ...INITIAL_MODAL, visible: true, onPrimary: closeModal, ...cfg });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Keyboard-aware scrolling: keeps the focused input visible ───────────
  // Uses onLayout-measured y-offsets to avoid measureLayout() which is
  // incompatible with the Fabric (new) architecture in Expo SDK 54+.
  const scrollRef   = useRef<ScrollView>(null);
  const inputRefs   = useRef<Record<string, TextInput | null>>({});
  const layoutRefs  = useRef<Record<string, number>>({});

  const scrollToInput = (key: string) => {
    const delay = Platform.OS === 'ios' ? 60 : 220;
    setTimeout(() => {
      const y = layoutRefs.current[key];
      if (y != null && scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(y - 40, 0), animated: true });
      }
    }, delay);
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (v: string) => {
    if (!v.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
    return '';
  };
  const validatePassword = (v: string) => {
    if (!v) return 'Password is required';
    return '';
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      triggerShake();
      showModal({
        kind: 'error',
        title: 'Missing Information',
        message: eErr && pErr ? 'Please enter your email and password to continue.' : (eErr || pErr),
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
          'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api/farmer_login.php',
                {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        }
      );

      if (!response.ok) {
        triggerShake();
        showModal({
          kind: 'error',
          title: 'Server Error',
          message: `We hit a snag on our end (${response.status}). Please try again.`,
        });
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        console.log("Logged in user:", result.user);
        await AsyncStorage.setItem(
          "user",
          JSON.stringify(result.user)
        );
        showModal({
          kind: 'success',
          title: 'Welcome Back!',
          message: 'Login successful.',
          primaryLabel: 'Continue',
          onPrimary: () => { closeModal(); router.replace('/(tabs)/dashboard');},
        });
      } else {
        triggerShake();
        showModal({
          kind: 'error',
          title: 'Login Failed',
          message: result.message || 'Incorrect email or password. Please try again.',
        });
      }
    } catch (error) {
      console.log(error);
      triggerShake();
      showModal({
        kind: 'error',
        title: 'Connection Error',
        message: 'Unable to connect. Check your internet connection and try again.',
      });
    }
    setLoading(false);
  };

  const inputBorderColor = (focused: boolean, hasError: boolean) =>
    hasError ? '#C0394B' : focused ? '#2F5D50' : '#EDE8EA';
  const inputBg = (focused: boolean, hasError: boolean) =>
    hasError ? '#FFF5F6' : focused ? '#F4FAF8' : '#F9F9F9';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.inner, { width: cardWidth, transform: [{ translateX: shakeAnim }] }]}>

            {/* ── LOGO ──────────────────────────────────────────── */}
            <View style={styles.logoWrap}>
              {LOGO_SOURCE ? (
               <Image
                  source={LOGO_SOURCE}
                  style={[
                    styles.logoImage,
                    {
                      width: isTablet ? 180 : 120,
                      height: isTablet ? 180 : 140,
                    },
                  ]}
                  resizeMode="contain"
                />

              ) : (
                <View style={[styles.logoPH, { width: isTablet ? 130 : 100, height: isTablet ? 130 : 100 }]}>
                  <Ionicons name="leaf-outline" size={isTablet ? 52 : 40} color="#F5A8B8" />
                </View>
              )}
            </View>

            {/* ── BRAND ─────────────────────────────────────────── */}
      
            <Text style={styles.subtitle}>Smart Piggery Management System</Text>

            {/* ── CARD ──────────────────────────────────────────── */}
            <View style={styles.card}>
              <Text style={[styles.welcome, { fontSize: isTablet ? 28 : 24 }]}>Welcome back!</Text>
              <Text style={styles.subhead}>Sign in to continue</Text>

              {/* EMAIL */}
              <View style={styles.fieldGroup}>
                <View
                  onLayout={e => { layoutRefs.current.email = e.nativeEvent.layout.y; }}
                  style={[
                    styles.inputWrap,
                    { borderColor: inputBorderColor(emailFocused, !!emailError),
                      backgroundColor: inputBg(emailFocused, !!emailError) }
                  ]}
                >
                  <Ionicons name="mail-outline" size={19} color={emailFocused ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.email = r; }}
                    placeholder="Email"
                    placeholderTextColor="#C5C5C5"
                    value={email}
                    onChangeText={v => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
                    onFocus={() => { setEmailFocused(true); scrollToInput('email'); }}
                    onBlur={() => { setEmailFocused(false); setEmailError(validateEmail(email)); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.password?.focus()}
                    style={styles.input}
                  />
                  {email.length > 0 && !emailError && (
                    <Ionicons name="checkmark-circle" size={17} color="#2F5D50" />
                  )}
                </View>
                {!!emailError && (
                  <Text style={styles.fieldError}>
                    <Ionicons name="alert-circle-outline" size={12} color="#C0394B" /> {emailError}
                  </Text>
                )}
              </View>

              {/* PASSWORD */}
              <View style={styles.fieldGroup}>
                <View
                  onLayout={e => { layoutRefs.current.password = e.nativeEvent.layout.y; }}
                  style={[
                    styles.inputWrap,
                    { borderColor: inputBorderColor(passwordFocused, !!passwordError),
                      backgroundColor: inputBg(passwordFocused, !!passwordError) }
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={19} color={passwordFocused ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.password = r; }}
                    placeholder="Password"
                    placeholderTextColor="#C5C5C5"
                    value={password}
                    onChangeText={v => { setPassword(v); if (passwordError) setPasswordError(validatePassword(v)); }}
                    onFocus={() => { setPasswordFocused(true); scrollToInput('password'); }}
                    onBlur={() => { setPasswordFocused(false); setPasswordError(validatePassword(password)); }}
                    secureTextEntry={!passwordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    style={styles.input}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(p => !p)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name={passwordVisible ? 'eye-outline' : 'eye-off-outline'} size={19} color="#AAA" />
                  </TouchableOpacity>
                </View>
                {!!passwordError && (
                  <Text style={styles.fieldError}>
                    <Ionicons name="alert-circle-outline" size={12} color="#C0394B" /> {passwordError}
                  </Text>
                )}
              </View>

              {/* REMEMBER ME + FORGOT */}
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(r => !r)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                    {rememberMe && <Ionicons name="checkmark" size={11} color="#FFF" />}
                  </View>
                  <Text style={styles.rememberLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/authentication/forgot-password')}>
                  <Text style={styles.forgot}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* SIGN IN BUTTON */}
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.82}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.primaryBtnText}>Sign In</Text>
                }
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => router.push('/authentication/signup')}
                activeOpacity={0.8}
              >
                <Text style={styles.outlineBtnText}>Create Account</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AuthModal {...modal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8' },
  scroll:    { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, paddingBottom: 64, alignItems: 'center' },
  inner:     { alignSelf: 'center' },

  // Logo
  logoWrap:  { alignSelf: 'center', marginBottom: -25 },
  logoPH: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#F5A8B8',
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF0F4',
  },
  logoImage: { borderRadius: 20 },

  // Brand
  title:    { textAlign: 'center', fontWeight: 'bold' },
  green:    { color: '#2F5D50' },
  pink:     { color: '#F59BB1' },
  subtitle: {
  textAlign: 'center',
  color: '#2F5D50',
  fontSize: 13,
  marginTop: -10,
  marginBottom: 22,
},
  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 22, paddingVertical: 28,
    shadowColor: '#F59BB1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13, shadowRadius: 18,
    elevation: 6,
  },
  welcome: { textAlign: 'center', fontWeight: '700', color: '#2F5D50' },
  subhead: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 4, marginBottom: 26 },

  // Inputs — each field now sits in its own group with breathing room below it
  fieldGroup: { marginBottom: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 13, paddingHorizontal: 13,
    minHeight: 54, paddingVertical: 8, borderWidth: 1.5,
  },
  input: { flex: 1, marginLeft: 9, fontSize: 15, color: '#333' },
  fieldError: { color: '#C0394B', fontSize: 12, marginTop: 6, marginLeft: 2 },

  // Remember / Forgot
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 18 },
  rememberRow:  { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18, height: 18, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#CCC',
    justifyContent: 'center', alignItems: 'center', marginRight: 7,
  },
  checkboxOn:    { backgroundColor: '#2F5D50', borderColor: '#2F5D50' },
  rememberLabel: { color: '#666', fontSize: 13 },
  forgot:        { color: '#F59BB1', fontWeight: '600', fontSize: 13 },

  // Buttons
  primaryBtn: {
    backgroundColor: '#2F5D50', minHeight: 54, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2F5D50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  btnDisabled:     { opacity: 0.6 },
  primaryBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine:{ flex: 1, height: 1, backgroundColor: '#EEE' },
  orText:     { marginHorizontal: 12, color: '#BBB', fontSize: 13 },

  outlineBtn: {
    borderWidth: 2, borderColor: '#F59BB1', minHeight: 54,
    borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  outlineBtnText: { color: '#F59BB1', fontWeight: '700', fontSize: 16 },
});