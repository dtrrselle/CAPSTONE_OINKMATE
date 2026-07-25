import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Image,
  Modal,
  Keyboard,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// ── Swap to require('../assets/logo.png') once you have the asset ─────────
const LOGO_SOURCE = require('../../assets/images/logo.png');

// ── Password requirements ─────────────────────────────────────────────────
const REQS = [
  { key: 'len',     label: 'Minimum 8 characters',  test: (p: string) => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase letter',       test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Lowercase letter',       test: (p: string) => /[a-z]/.test(p) },
  { key: 'number',  label: 'Number',                 test: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special character',      test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function ReqItem({ met, label }: { met: boolean; label: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: met ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [met]);
  const color = anim.interpolate({ inputRange: [0, 1], outputRange: ['#C0C0C0', '#2F5D50'] });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      <Animated.View style={[rqS.dot, { backgroundColor: color }]}>
        {met && <Ionicons name="checkmark" size={9} color="#FFF" />}
      </Animated.View>
      <Animated.Text style={[rqS.label, { color }]}>{label}</Animated.Text>
    </View>
  );
}
const rqS = StyleSheet.create({
  dot:   { width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 9 },
  label: { fontSize: 13 },
});

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

export default function SignUp() {
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;
  const cardWidth = isTablet ? Math.min(520, width * 0.7) : width - 44;

  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullname,       setFullname]       = useState('');
  const [contactNumber,  setContactNumber]  = useState('');
  const [farmName,       setFarmName]       = useState('');
  const [farmAddress,    setFarmAddress]    = useState('');
  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [confirmPassword,setConfirmPassword]= useState('');
  const [loading,        setLoading]        = useState(false);

  const [focused, setFocused] = useState<string | null>(null);

  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched,  setConfirmTouched]  = useState(false);
  const [emailBlurred,    setEmailBlurred]    = useState(false);

  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL);
  const closeModal = () => setModal(m => ({ ...m, visible: false }));
  const showModal  = (cfg: Partial<ModalState>) =>
    setModal({ ...INITIAL_MODAL, visible: true, onPrimary: closeModal, ...cfg });

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Keyboard-aware scrolling: keeps the focused input visible ───────────
  // Uses onLayout-measured y-offsets to avoid measureLayout() which is
  // incompatible with the Fabric (new) architecture in Expo SDK 54+.
  const scrollRef  = useRef<ScrollView>(null);
  const inputRefs  = useRef<Record<string, TextInput | null>>({});
  const layoutRefs = useRef<Record<string, number>>({});

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

  // Derived
  const emailValid      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const metReqs         = REQS.map(r => r.test(password));
  const allReqsMet      = metReqs.every(Boolean);
  const passwordsMatch  = password === confirmPassword && confirmPassword.length > 0;
  const showMismatch    = confirmTouched && confirmPassword.length > 0 && !passwordsMatch;
  const showMatch       = confirmTouched && confirmPassword.length > 0 &&  passwordsMatch;
  const showEmailErr    = emailBlurred && email.length > 0 && !emailValid;

  // ── Validation guard — NO API call if validation fails ───────────────────
  const handleRegister = async () => {
    setPasswordTouched(true);
    setConfirmTouched(true);
    setEmailBlurred(true);
    Keyboard.dismiss();

    if (!fullname.trim() || !contactNumber.trim() || !farmName.trim() ||
        !farmAddress.trim() || !email.trim() || !password || !confirmPassword) {
      triggerShake();
      showModal({
        kind: 'error',
        title: 'Missing Information',
        message: 'Please fill in all required fields before continuing.',
      });
      return;
    }
    if (!emailValid) {
      triggerShake();
      showModal({
        kind: 'error',
        title: 'Invalid Email',
        message: 'Enter a valid email address (e.g. user@gmail.com).',
      });
      return;
    }
    if (!allReqsMet) {
      triggerShake();
      showModal({
        kind: 'error',
        title: 'Password Requirements',
        message: 'Your password does not meet all the requirements listed below it.',
      });
      return;
    }
    if (!passwordsMatch) {
      triggerShake();
      showModal({
        kind: 'error',
        title: "Passwords Don't Match",
        message: 'Please make sure both password fields are identical.',
      });
      return;
    }

    // ── All validations passed — safe to call API ────────────────────────
    setLoading(true);
    try {
      const response = await fetch(
        'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api/farmer_register.php',
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullname:       fullname.trim(),
            contact_number: contactNumber.trim(),
            farm_name:      farmName.trim(),
            farm_address:   farmAddress.trim(),
            email:          email.trim(),
            password,
          }),
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
        showModal({
          kind: 'success',
          title: 'Registration Successful',
          message: 'Your account has been created successfully.',
          primaryLabel: 'Continue to Sign In',
          onPrimary: () => { closeModal(); router.push('/authentication/signin'); },
        });
      } else {
        triggerShake();
        showModal({
          kind: 'error',
          title: 'Registration Failed',
          message: result.message || 'Something went wrong. Please try again.',
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

  const bdr = (field: string, hasErr?: boolean) =>
    hasErr ? '#C0394B' : focused === field ? '#2F5D50' : '#EDE8EA';
  const bg  = (field: string, hasErr?: boolean) =>
    hasErr ? '#FFF5F6' : focused === field ? '#F4FAF8' : '#F9F9F9';

  const focusField = (field: string) => { setFocused(field); scrollToInput(field); };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View style={{ flex: 1, transform: [{ translateX: shakeAnim }] }}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.inner, { width: cardWidth }]}>

              {/* BACK BUTTON */}
              <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/authentication/signin')}>
                <View style={styles.backBtnInner}>
                  <Ionicons name="arrow-back" size={19} color="#F59BB1" />
                </View>
              </TouchableOpacity>

              {/* LOGO */}
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

              {/* BRAND */}
              <Text style={styles.subtitle}>Smart Piggery Management System</Text>

              {/* CARD */}
              <View style={styles.card}>
                <Text style={[styles.header, { fontSize: isTablet ? 28 : 24 }]}>Create your account</Text>
                <Text style={styles.desc}>Join OinkMate today!</Text>

                {/* ── PERSONAL INFO ───────────────────────────── */}
                <Text style={styles.sectionLbl}>PERSONAL INFO</Text>

                {/* Full Name */}
                <View style={[styles.inputWrap, { borderColor: bdr('fullname'), backgroundColor: bg('fullname') }]} onLayout={e => { layoutRefs.current.fullname = e.nativeEvent.layout.y; }}>
                  <Ionicons name="person-outline" size={19} color={focused === 'fullname' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.fullname = r; }}
                    placeholder="Full Name"
                    placeholderTextColor="#C5C5C5"
                    value={fullname}
                    onChangeText={setFullname}
                    onFocus={() => focusField('fullname')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.contact?.focus()}
                    style={styles.input}
                  />
                </View>

                {/* Contact Number */}
                <View style={[styles.inputWrap, { borderColor: bdr('contact'), backgroundColor: bg('contact') }]} onLayout={e => { layoutRefs.current.contact = e.nativeEvent.layout.y; }}>
                  <Ionicons name="call-outline" size={19} color={focused === 'contact' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.contact = r; }}
                    placeholder="Contact Number"
                    placeholderTextColor="#C5C5C5"
                    keyboardType="phone-pad"
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    onFocus={() => focusField('contact')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.farmname?.focus()}
                    style={styles.input}
                  />
                </View>

                {/* ── FARM DETAILS ─────────────────────────────── */}
                <Text style={styles.sectionLbl}>FARM DETAILS</Text>

                {/* Farm Name */}
                <View style={[styles.inputWrap, { borderColor: bdr('farmname'), backgroundColor: bg('farmname') }]} onLayout={e => { layoutRefs.current.farmname = e.nativeEvent.layout.y; }}>
                  <Ionicons name="home-outline" size={19} color={focused === 'farmname' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.farmname = r; }}
                    placeholder="Farm Name"
                    placeholderTextColor="#C5C5C5"
                    value={farmName}
                    onChangeText={setFarmName}
                    onFocus={() => focusField('farmname')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.farmaddr?.focus()}
                    style={styles.input}
                  />
                </View>

                {/* Farm Address */}
                <View style={[styles.inputWrap, { borderColor: bdr('farmaddr'), backgroundColor: bg('farmaddr') }]} onLayout={e => { layoutRefs.current.farmaddr = e.nativeEvent.layout.y; }}>
                  <Ionicons name="location-outline" size={19} color={focused === 'farmaddr' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.farmaddr = r; }}
                    placeholder="Farm Address"
                    placeholderTextColor="#C5C5C5"
                    value={farmAddress}
                    onChangeText={setFarmAddress}
                    onFocus={() => focusField('farmaddr')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.email?.focus()}
                    style={styles.input}
                  />
                </View>

                {/* ── ACCOUNT ──────────────────────────────────── */}
                <Text style={styles.sectionLbl}>ACCOUNT</Text>

                {/* Email */}
                <View style={[styles.inputWrap, { borderColor: bdr('email', showEmailErr), backgroundColor: bg('email', showEmailErr) }]} onLayout={e => { layoutRefs.current.email = e.nativeEvent.layout.y; }}>
                  <Ionicons name="mail-outline" size={19} color={focused === 'email' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.email = r; }}
                    placeholder="Email"
                    placeholderTextColor="#C5C5C5"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={v => setEmail(v)}
                    onFocus={() => focusField('email')}
                    onBlur={() => { setFocused(null); setEmailBlurred(true); }}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.password?.focus()}
                    style={styles.input}
                  />
                  {email.length > 0 && (
                    <Ionicons
                      name={emailValid ? 'checkmark-circle' : 'close-circle'}
                      size={17}
                      color={emailValid ? '#2F5D50' : (showEmailErr ? '#C0394B' : '#DDD')}
                    />
                  )}
                </View>
                {showEmailErr && (
                  <Text style={styles.fieldError}>
                    <Ionicons name="alert-circle-outline" size={12} color="#C0394B" /> Enter a valid email (e.g. user@gmail.com)
                  </Text>
                )}

                {/* Password */}
                <View style={[styles.inputWrap, { borderColor: bdr('password'), backgroundColor: bg('password') }]} onLayout={e => { layoutRefs.current.password = e.nativeEvent.layout.y; }}>
                  <Ionicons name="lock-closed-outline" size={19} color={focused === 'password' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.password = r; }}
                    placeholder="Password"
                    placeholderTextColor="#C5C5C5"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={v => { setPassword(v); setPasswordTouched(true); }}
                    onFocus={() => focusField('password')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                    onSubmitEditing={() => inputRefs.current.confirm?.focus()}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(s => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color="#AAA" />
                  </TouchableOpacity>
                </View>

                {/* Password Requirements */}
                {passwordTouched && (
                  <View style={styles.reqCard}>
                    {REQS.map((r, i) => <ReqItem key={r.key} met={metReqs[i]} label={r.label} />)}
                  </View>
                )}

                {/* Confirm Password */}
                <View style={[styles.inputWrap, { borderColor: bdr('confirm', showMismatch), backgroundColor: bg('confirm', showMismatch), marginTop: 4 }]} onLayout={e => { layoutRefs.current.confirm = e.nativeEvent.layout.y; }}>
                  <Ionicons name="lock-closed-outline" size={19} color={focused === 'confirm' ? '#2F5D50' : '#AAA'} />
                  <TextInput
                    ref={r => { inputRefs.current.confirm = r; }}
                    placeholder="Confirm Password"
                    placeholderTextColor="#C5C5C5"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={v => { setConfirmPassword(v); setConfirmTouched(true); }}
                    onFocus={() => focusField('confirm')}
                    onBlur={() => setFocused(null)}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(s => !s)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={19} color="#AAA" />
                  </TouchableOpacity>
                </View>

                {/* Match / Mismatch */}
                {(showMatch || showMismatch) && (
                  <View style={styles.matchRow}>
                    <Ionicons
                      name={showMatch ? 'checkmark-circle' : 'close-circle'}
                      size={15}
                      color={showMatch ? '#2F5D50' : '#C0394B'}
                    />
                    <Text style={[styles.matchText, { color: showMatch ? '#2F5D50' : '#C0394B' }]}>
                      {showMatch ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}

                {/* CREATE ACCOUNT BUTTON */}
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.82}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.primaryBtnText}>Create Account</Text>
                  }
                </TouchableOpacity>

                {/* SIGN IN LINK */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <TouchableOpacity onPress={() => router.push('/authentication/signin')}>
                    <Text style={styles.signinLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <AuthModal {...modal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8' },
  scroll:    { flexGrow: 1, alignItems: 'center', paddingVertical: 28, paddingBottom: 64 },
  inner:     { alignSelf: 'center' },

  // Back
  backBtn:      { marginBottom: 14, alignSelf: 'flex-start' },
  backBtnInner: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#FFF0F4', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F5C8D5',
  },

  // Logo
  logoWrap: { alignSelf: 'center', marginBottom: -22 },
  logoPH: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#F59BB1',
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF0F4',
  },
  logoImage: { borderRadius: 22 },

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
    backgroundColor: '#FFF', borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 24,
    shadowColor: '#F59BB1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13, shadowRadius: 18, elevation: 6,
  },
  header: { textAlign: 'center', fontWeight: '700', color: '#2F5D50' },
  desc:   { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 4, marginBottom: 20 },

  sectionLbl: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    color: '#F59BB1', marginBottom: 10, marginTop: 6,
  },

  // Inputs
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 13, paddingHorizontal: 13,
    minHeight: 52, paddingVertical: 8, borderWidth: 1.5, marginBottom: 11,
  },
  input:      { flex: 1, marginLeft: 9, fontSize: 15, color: '#333' },
  fieldError: { color: '#C0394B', fontSize: 12, marginBottom: 10, marginTop: -6, marginLeft: 2 },

  // Password checker
  reqCard: {
    backgroundColor: '#F7FBF9', borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#D4EDE6',
  },

  // Match row
  matchRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: -4, marginLeft: 2 },
  matchText: { fontSize: 13, marginLeft: 6, fontWeight: '500' },

  // Buttons
  primaryBtn: {
    backgroundColor: '#2F5D50', minHeight: 52, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowColor: '#2F5D50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  // Footer
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#666', fontSize: 14 },
  signinLink: { color: '#F59BB1', marginLeft: 5, fontWeight: '700', fontSize: 14 },
});