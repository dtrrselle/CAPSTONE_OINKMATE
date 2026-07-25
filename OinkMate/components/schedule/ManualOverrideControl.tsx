import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// NOTE: schedule.tsx defines its own API_BASE_URL (the ngrok tunnel host)
// as a local constant, so it isn't importable from here without creating
// a new shared config file, which is outside this task's allowed files.
// Duplicated here so this endpoint hits the same backend — if you move
// API_BASE_URL into a shared config later, point this at it too.
const API_BASE_URL =
  'https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api';
const UPDATE_MANUAL_OVERRIDE_ENDPOINT = `${API_BASE_URL}/api/iot/manual/update_manual_override.php`;
const GET_MANUAL_OVERRIDE_ENDPOINT = `${API_BASE_URL}/api/iot/manual/get_manual_override.php`;

// Shape of each Pig Pen entry. Loaded by schedule.tsx (the page that owns
// this data) and simply displayed/selected here — this component never
// fetches Pig Pens itself, so there's only ever one request per page load.
export interface PigPenOption {
  pen_id: number;
  pen_name: string;
  device_code: string;
}

interface ManualOverrideControlsProps {
  // Supplied by schedule.tsx after it loads the farmer's Pig Pens from
  // the existing Pig Pen endpoint.
  pigPens: PigPenOption[];
  // True while schedule.tsx is still fetching the Pig Pen list.
  loadingPigPens?: boolean;
  onOverrideChange?: (type: 'feeding' | 'sanitation', value: boolean) => void;
}

const ManualOverrideControls: React.FC<ManualOverrideControlsProps> = ({
  pigPens,
  loadingPigPens = false,
  onOverrideChange,
}) => {
  const [selectedPenId, setSelectedPenId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showNoPenWarning, setShowNoPenWarning] = useState(false);

  const [feedingOverride, setFeedingOverride] = useState(false);
  const [sanitationOverride, setSanitationOverride] = useState(false);
  const [feedingLoading, setFeedingLoading] = useState(false);
  const [sanitationLoading, setSanitationLoading] = useState(false);

  // Keep the selection valid as the Pig Pen list loads/changes: default
  // to the first pen once pens arrive, and fall back gracefully if the
  // previously-selected pen ever disappears from the list.
  useEffect(() => {
    setSelectedPenId((prev) => {
      if (prev !== null && pigPens.some((pen) => pen.pen_id === prev)) {
        return prev;
      }
      return pigPens.length > 0 ? pigPens[0].pen_id : null;
    });
  }, [pigPens]);

  const selectedPen = pigPens.find((pen) => pen.pen_id === selectedPenId) ?? null;

  // Switching the target Pig Pen targets a different Raspberry Pi, whose
  // actual override state we don't know yet, so reset the toggles to a
  // safe default rather than showing stale state from the previous pen.
  useEffect(() => {
    setFeedingOverride(false);
    setSanitationOverride(false);
    feedingOverrideRef.current = false;
    sanitationOverrideRef.current = false;
  }, [selectedPenId]);

  // Keep refs in sync with the loading flags so the poller (whose closure
  // is only recreated when selectedPen changes) can always check the
  // latest value without needing to be re-created on every toggle press.
  const feedingLoadingRef = useRef(feedingLoading);
  const sanitationLoadingRef = useRef(sanitationLoading);
  useEffect(() => {
    feedingLoadingRef.current = feedingLoading;
  }, [feedingLoading]);
  useEffect(() => {
    sanitationLoadingRef.current = sanitationLoading;
  }, [sanitationLoading]);

  // DEBUG: guards for the poller.
  // - isMountedRef: so a response that resolves after unmount never
  //   calls setState on an unmounted component.
  // - isFetchingStatusRef: so a slow/hanging request can't overlap with
  //   the next 5s tick and stack up parallel connections to the tunnel.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const isFetchingStatusRef = useRef(false);

  // Concurrency guards between polling (GET) and manual updates (POST):
  // - feedingUpdateInProgressRef / sanitationUpdateInProgressRef: stop the
  //   *same* toggle from firing a second overlapping update if a tap slips
  //   through before its own loading state disables the control.
  // - activeUpdateCountRef: how many manual update requests (feeding
  //   and/or sanitation) are currently in flight. The poller checks this
  //   and skips its tick entirely while it's > 0, so a GET never overlaps
  //   a POST on the same tunnel — that overlap was the source of the
  //   intermittent console errors when both toggles were pressed close
  //   together.
  const feedingUpdateInProgressRef = useRef(false);
  const sanitationUpdateInProgressRef = useRef(false);
  const activeUpdateCountRef = useRef(0);

  // Mirror the toggle values into refs, updated synchronously at the same
  // moment as the optimistic setState call (not via a useEffect, which
  // would still lag a render behind). This is what handleManualOverride
  // reads from when it needs "the other" toggle's latest value — reading
  // the plain state variable instead can capture a stale snapshot if
  // feeding and sanitation are toggled almost simultaneously, since each
  // call's closure freezes state as of when it started.
  const feedingOverrideRef = useRef(feedingOverride);
  const sanitationOverrideRef = useRef(sanitationOverride);

  // READ ONLY: fetches the backend's current manual_feeding /
  // manual_sanitation values for the selected Pig Pen and mirrors them
  // into local UI state. Never calls update_manual_override.php.
  const loadManualOverrideStatus = useCallback(async () => {
    // DEBUG: confirm both endpoints and the current pen before firing.
    console.log('GET URL:', GET_MANUAL_OVERRIDE_ENDPOINT);
    console.log('UPDATE URL:', UPDATE_MANUAL_OVERRIDE_ENDPOINT);
    console.log('Selected Pen:', selectedPen);
    console.log('Device Code:', selectedPen?.device_code);

    if (!selectedPen || !selectedPen.device_code) {
      console.log('loadManualOverrideStatus: no selected pen / device_code yet, skipping.');
      return;
    }

    // Never let a poll (GET) overlap a manual update (POST) — this is
    // what was intermittently erroring when feeding and sanitation were
    // pressed close together, since both would race a poll tick on the
    // same ngrok tunnel.
    if (activeUpdateCountRef.current > 0) {
      console.log('[poll] skipped — a manual update is in progress', {
        activeUpdates: activeUpdateCountRef.current,
      });
      return;
    }

    // Don't let a slow/hanging request overlap with the next 5s tick —
    // that's what was stacking up parallel connections to the tunnel.
    if (isFetchingStatusRef.current) {
      console.log('loadManualOverrideStatus: previous request still in flight, skipping this tick.');
      return;
    }
    isFetchingStatusRef.current = true;

    try {
      const deviceCode = selectedPen.device_code;

      // get_manual_override.php was confirmed (via a direct browser hit)
      // to respond correctly to ?device_code=... on the query string.
      // The JSON body is kept alongside it so this also keeps working
      // if the script ever starts reading php://input as well — but the
      // query string is what actually carries device_code today.
      const requestUrl = `${GET_MANUAL_OVERRIDE_ENDPOINT}?device_code=${encodeURIComponent(deviceCode)}`;

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code: deviceCode }),
      });

      // DEBUG: inspect the raw response before trusting it as JSON.
      console.log('HTTP Status:', response.status);
      const raw = await response.text();
      console.log('Raw Response:', raw);

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (parseError) {
        console.error('[poll] response was not valid JSON', {
          source: 'poll',
          endpoint: requestUrl,
          status: response.status,
          raw,
          parseError,
        });
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to load manual override status.');
      }

      if (!isMountedRef.current) {
        return;
      }

      // Don't stomp on an in-flight optimistic toggle update — let
      // handleManualOverride's own request settle that toggle first.
      if (!feedingLoadingRef.current) {
        const confirmedFeeding = Boolean(data.manual_feeding);
        setFeedingOverride(confirmedFeeding);
        feedingOverrideRef.current = confirmedFeeding;
      }
      if (!sanitationLoadingRef.current) {
        const confirmedSanitation = Boolean(data.manual_sanitation);
        setSanitationOverride(confirmedSanitation);
        sanitationOverrideRef.current = confirmedSanitation;
      }
    } catch (error) {
      // Keep whatever the UI currently shows; don't reset toggles on
      // a failed poll.
      console.error('[poll] failed to load manual override status', {
        source: 'poll',
        endpoint: GET_MANUAL_OVERRIDE_ENDPOINT,
        device_code: selectedPen?.device_code,
        error,
      });
    } finally {
      isFetchingStatusRef.current = false;
    }
  }, [selectedPen?.device_code]);

  // Load immediately when the selected Pig Pen changes, then keep polling
  // the backend every 5 seconds while this control stays mounted so the
  // toggles reflect the Raspberry Pi's post-cycle reset automatically.
  useEffect(() => {
    if (!selectedPen) {
      return;
    }

    loadManualOverrideStatus();

    const intervalId = setInterval(() => {
      loadManualOverrideStatus();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [selectedPen?.device_code, loadManualOverrideStatus]);

  const noPigPensAvailable = !loadingPigPens && pigPens.length === 0;
  const controlsDisabled = loadingPigPens || noPigPensAvailable || !selectedPen;

  const handleManualOverride = async (type: 'feeding' | 'sanitation', nextValue: boolean) => {
    if (!selectedPen) {
      // Nothing to target yet — don't touch the toggle UI or fire a
      // request; just prompt the farmer to pick a Pig Pen first.
      setShowNoPenWarning(true);
      return;
    }
    setShowNoPenWarning(false);

    // Defense-in-depth against a second overlapping request for the SAME
    // toggle (the UI already disables the control while its own
    // feedingLoading/sanitationLoading is true, but this covers any input
    // that slips through before that state commits).
    const inProgressRef =
      type === 'feeding' ? feedingUpdateInProgressRef : sanitationUpdateInProgressRef;
    if (inProgressRef.current) {
      console.log(`[manual-update] ${type} update already in progress, ignoring duplicate press.`);
      return;
    }
    inProgressRef.current = true;
    activeUpdateCountRef.current += 1;

    const deviceCode = selectedPen.device_code;
    const previousValue = type === 'feeding' ? feedingOverride : sanitationOverride;

    // Optimistically flip the toggle right away, then confirm with the
    // backend. This keeps the UI feeling instant while still being safe:
    // if the request fails, we roll the toggle back below.
    // The ref is updated in the same breath as setState (not via a
    // useEffect one render later) so that if the *other* toggle is
    // pressed a moment later — before this render has committed — it
    // reads this toggle's freshest value instead of a stale snapshot.
    if (type === 'feeding') {
      setFeedingOverride(nextValue);
      feedingOverrideRef.current = nextValue;
      setFeedingLoading(true);
    } else {
      setSanitationOverride(nextValue);
      sanitationOverrideRef.current = nextValue;
      setSanitationLoading(true);
    }

    try {
      const payload = {
        device_code: deviceCode,
        manual_feeding: type === 'feeding' ? nextValue : feedingOverrideRef.current,
        manual_sanitation: type === 'sanitation' ? nextValue : sanitationOverrideRef.current,
      };

      const response = await fetch(UPDATE_MANUAL_OVERRIDE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log(`HTTP Status (${type} update):`, response.status);
      const raw = await response.text();
      console.log(`Raw Response (${type} update):`, raw);

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (parseError) {
        console.error('[manual-update] response was not valid JSON', {
          source: 'manual-update',
          type,
          endpoint: UPDATE_MANUAL_OVERRIDE_ENDPOINT,
          status: response.status,
          raw,
          parseError,
        });
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to update manual override.');
      }

      onOverrideChange?.(type, nextValue);
    } catch (error) {
      console.error('[manual-update] failed', {
        source: 'manual-update',
        type,
        endpoint: UPDATE_MANUAL_OVERRIDE_ENDPOINT,
        device_code: deviceCode,
        attemptedValue: nextValue,
        error,
      });

      // Restore the previous toggle state since the backend didn't
      // confirm the change.
      if (type === 'feeding') {
        setFeedingOverride(previousValue);
        feedingOverrideRef.current = previousValue;
      } else {
        setSanitationOverride(previousValue);
        sanitationOverrideRef.current = previousValue;
      }
    } finally {
      if (type === 'feeding') {
        setFeedingLoading(false);
      } else {
        setSanitationLoading(false);
      }
      inProgressRef.current = false;
      activeUpdateCountRef.current = Math.max(0, activeUpdateCountRef.current - 1);
    }
  };

  return (
    <View style={styles.overrideSection}>
      <Text style={styles.overrideTitle}>Manual Override Control</Text>

      {/* TARGET PIG PEN PICKER */}
      <View style={styles.penPickerBlock}>
        <View style={styles.penPickerLabelRow}>
          <Text style={styles.penPickerLabel}>Target Pig Pen</Text>
        </View>

        {loadingPigPens ? (
          <View style={styles.penPickerLoadingRow}>
            <ActivityIndicator size="small" color="#2F5D50" />
            <Text style={styles.penPickerLoadingText}>Loading Pig Pens...</Text>
          </View>
        ) : noPigPensAvailable ? (
          <View style={styles.penPickerEmptyBox}>
            <Ionicons name="alert-circle-outline" size={15} color="#C97A00" />
            <Text style={styles.penPickerEmptyText}>No Pig Pens Available</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.penPickerButton}
              activeOpacity={0.8}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.penPickerButtonText} numberOfLines={1}>
                {selectedPen ? selectedPen.pen_name : 'Select a Pig Pen'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#8A9994" />
            </TouchableOpacity>

            <Text style={styles.deviceCodeLabel}>Device Code</Text>
            <Text style={styles.deviceCodeValue}>
              {selectedPen ? selectedPen.device_code : '—'}
            </Text>
          </>
        )}

        {showNoPenWarning && (
          <View style={styles.warningRow}>
            <Ionicons name="information-circle-outline" size={14} color="#C62828" />
            <Text style={styles.warningText}>
              Please choose a Pig Pen before using manual override.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.overrideRowDivider} />

      <View style={[styles.overrideRow, controlsDisabled && styles.overrideRowDisabled]}>
        <View style={styles.overrideRowLeft}>
          <View
            style={[
              styles.overrideDot,
              feedingOverride && styles.overrideDotActive,
            ]}
          />
          <Text style={styles.overrideRowLabel}>Feeding</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={feedingLoading || controlsDisabled}
          style={[
            styles.toggleTrack,
            feedingOverride && styles.toggleTrackActive,
            (feedingLoading || controlsDisabled) && styles.toggleTrackDisabled,
          ]}
          onPress={() => handleManualOverride('feeding', !feedingOverride)}
        >
          {feedingLoading ? (
            <ActivityIndicator
              size="small"
              color="#2F5D50"
              style={[
                styles.toggleThumb,
                feedingOverride && styles.toggleThumbActive,
              ]}
            />
          ) : (
            <View
              style={[
                styles.toggleThumb,
                feedingOverride && styles.toggleThumbActive,
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.overrideRowDivider} />

      <View style={[styles.overrideRow, controlsDisabled && styles.overrideRowDisabled]}>
        <View style={styles.overrideRowLeft}>
          <View
            style={[
              styles.overrideDot,
              sanitationOverride && styles.overrideDotActive,
            ]}
          />
          <Text style={styles.overrideRowLabel}>Sanitation</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={sanitationLoading || controlsDisabled}
          style={[
            styles.toggleTrack,
            sanitationOverride && styles.toggleTrackActive,
            (sanitationLoading || controlsDisabled) && styles.toggleTrackDisabled,
          ]}
          onPress={() => handleManualOverride('sanitation', !sanitationOverride)}
        >
          {sanitationLoading ? (
            <ActivityIndicator
              size="small"
              color="#2F5D50"
              style={[
                styles.toggleThumb,
                sanitationOverride && styles.toggleThumbActive,
              ]}
            />
          ) : (
            <View
              style={[
                styles.toggleThumb,
                sanitationOverride && styles.toggleThumbActive,
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* PIG PEN PICKER MODAL */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={pickerStyles.sheet}>
            <Text style={pickerStyles.sheetTitle}>Select Pig Pen</Text>
            {pigPens.map((pen) => {
              const isActive = pen.pen_id === selectedPenId;
              return (
                <TouchableOpacity
                  key={pen.pen_id}
                  style={[pickerStyles.option, isActive && pickerStyles.optionActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedPenId(pen.pen_id);
                    setShowNoPenWarning(false);
                    setPickerVisible(false);
                  }}
                >
                  <View style={pickerStyles.optionTextBlock}>
                    <Text
                      style={[
                        pickerStyles.optionLabel,
                        isActive && pickerStyles.optionLabelActive,
                      ]}
                    >
                      {pen.pen_name}
                    </Text>
                    <Text style={pickerStyles.optionDeviceCode}>{pen.device_code}</Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={18} color="#2F5D50" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  overrideSection: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2EDEA',
  },

  overrideTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    marginBottom: 10,
  },

  // Target Pig Pen picker block
  penPickerBlock: {
    backgroundColor: '#F7F8F9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  penPickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  penPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B6E67',
    fontFamily: 'Inter',
  },
  penPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCE6E2',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  penPickerButtonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
    marginRight: 8,
  },
  penPickerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  penPickerLoadingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8A9994',
    fontFamily: 'Inter',
  },
  penPickerEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF3E3',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  penPickerEmptyText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#A9790B',
    fontFamily: 'Inter',
  },
  deviceCodeLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#A0B5AD',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  deviceCodeValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
    letterSpacing: 0.2,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C62828',
    fontFamily: 'Inter',
    lineHeight: 15,
  },

  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  overrideRowDisabled: {
    opacity: 0.5,
  },

  overrideRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  overrideRowDivider: {
    height: 1,
    backgroundColor: '#F0F3F2',
  },

  overrideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D6DEDB',
  },

  overrideDotActive: {
    backgroundColor: '#2F5D50',
  },

  overrideRowLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },

  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2EDEA',
    padding: 3,
    justifyContent: 'center',
  },

  toggleTrackActive: {
    backgroundColor: '#2F5D50',
  },

  toggleTrackDisabled: {
    opacity: 0.7,
  },

  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 45, 39, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 6,
    shadowColor: '#0F2D24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Inter',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  optionActive: {
    backgroundColor: '#EAF7F1',
  },
  optionTextBlock: {
    gap: 2,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Inter',
  },
  optionLabelActive: {
    color: '#2F5D50',
  },
  optionDeviceCode: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A0B5AD',
    fontFamily: 'Inter',
  },
});

export default ManualOverrideControls;