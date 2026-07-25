import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  green:       '#2F5D50',
  greenLight:  '#3D7A67',
  greenMuted:  '#EAF2EF',
  pink:        '#D96C8D',
  pinkLight:   '#F9E8EE',
  bg:          '#F7F8F9',
  card:        '#FFFFFF',
  border:      '#E4E8EC',
  text:        '#1A2B26',
  textSub:     '#6B7C78',
  textHint:    '#A8B5B1',
  shadow:      '#2F5D50',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const today = new Date();
const formatDate = (d: Date) =>
  `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

const CATEGORIES = [
  'Feed',
  'Water',
  'Electricity',
  'Veterinary',
  'Maintenance',
  'Equipment',
  'Others',
];

// NOTE: dapat naka-open at naka-RUN yung ngrok tunnel mo (ngrok http <port>)
// bago mo i-test 'to, kasi kailangan live yung URL na 'to para may sumagot.
const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';

// Convert a JS Date -> "YYYY-MM-DD" for the `expense_date` column (DATE type).
const toApiDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── Tiny date picker ─────────────────────────────────────────────────────────
function DatePickerModal({
  visible,
  date,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  date: Date;
  onConfirm: (d: Date) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState(date);

  const daysInMonth = new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(sel.getFullYear(), sel.getMonth(), 1).getDay();
  const cells       = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1,
  );

  const shift = (delta: number) => {
    const d = new Date(sel.getFullYear(), sel.getMonth() + delta, 1);
    setSel(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={s.calCard}>
        {/* Month nav */}
        <View style={s.calHeader}>
          <TouchableOpacity onPress={() => shift(-1)} style={s.calNav}>
            <Text style={s.calNavTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={s.calTitle}>
            {MONTHS[sel.getMonth()]} {sel.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => shift(1)} style={s.calNav}>
            <Text style={s.calNavTxt}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={s.calRow}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <Text key={d} style={s.calDayLabel}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={s.calGrid}>
          {cells.map((day, i) => {
            const isSelected =
              day !== null &&
              day === sel.getDate() &&
              sel.getMonth() === sel.getMonth();
            const isToday =
              day !== null &&
              day === today.getDate() &&
              sel.getMonth() === today.getMonth() &&
              sel.getFullYear() === today.getFullYear();
            return (
              <TouchableOpacity
                key={i}
                style={[s.calCell, isSelected && s.calCellSel]}
                onPress={() =>
                  day && setSel(new Date(sel.getFullYear(), sel.getMonth(), day))
                }
                disabled={!day}
              >
                <Text
                  style={[
                    s.calCellTxt,
                    isSelected && s.calCellTxtSel,
                    isToday && !isSelected && s.calCellTxtToday,
                    !day && { opacity: 0 },
                  ]}
                >
                  {day ?? ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={s.calActions}>
          <TouchableOpacity onPress={onClose} style={s.calBtnSecondary}>
            <Text style={s.calBtnSecondaryTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { onConfirm(sel); onClose(); }}
            style={s.calBtnPrimary}
          >
            <Text style={s.calBtnPrimaryTxt}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Category dropdown ────────────────────────────────────────────────────────
function CategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={s.dropdownTrigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.dropdownValue, !value && { color: C.textHint }]}>
          {value || 'Select category'}
        </Text>
        <Text style={s.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={s.dropdownSheet}>
          <Text style={s.dropdownSheetTitle}>Select Category</Text>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.dropdownItem, value === cat && s.dropdownItemActive]}
              onPress={() => { onChange(cat); setOpen(false); }}
            >
              <Text style={[s.dropdownItemTxt, value === cat && s.dropdownItemTxtActive]}>
                {cat}
              </Text>
              {value === cat && <Text style={s.dropdownCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AddExpense() {
  const router = useRouter();
  const [date, setDate]           = useState(today);
  const [category, setCategory]   = useState('');
  const [amount, setAmount]       = useState('');
  const [description, setDesc]    = useState('');
  const [showCal, setShowCal]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Save-to-database flow state.
  const [isSaving, setIsSaving]             = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const amountNum  = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
  const hasPreview = category || amountNum > 0;

  // Validates the form before showing the confirmation modal.
  const handleSavePress = () => {
    if (!category) {
      Alert.alert('Missing Category', 'Please select an expense category.');
      return;
    }
    if (!amount || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
      return;
    }
    setShowConfirm(true);
  };

  // Called when the user confirms on the "Add Expense?" modal.
  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    setShowLoadingModal(true);

    try {
      // The logged-in user session is stored in AsyncStorage on login.
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        throw new Error('No logged-in user found. Please log in again.');
      }

      const user = JSON.parse(storedUser);
      const farmer_id = user?.farmer_id ?? user?.id ?? user?.user_id;

      if (!farmer_id) {
        throw new Error('No farmer_id found on stored user session.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/expenses/add_expense.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id,
            expense_date: toApiDate(date),
            category,
            amount: amountNum,
            description: description.trim(),
          }),
        }
      );

      const data = await response.json();

      setShowLoadingModal(false);

      if (data.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert('Save Failed', data.message ?? 'Something went wrong.');
      }
    } catch (error: any) {
      console.log('Add expense error:', error);
      setShowLoadingModal(false);
      Alert.alert(
        'Save Failed',
        error?.message ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color="#555" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Expense</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Form card ── */}
        <View style={s.card}>

          {/* Expense Date */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Expense Date</Text>
            <TouchableOpacity
              style={s.dateTrigger}
              onPress={() => setShowCal(true)}
              activeOpacity={0.8}
            >
              <Text style={s.dateIcon}>📅</Text>
              <Text style={s.dateValue}>{formatDate(date)}</Text>
              <Text style={s.dateChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* Category */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Category</Text>
            <CategoryDropdown value={category} onChange={setCategory} />
          </View>

          <View style={s.divider} />

          {/* Amount */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Amount</Text>
            <View style={s.amountRow}>
              <View style={s.pesoBox}>
                <Text style={s.pesoSign}>₱</Text>
              </View>
              <TextInput
                style={s.amountInput}
                placeholder="Enter expense amount"
                placeholderTextColor={C.textHint}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={s.divider} />

          {/* Description */}
          <View style={s.fieldGroup}>
            <View style={s.labelRow}>
              <Text style={s.label}>Description</Text>
              <Text style={s.optional}>Optional</Text>
            </View>
            <TextInput
              style={s.textarea}
              placeholder="Enter additional details..."
              placeholderTextColor={C.textHint}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDesc}
            />
          </View>
        </View>

        {/* ── Expense Summary Preview ── */}
        {hasPreview && (
          <View style={s.summaryCard}>
            <View style={s.summaryHeader}>
              <Text style={s.summaryDot}>●</Text>
              <Text style={s.summaryTitle}>Expense Summary</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Category</Text>
              <Text style={s.summaryVal}>{category || '—'}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Amount</Text>
              <Text style={[s.summaryVal, s.summaryAmount]}>
                {amountNum > 0 ? `₱${amountNum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
              </Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryKey}>Date</Text>
              <Text style={s.summaryVal}>{formatDate(date)}</Text>
            </View>
            {description.trim().length > 0 && (
              <View style={[s.summaryRow, { alignItems: 'flex-start' }]}>
                <Text style={s.summaryKey}>Note</Text>
                <Text style={[s.summaryVal, { flex: 1, textAlign: 'right' }]}>
                  {description.trim()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Save button ── */}
        <TouchableOpacity style={s.saveBtn} activeOpacity={0.85} onPress={handleSavePress}>
          <Text style={s.saveBtnTxt}>Save Expense</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Date picker modal */}
      <DatePickerModal
        visible={showCal}
        date={date}
        onConfirm={setDate}
        onClose={() => setShowCal(false)}
      />

      {/* ── Confirmation Modal ── */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            {/* Icon */}
            <View style={s.confirmIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={C.green} />
            </View>

            {/* Title */}
            <Text style={s.confirmTitle}>Add Expense?</Text>

            {/* Message */}
            <Text style={s.confirmMsg}>
              Are you sure you want to save this expense record?{'\n'}
              The expense will be added to your expense history.
            </Text>

            {/* Buttons */}
            <View style={s.confirmBtnRow}>
              <TouchableOpacity
                style={s.confirmBtnCancel}
                activeOpacity={0.8}
                onPress={() => setShowConfirm(false)}
                disabled={isSaving}
              >
                <Text style={s.confirmBtnCancelTxt}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.confirmBtnSave}
                activeOpacity={0.85}
                onPress={handleConfirmSave}
                disabled={isSaving}
              >
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.confirmBtnSaveTxt}>Add Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Loading Modal ── */}
      <Modal visible={showLoadingModal} transparent animationType="fade" statusBarTranslucent>
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <ActivityIndicator size="large" color={C.green} />
            <Text style={[s.confirmTitle, { marginTop: 16 }]}>Saving Expense</Text>
            <Text style={[s.confirmMsg, { marginBottom: 0 }]}>
              Please wait while the expense is being recorded.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Success Modal ── */}
      <Modal visible={showSuccessModal} transparent animationType="fade" statusBarTranslucent>
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIconWrap}>
              <Ionicons name="checkmark-circle" size={40} color={C.green} />
            </View>
            <Text style={s.confirmTitle}>Expense Added</Text>
            <Text style={s.confirmMsg}>
              Expense record has been saved successfully.
            </Text>
            <TouchableOpacity
              style={s.doneBtn}
              activeOpacity={0.85}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/expenses/expenses');
              }}
            >
              <Text style={s.doneBtnTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingTop:       48,
    paddingBottom:    14,
    paddingHorizontal: 16,
    backgroundColor:  C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor:      C.shadow,
    shadowOpacity:    0.06,
    shadowRadius:     4,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        3,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign:        'center',
    fontSize:         17,
    fontWeight:       '700',
    color:            C.text,
    letterSpacing:    0.2,
  },
  headerSpacer:       { width: 36 },

  // Scroll
  scroll:             { flex: 1 },
  scrollContent:      { padding: 16, paddingTop: 20 },

  // Form card
  card: {
    backgroundColor: C.card,
    borderRadius:    16,
    paddingHorizontal: 16,
    shadowColor:     C.shadow,
    shadowOpacity:   0.07,
    shadowRadius:    10,
    shadowOffset:    { width: 0, height: 3 },
    elevation:       3,
    marginBottom:    16,
  },
  fieldGroup:         { paddingVertical: 16 },
  divider:            { height: 1, backgroundColor: C.border },

  label: {
    fontSize:         12,
    fontWeight:       '600',
    color:            C.textSub,
    textTransform:    'uppercase',
    letterSpacing:    0.8,
    marginBottom:     10,
  },
  labelRow:           { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  optional: {
    fontSize:         11,
    color:            C.pink,
    marginLeft:       8,
    fontWeight:       '500',
    backgroundColor:  C.pinkLight,
    paddingHorizontal: 7,
    paddingVertical:  2,
    borderRadius:     8,
  },

  // Date trigger
  dateTrigger: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  C.bg,
    borderRadius:     10,
    paddingVertical:  12,
    paddingHorizontal: 14,
    borderWidth:      1,
    borderColor:      C.border,
  },
  dateIcon:           { fontSize: 16, marginRight: 10 },
  dateValue:          { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  dateChevron:        { fontSize: 18, color: C.textSub, marginRight: -2 },

  // Dropdown
  dropdownTrigger: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  C.bg,
    borderRadius:     10,
    paddingVertical:  12,
    paddingHorizontal: 14,
    borderWidth:      1,
    borderColor:      C.border,
  },
  dropdownValue:      { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  dropdownArrow:      { fontSize: 14, color: C.textSub },

  // Amount
  amountRow:          { flexDirection: 'row', alignItems: 'center' },
  pesoBox: {
    width:            44,
    height:           48,
    backgroundColor:  C.green,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    alignItems:       'center',
    justifyContent:   'center',
  },
  pesoSign:           { fontSize: 18, color: '#fff', fontWeight: '700' },
  amountInput: {
    flex:             1,
    height:           48,
    backgroundColor:  C.bg,
    borderWidth:      1,
    borderLeftWidth:  0,
    borderColor:      C.border,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    fontSize:         15,
    color:            C.text,
    fontWeight:       '500',
  },

  // Textarea
  textarea: {
    backgroundColor:  C.bg,
    borderRadius:     10,
    borderWidth:      1,
    borderColor:      C.border,
    paddingHorizontal: 14,
    paddingVertical:  12,
    fontSize:         15,
    color:            C.text,
    minHeight:        100,
    lineHeight:       22,
  },

  // Summary card
  summaryCard: {
    backgroundColor:  C.card,
    borderRadius:     16,
    padding:          16,
    marginBottom:     16,
    borderWidth:      1,
    borderColor:      C.greenMuted,
    shadowColor:      C.shadow,
    shadowOpacity:    0.06,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 2 },
    elevation:        2,
  },
  summaryHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  summaryDot:         { fontSize: 10, color: C.green, marginRight: 6 },
  summaryTitle:       { fontSize: 13, fontWeight: '700', color: C.green, letterSpacing: 0.4 },
  summaryDivider:     { height: 1, backgroundColor: C.greenMuted, marginBottom: 12 },
  summaryRow: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    marginBottom:     8,
  },
  summaryKey:         { fontSize: 13, color: C.textSub, fontWeight: '500' },
  summaryVal:         { fontSize: 13, color: C.text, fontWeight: '600' },
  summaryAmount:      { color: C.green, fontSize: 15, fontWeight: '700' },

  // Save button
  saveBtn: {
    backgroundColor:  C.green,
    borderRadius:     14,
    paddingVertical:  16,
    alignItems:       'center',
    shadowColor:      C.shadow,
    shadowOpacity:    0.25,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 4 },
    elevation:        5,
  },
  saveBtnTxt: {
    color:            '#fff',
    fontSize:         16,
    fontWeight:       '700',
    letterSpacing:    0.4,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Calendar
  calCard: {
    position:         'absolute',
    bottom:           0, left: 0, right: 0,
    backgroundColor:  C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding:          20,
    paddingBottom:    Platform.OS === 'ios' ? 36 : 24,
  },
  calHeader:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  calNav: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: C.greenMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  calNavTxt:          { fontSize: 22, color: C.green, fontWeight: '600', marginTop: -2 },
  calTitle:           { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: C.text },
  calRow:             { flexDirection: 'row', marginBottom: 8 },
  calDayLabel:        { flex: 1, textAlign: 'center', fontSize: 11, color: C.textSub, fontWeight: '600' },
  calGrid:            { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:            { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSel:         { backgroundColor: C.green, borderRadius: 999 },
  calCellTxt:         { fontSize: 14, color: C.text },
  calCellTxtSel:      { color: '#fff', fontWeight: '700' },
  calCellTxtToday:    { color: C.green, fontWeight: '700' },
  calActions:         { flexDirection: 'row', marginTop: 20, gap: 12 },
  calBtnSecondary: {
    flex: 1, paddingVertical: 13,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  calBtnSecondaryTxt: { fontSize: 15, color: C.textSub, fontWeight: '600' },
  calBtnPrimary: {
    flex: 1, paddingVertical: 13,
    borderRadius: 12, backgroundColor: C.green,
    alignItems: 'center',
  },
  calBtnPrimaryTxt:   { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Dropdown sheet
  dropdownSheet: {
    position:         'absolute',
    bottom:           0, left: 0, right: 0,
    backgroundColor:  C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop:       20,
    paddingBottom:    Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
  },
  dropdownSheetTitle: {
    fontSize:         16, fontWeight: '700', color: C.text,
    marginBottom:     16, textAlign: 'center',
  },
  dropdownItem: {
    flexDirection:    'row', alignItems: 'center',
    paddingVertical:  14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dropdownItemActive: { backgroundColor: C.greenMuted, borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -12 },
  dropdownItemTxt:    { flex: 1, fontSize: 15, color: C.text, fontWeight: '500' },
  dropdownItemTxtActive: { color: C.green, fontWeight: '700' },
  dropdownCheck:      { fontSize: 16, color: C.green, fontWeight: '700' },

  // Confirmation modal
  confirmOverlay: {
    flex:             1,
    backgroundColor:  'rgba(0,0,0,0.45)',
    alignItems:       'center',
    justifyContent:   'center',
    paddingHorizontal: 28,
  },
  confirmCard: {
    width:            '100%',
    backgroundColor:  C.card,
    borderRadius:     20,
    paddingHorizontal: 24,
    paddingTop:       28,
    paddingBottom:    24,
    alignItems:       'center',
    shadowColor:      C.shadow,
    shadowOpacity:    0.18,
    shadowRadius:     20,
    shadowOffset:     { width: 0, height: 6 },
    elevation:        10,
  },
  confirmIconWrap: {
    width:            72,
    height:           72,
    borderRadius:     36,
    backgroundColor:  C.greenMuted,
    alignItems:       'center',
    justifyContent:   'center',
    marginBottom:     16,
  },
  confirmTitle: {
    fontSize:         18,
    fontWeight:       '700',
    color:            C.text,
    marginBottom:     10,
    letterSpacing:    0.2,
  },
  confirmMsg: {
    fontSize:         14,
    color:            C.textSub,
    textAlign:        'center',
    lineHeight:       21,
    marginBottom:     24,
  },
  confirmBtnRow: {
    flexDirection:    'row',
    gap:              12,
    width:            '100%',
  },
  confirmBtnCancel: {
    flex:             1,
    paddingVertical:  13,
    borderRadius:     12,
    backgroundColor:  C.bg,
    borderWidth:      1,
    borderColor:      C.border,
    alignItems:       'center',
    justifyContent:   'center',
  },
  confirmBtnCancelTxt: {
    fontSize:         15,
    fontWeight:       '600',
    color:            C.textSub,
  },
  confirmBtnSave: {
    flex:             1,
    flexDirection:    'row',
    paddingVertical:  13,
    borderRadius:     12,
    backgroundColor:  C.green,
    alignItems:       'center',
    justifyContent:   'center',
    shadowColor:      C.shadow,
    shadowOpacity:    0.22,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 3 },
    elevation:        4,
  },
  confirmBtnSaveTxt: {
    fontSize:         15,
    fontWeight:       '700',
    color:            '#fff',
  },

  // Success modal primary action button (e.g. "Done") — full-width, larger
  // than confirmBtnSave since it stands alone (no Cancel button beside it),
  // matching the Schedule module's success modal button sizing.
  doneBtn: {
    width:            '100%',
    paddingVertical:  16,
    borderRadius:     14,
    backgroundColor:  C.green,
    alignItems:       'center',
    justifyContent:   'center',
    shadowColor:      C.shadow,
    shadowOpacity:    0.22,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 3 },
    elevation:        4,
  },
  doneBtnTxt: {
    fontSize:         16,
    fontWeight:       '700',
    color:            '#fff',
    letterSpacing:    0.3,
  },
});