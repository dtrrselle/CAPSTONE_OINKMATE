import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --------------------------------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------------------------------

// Production backend.
// Do NOT point this at an ngrok tunnel or another temporary/dev host.
const API_BASE_URL =
  'https://oinkmate.online/oinkmate-api';

const UPDATE_MANUAL_OVERRIDE_ENDPOINT =
  `${API_BASE_URL}/api/iot/manual/update_manual_override.php`;

const GET_MANUAL_OVERRIDE_ENDPOINT =
  `${API_BASE_URL}/api/iot/manual/get_manual_override.php`;

const MANUAL_FEEDING_ENDPOINT =
  `${API_BASE_URL}/api/iot/manual/manual_feeding.php`;

const MANUAL_SANITATION_ENDPOINT =
  `${API_BASE_URL}/api/iot/manual/manual_sanitation.php`;

// --------------------------------------------------------------------------
// TYPES
// --------------------------------------------------------------------------

export interface PigPenOption {
  pen_id: number;
  pen_name: string;
  device_code: string;
  pig_count?: number | null;
}

// --------------------------------------------------------------------------
// MANUAL FEEDING DETAILS FORM CONFIG (NEW - Phase 1: frontend only)
// --------------------------------------------------------------------------
//
// These correspond to the existing feeding_reference.csv age brackets:
//   0–28 days    -> Creep
//   28–58 days   -> Pre-Starter
//   58–70 days   -> Starter
//   70–140 days  -> Grower
//   140–196 days -> Finisher
const FEED_TYPE_OPTIONS: string[] = [
  'Creep',
  'Pre-Starter',
  'Starter',
  'Grower',
  'Finisher',
];

interface ManualOverrideControlsProps {
  // Supplied by schedule.tsx after it loads the farmer's Pig Pens.
  pigPens: PigPenOption[];

  // True while schedule.tsx is still fetching the Pig Pen list.
  loadingPigPens?: boolean;

  onOverrideChange?: (
    type: 'feeding' | 'sanitation',
    value: boolean
  ) => void;
}

// --------------------------------------------------------------------------
// COMPONENT
// --------------------------------------------------------------------------

const ManualOverrideControls: React.FC<
  ManualOverrideControlsProps
> = ({
  pigPens,
  loadingPigPens = false,
  onOverrideChange,
}) => {

  // ------------------------------------------------------------------------
  // PIG PEN SELECTION
  // ------------------------------------------------------------------------

  const [selectedPenId, setSelectedPenId] =
    useState<number | null>(null);

  const [pickerVisible, setPickerVisible] =
    useState(false);

  const [showNoPenWarning, setShowNoPenWarning] =
    useState(false);


  // ------------------------------------------------------------------------
  // MANUAL OVERRIDE STATES
  // ------------------------------------------------------------------------

  const [feedingOverride, setFeedingOverride] =
    useState(false);

  const [sanitationOverride, setSanitationOverride] =
    useState(false);

  const [feedingLoading, setFeedingLoading] =
    useState(false);

  const [sanitationLoading, setSanitationLoading] =
    useState(false);


  // ------------------------------------------------------------------------
  // CONFIRMATION MODAL
  // ------------------------------------------------------------------------

  const [pendingOverride, setPendingOverride] =
    useState<{
      type: 'feeding' | 'sanitation';
      nextValue: boolean;
    } | null>(null);

  const [confirmSubmitting, setConfirmSubmitting] =
    useState(false);

  const [confirmError, setConfirmError] =
    useState<string | null>(null);


  // ------------------------------------------------------------------------
  // MANUAL FEEDING DETAILS FORM (NEW - Phase 1: frontend only)
  //
  // Pressing the Feeding toggle no longer triggers manual_feeding=1
  // directly. It now opens this form first. Confirm Feeding only stores
  // the selected values locally — no request is sent to the backend yet.
  // ------------------------------------------------------------------------

  const [feedingDetailsVisible, setFeedingDetailsVisible] =
    useState(false);

  const [feedTypeSelected, setFeedTypeSelected] =
    useState<string | null>(null);

  const [feedTypePickerVisible, setFeedTypePickerVisible] =
    useState(false);

  const [feedAmountKg, setFeedAmountKg] =
    useState('');

  const [feedingFormError, setFeedingFormError] =
    useState<string | null>(null);

  // Values captured when the farmer presses "Confirm Feeding".
  // Phase 2 (backend) will use this to create the feeding log and trigger
  // the existing manual feeding mechanism.
  const [preparedManualFeeding, setPreparedManualFeeding] =
    useState<{
      pen_id: number;
      device_code: string;
      pig_count: number | null;
      feed_type: string;
      feed_amount_kg: number;
    } | null>(null);

  // Dedicated loading flag for the Manual Feeding Details "Confirm Feeding"
  // request ONLY. Does not reuse/affect confirmSubmitting (sanitation /
  // generic override confirm modal).
  const [feedingDetailsSubmitting, setFeedingDetailsSubmitting] =
    useState(false);


  // ------------------------------------------------------------------------
  // MANUAL SANITATION DETAILS FORM (NEW)
  //
  // Pressing the Sanitation toggle (OFF -> ON) no longer opens the generic
  // "Confirm Manual Override" modal. It now opens this form first, which
  // calls manual_sanitation.php directly on Confirm Sanitation.
  // ------------------------------------------------------------------------

  const [sanitationDetailsVisible, setSanitationDetailsVisible] =
    useState(false);

  const [sanitationDurationSeconds, setSanitationDurationSeconds] =
    useState('');

  const [sanitationFormError, setSanitationFormError] =
    useState<string | null>(null);

  // Dedicated loading flag for the Manual Sanitation Details
  // "Confirm Sanitation" request ONLY.
  const [sanitationDetailsSubmitting, setSanitationDetailsSubmitting] =
    useState(false);


  // ------------------------------------------------------------------------
  // CYCLE-IN-PROGRESS MODAL
  // ------------------------------------------------------------------------

  const [showCycleInProgress, setShowCycleInProgress] =
    useState(false);

  const [cycleInProgressType, setCycleInProgressType] =
    useState<'feeding' | 'sanitation' | null>(null);


  // ------------------------------------------------------------------------
  // KEEP SELECTED PIG PEN VALID
  // ------------------------------------------------------------------------

  useEffect(() => {
    setSelectedPenId((prev) => {
      if (
        prev !== null &&
        pigPens.some(
          (pen) => pen.pen_id === prev
        )
      ) {
        return prev;
      }

      return null;
    });
  }, [pigPens]);


  const selectedPen =
    pigPens.find(
      (pen) => pen.pen_id === selectedPenId
    ) ?? null;


  // ------------------------------------------------------------------------
  // RESET LOCAL OVERRIDE STATE WHEN CHANGING PIG PEN
  // ------------------------------------------------------------------------

  useEffect(() => {

    setFeedingOverride(false);
    setSanitationOverride(false);

    feedingOverrideRef.current = false;
    sanitationOverrideRef.current = false;

    setConfirmError(null);

    setPendingOverride(null);

    setShowCycleInProgress(false);
    setCycleInProgressType(null);

    // Reset the Manual Feeding Details form (NEW - Phase 1).
    setFeedingDetailsVisible(false);
    setFeedTypeSelected(null);
    setFeedTypePickerVisible(false);
    setFeedAmountKg('');
    setFeedingFormError(null);
    setFeedingDetailsSubmitting(false);

    // Reset the Manual Sanitation Details form (NEW).
    setSanitationDetailsVisible(false);
    setSanitationDurationSeconds('');
    setSanitationFormError(null);
    setSanitationDetailsSubmitting(false);

  }, [selectedPenId]);


  // ------------------------------------------------------------------------
  // LOADING REFS
  // ------------------------------------------------------------------------

  const feedingLoadingRef =
    useRef(feedingLoading);

  const sanitationLoadingRef =
    useRef(sanitationLoading);


  useEffect(() => {
    feedingLoadingRef.current =
      feedingLoading;
  }, [feedingLoading]);


  useEffect(() => {
    sanitationLoadingRef.current =
      sanitationLoading;
  }, [sanitationLoading]);


  // ------------------------------------------------------------------------
  // COMPONENT MOUNT / UNMOUNT GUARD
  // ------------------------------------------------------------------------

  const isMountedRef =
    useRef(true);


  useEffect(() => {

    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };

  }, []);


  // ------------------------------------------------------------------------
  // POLLING GUARD
  // ------------------------------------------------------------------------

  const isFetchingStatusRef =
    useRef(false);


  // ------------------------------------------------------------------------
  // UPDATE CONCURRENCY GUARDS
  // ------------------------------------------------------------------------

  const feedingUpdateInProgressRef =
    useRef(false);

  const sanitationUpdateInProgressRef =
    useRef(false);

  const activeUpdateCountRef =
    useRef(0);


  // ------------------------------------------------------------------------
  // SYNCHRONOUS OVERRIDE REFS
  // ------------------------------------------------------------------------

  const feedingOverrideRef =
    useRef(feedingOverride);

  const sanitationOverrideRef =
    useRef(sanitationOverride);


  // ------------------------------------------------------------------------
  // FETCH MANUAL OVERRIDE STATUS
  // ------------------------------------------------------------------------

  const loadManualOverrideStatus =
    useCallback(async () => {

      console.log(
        'GET URL:',
        GET_MANUAL_OVERRIDE_ENDPOINT
      );

      console.log(
        'UPDATE URL:',
        UPDATE_MANUAL_OVERRIDE_ENDPOINT
      );

      console.log(
        'Selected Pen:',
        selectedPen
      );

      console.log(
        'Device Code:',
        selectedPen?.device_code
      );


      if (
        !selectedPen ||
        !selectedPen.device_code
      ) {

        console.log(
          'loadManualOverrideStatus: no selected pen / device_code yet, skipping.'
        );

        return;
      }


      // Don't poll while an update request is running.
      if (
        activeUpdateCountRef.current > 0
      ) {

        console.log(
          '[poll] skipped — a manual update is in progress',
          {
            activeUpdates:
              activeUpdateCountRef.current,
          }
        );

        return;
      }


      // Prevent overlapping GET requests.
      if (
        isFetchingStatusRef.current
      ) {

        console.log(
          'loadManualOverrideStatus: previous request still in flight, skipping this tick.'
        );

        return;
      }


      isFetchingStatusRef.current = true;


      try {

        const deviceCode =
          selectedPen.device_code;


        const requestUrl =
          `${GET_MANUAL_OVERRIDE_ENDPOINT}?device_code=${encodeURIComponent(
            deviceCode
          )}`;


        const response =
          await fetch(
            requestUrl,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                device_code:
                  deviceCode,
              }),
            }
          );


        console.log(
          'HTTP Status:',
          response.status
        );


        const raw =
          await response.text();


        console.log(
          'Raw Response:',
          raw
        );


        let data: any = null;


        try {

          data =
            raw
              ? JSON.parse(raw)
              : null;

        } catch (parseError) {

          console.error(
            '[poll] response was not valid JSON',
            {
              source: 'poll',
              endpoint:
                requestUrl,
              status:
                response.status,
              raw,
              parseError,
            }
          );

        }


        if (
          !response.ok ||
          !data?.success
        ) {

          throw new Error(
            data?.message ||
            'Failed to load manual override status.'
          );

        }


        if (
          !isMountedRef.current
        ) {
          return;
        }


        // ----------------------------------------------------------------
        // IMPORTANT:
        //
        // The Pico resets the backend flag to 0 ONLY AFTER the physical
        // cycle has completed.
        //
        // Therefore, when the backend is still 1, the toggle remains ON.
        // ----------------------------------------------------------------

        if (
          !feedingLoadingRef.current
        ) {

          const confirmedFeeding =
            Boolean(
              data.manual_feeding
            );

          setFeedingOverride(
            confirmedFeeding
          );

          feedingOverrideRef.current =
            confirmedFeeding;
        }


        if (
          !sanitationLoadingRef.current
        ) {

          const confirmedSanitation =
            Boolean(
              data.manual_sanitation
            );

          setSanitationOverride(
            confirmedSanitation
          );

          sanitationOverrideRef.current =
            confirmedSanitation;
        }


      } catch (error) {

        // Keep the current UI state.
        // A failed poll must NOT suddenly turn the toggle OFF.

        console.error(
          '[poll] failed to load manual override status',
          {
            source: 'poll',
            endpoint:
              GET_MANUAL_OVERRIDE_ENDPOINT,
            device_code:
              selectedPen?.device_code,
            error,
          }
        );

      } finally {

        isFetchingStatusRef.current =
          false;

      }

    }, [selectedPen?.device_code]);


  // ------------------------------------------------------------------------
  // INITIAL LOAD + 5-SECOND POLLING
  // ------------------------------------------------------------------------

  useEffect(() => {

    if (!selectedPen) {
      return;
    }


    loadManualOverrideStatus();


    const intervalId =
      setInterval(() => {

        loadManualOverrideStatus();

      }, 5000);


    return () =>
      clearInterval(intervalId);

  }, [
    selectedPen?.device_code,
    loadManualOverrideStatus,
  ]);


  // ------------------------------------------------------------------------
  // UI DISABLED CONDITIONS
  // ------------------------------------------------------------------------

  const noPigPensAvailable =
    !loadingPigPens &&
    pigPens.length === 0;


  const controlsDisabled =
    loadingPigPens ||
    noPigPensAvailable ||
    !selectedPen;


  // ------------------------------------------------------------------------
  // MANUAL OVERRIDE UPDATE
  // ------------------------------------------------------------------------

  const handleManualOverride =
    async (
      type:
        | 'feeding'
        | 'sanitation',
      nextValue: boolean
    ): Promise<{
      success: boolean;
      message?: string;
    }> => {

      if (!selectedPen) {

        setShowNoPenWarning(true);

        return {
          success: false,
          message:
            'Please choose a Pig Pen first.',
        };

      }


      setShowNoPenWarning(false);


      // --------------------------------------------------------------------
      // DEFENSE AGAINST DUPLICATE REQUEST
      // --------------------------------------------------------------------

      const inProgressRef =
        type === 'feeding'
          ? feedingUpdateInProgressRef
          : sanitationUpdateInProgressRef;


      if (
        inProgressRef.current
      ) {

        console.log(
          `[manual-update] ${type} update already in progress, ignoring duplicate press.`
        );

        return {
          success: false,
          message:
            'An update is already in progress.',
        };

      }


      inProgressRef.current =
        true;

      activeUpdateCountRef.current +=
        1;


      const deviceCode =
        selectedPen.device_code;


      const previousValue =
        type === 'feeding'
          ? feedingOverride
          : sanitationOverride;


      // --------------------------------------------------------------------
      // OPTIMISTIC UI UPDATE
      // --------------------------------------------------------------------

      if (
        type === 'feeding'
      ) {

        setFeedingOverride(
          nextValue
        );

        feedingOverrideRef.current =
          nextValue;

        setFeedingLoading(true);

      } else {

        setSanitationOverride(
          nextValue
        );

        sanitationOverrideRef.current =
          nextValue;

        setSanitationLoading(true);

      }


      try {

        // ------------------------------------------------------------------
        // BACKEND PAYLOAD
        // ------------------------------------------------------------------

        const payload = {

          device_code:
            deviceCode,

          manual_feeding:
            Number(
              type === 'feeding'
                ? nextValue
                : feedingOverrideRef.current
            ),

          manual_sanitation:
            Number(
              type === 'sanitation'
                ? nextValue
                : sanitationOverrideRef.current
            ),

        };


        const response =
          await fetch(
            UPDATE_MANUAL_OVERRIDE_ENDPOINT,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        console.log(
          `HTTP Status (${type} update):`,
          response.status
        );


        const raw =
          await response.text();


        console.log(
          `Raw Response (${type} update):`,
          raw
        );


        let data: any = null;


        try {

          data =
            raw
              ? JSON.parse(raw)
              : null;

        } catch (parseError) {

          console.error(
            '[manual-update] response was not valid JSON',
            {
              source:
                'manual-update',
              type,
              endpoint:
                UPDATE_MANUAL_OVERRIDE_ENDPOINT,
              status:
                response.status,
              raw,
              parseError,
            }
          );

        }


        if (
          !response.ok ||
          !data?.success
        ) {

          throw new Error(
            data?.message ||
            'Failed to update manual override.'
          );

        }


        // ------------------------------------------------------------------
        // SUCCESS
        // ------------------------------------------------------------------

        onOverrideChange?.(
          type,
          nextValue
        );


        return {
          success: true,
        };


      } catch (error) {

        console.error(
          '[manual-update] failed',
          {
            source:
              'manual-update',
            type,
            endpoint:
              UPDATE_MANUAL_OVERRIDE_ENDPOINT,
            device_code:
              deviceCode,
            attemptedValue:
              nextValue,
            error,
          }
        );


        // Restore previous UI state.
        if (
          type === 'feeding'
        ) {

          setFeedingOverride(
            previousValue
          );

          feedingOverrideRef.current =
            previousValue;

        } else {

          setSanitationOverride(
            previousValue
          );

          sanitationOverrideRef.current =
            previousValue;

        }


        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to update manual override.',
        };


      } finally {

        if (
          type === 'feeding'
        ) {

          setFeedingLoading(
            false
          );

        } else {

          setSanitationLoading(
            false
          );

        }


        inProgressRef.current =
          false;


        activeUpdateCountRef.current =
          Math.max(
            0,
            activeUpdateCountRef.current - 1
          );

      }

    };


  // ------------------------------------------------------------------------
  // TOGGLE PRESS HANDLERS
  // ------------------------------------------------------------------------

  const handleFeedingTogglePress =
    () => {

      // --------------------------------------------------------------
      // IMPORTANT:
      //
      // If feeding is already ON, the user is trying to turn it OFF.
      //
      // DO NOT send an OFF command.
      //
      // Instead, explain that the cycle must finish.
      // --------------------------------------------------------------

      if (
        feedingOverride
      ) {

        setCycleInProgressType(
          'feeding'
        );

        setShowCycleInProgress(
          true
        );

        return;
      }


      // --------------------------------------------------------------
      // NEW (Phase 1): Instead of immediately arming a manual_feeding=1
      // trigger, open the Manual Feeding Details form. The existing
      // manual_feeding trigger flow itself is untouched — it will be
      // wired up to this form's "Confirm Feeding" button in Phase 2.
      // --------------------------------------------------------------

      setFeedTypeSelected(null);
      setFeedAmountKg('');
      setFeedingFormError(null);
      setFeedingDetailsVisible(true);

    };


  const handleSanitationTogglePress =
    () => {

      // --------------------------------------------------------------
      // Same behavior for sanitation.
      //
      // Once ON, it cannot be force-stopped.
      // --------------------------------------------------------------

      if (
        sanitationOverride
      ) {

        setCycleInProgressType(
          'sanitation'
        );

        setShowCycleInProgress(
          true
        );

        return;
      }


      // --------------------------------------------------------------
      // NEW: Instead of opening the old generic "Confirm Manual
      // Override" modal, open the Manual Sanitation Details form.
      // Confirm Sanitation (below) calls manual_sanitation.php
      // directly — the generic handleManualOverride() path is no
      // longer used to start a new manual sanitation cycle.
      // --------------------------------------------------------------

      setSanitationDurationSeconds('');
      setSanitationFormError(null);
      setSanitationDetailsVisible(true);

    };


  // ------------------------------------------------------------------------
  // MANUAL FEEDING DETAILS FORM HANDLERS (NEW - Phase 1: frontend only)
  // ------------------------------------------------------------------------

  const closeFeedingDetailsForm = () => {

    setFeedingDetailsVisible(false);
    setFeedTypePickerVisible(false);
    setFeedTypeSelected(null);
    setFeedAmountKg('');
    setFeedingFormError(null);

  };


  const handleConfirmFeedingDetails = async () => {

    if (feedingDetailsSubmitting) {
      // Prevent duplicate submissions.
      return;
    }

    if (!selectedPen) {
      setFeedingFormError('Please choose a Pig Pen first.');
      return;
    }

    if (!feedTypeSelected) {
      setFeedingFormError('Please select a Feed Type.');
      return;
    }

    const trimmedAmount = feedAmountKg.trim();

    if (!trimmedAmount) {
      setFeedingFormError('Please enter the Feed Amount.');
      return;
    }

    const parsedAmount = Number(trimmedAmount);

    if (!Number.isFinite(parsedAmount)) {
      setFeedingFormError('Feed Amount must be a valid number.');
      return;
    }

    if (parsedAmount <= 0) {
      setFeedingFormError('Feed Amount must be greater than 0.');
      return;
    }

    // ----------------------------------------------------------------
    // IMPORTANT:
    //
    // The farmer enters the FEED AMOUNT PER PIG.
    //
    // The backend manual_feeding.php will multiply this value by
    // the selected Pig Pen's pig_count to calculate the TOTAL feed
    // required for this manual feeding execution.
    // ----------------------------------------------------------------

    const preparedPayload = {
      pen_id: selectedPen.pen_id,
      device_code: selectedPen.device_code,
      pig_count:
        selectedPen.pig_count ?? null,
      feed_type: feedTypeSelected,
      feed_amount_kg: parsedAmount,
    };

    setPreparedManualFeeding(preparedPayload);
    setFeedingFormError(null);
    setFeedingDetailsSubmitting(true);

    try {

      // ------------------------------------------------------------------
      // BACKEND PAYLOAD
      //
      // manual_feeding.php resolves device_code and pig_count from
      // pen_id itself.
      //
      // IMPORTANT:
      // feed_amount_per_pig is the amount entered by the farmer PER PIG.
      // The backend calculates:
      //
      // total_feed_required =
      //     pig_count * feed_amount_per_pig
      //
      // and then calculates the feeding duration using the current
      // temporary calibration:
      //
      // 3 seconds = 3 kg
      // 1 second = 1 kg
      // ------------------------------------------------------------------

      const backendPayload = {
        pen_id: selectedPen.pen_id,
        feed_type: feedTypeSelected,
        feed_amount_per_pig: parsedAmount,
      };

      const response =
        await fetch(
          MANUAL_FEEDING_ENDPOINT,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify(
                backendPayload
              ),
          }
        );

      console.log(
        'HTTP Status (manual feeding):',
        response.status
      );

      const raw =
        await response.text();

      console.log(
        'Raw Response (manual feeding):',
        raw
      );

      let data: any = null;

      try {

        data =
          raw
            ? JSON.parse(raw)
            : null;

      } catch (parseError) {

        console.error(
          '[manual-feeding] response was not valid JSON',
          {
            source: 'manual-feeding',
            endpoint: MANUAL_FEEDING_ENDPOINT,
            status: response.status,
            raw,
            parseError,
          }
        );

      }

      if (
        !response.ok ||
        !data?.success
      ) {

        throw new Error(
          data?.message ||
          'Failed to start manual feeding.'
        );

      }

      // ------------------------------------------------------------------
      // SUCCESS
      //
      // manual_feeding.php has already created the feeding_schedule_logs
      // row and set manual_override.manual_feeding = 1. Do NOT call
      // update_manual_override.php or reset_manual_override.php here —
      // the existing Pico polling / feed_cycle() / reset flow owns
      // everything from this point onward.
      // ------------------------------------------------------------------

      setFeedingOverride(true);
      feedingOverrideRef.current = true;

      onOverrideChange?.(
        'feeding',
        true
      );

      setFeedingDetailsSubmitting(false);

      closeFeedingDetailsForm();

    } catch (error: any) {

      console.error(
        '[manual-feeding] failed',
        {
          source: 'manual-feeding',
          endpoint: MANUAL_FEEDING_ENDPOINT,
          pen_id: selectedPen.pen_id,
          feed_type: feedTypeSelected,
          feed_amount_per_pig: parsedAmount,
          error,
        }
      );

      setFeedingDetailsSubmitting(false);

      // Keep the modal open with the entered values so the farmer can
      // correct/retry, per the failure requirements.
      setFeedingFormError(
        error?.message ||
        'Failed to start manual feeding. Please try again.'
      );

    }

  };


  // ------------------------------------------------------------------------
  // MANUAL SANITATION DETAILS FORM HANDLERS (NEW)
  // ------------------------------------------------------------------------

  const closeSanitationDetailsForm = () => {

    setSanitationDetailsVisible(false);
    setSanitationDurationSeconds('');
    setSanitationFormError(null);

  };


  const handleConfirmSanitationDetails = async () => {

    if (sanitationDetailsSubmitting) {
      // Prevent duplicate submissions.
      return;
    }

    if (!selectedPen) {
      setSanitationFormError('Please choose a Pig Pen first.');
      return;
    }

    const trimmedDuration = sanitationDurationSeconds.trim();

    if (!trimmedDuration) {
      setSanitationFormError('Please enter the Duration.');
      return;
    }

    const parsedDuration = Number(trimmedDuration);

    if (
      !Number.isFinite(parsedDuration) ||
      !Number.isInteger(parsedDuration)
    ) {
      setSanitationFormError('Duration must be a whole number of seconds.');
      return;
    }

    if (parsedDuration <= 0) {
      setSanitationFormError('Duration must be greater than 0.');
      return;
    }

    setSanitationFormError(null);
    setSanitationDetailsSubmitting(true);

    try {

      // ------------------------------------------------------------------
      // BACKEND PAYLOAD
      //
      // manual_sanitation.php resolves device_code from pen_id itself and
      // creates the sanitation_schedule_logs row, so pig_count and
      // device_code are intentionally NOT sent here.
      // ------------------------------------------------------------------

      const backendPayload = {
        pen_id: selectedPen.pen_id,
        duration_seconds: parsedDuration,
      };

      const response =
        await fetch(
          MANUAL_SANITATION_ENDPOINT,
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body:
              JSON.stringify(
                backendPayload
              ),
          }
        );

      console.log(
        'HTTP Status (manual sanitation):',
        response.status
      );

      const raw =
        await response.text();

      console.log(
        'Raw Response (manual sanitation):',
        raw
      );

      let data: any = null;

      try {

        data =
          raw
            ? JSON.parse(raw)
            : null;

      } catch (parseError) {

        console.error(
          '[manual-sanitation] response was not valid JSON',
          {
            source: 'manual-sanitation',
            endpoint: MANUAL_SANITATION_ENDPOINT,
            status: response.status,
            raw,
            parseError,
          }
        );

      }

      if (
        !response.ok ||
        !data?.success
      ) {

        throw new Error(
          data?.message ||
          'Failed to start manual sanitation.'
        );

      }

      // ------------------------------------------------------------------
      // SUCCESS
      //
      // manual_sanitation.php has already created the
      // sanitation_schedule_logs row (execution_type = "manual") and set
      // manual_override.manual_sanitation = 1. Do NOT call
      // update_manual_override.php or reset_manual_override.php here —
      // the existing Pico polling / sanitation cycle / reset flow owns
      // everything from this point onward.
      // ------------------------------------------------------------------

      setSanitationOverride(true);
      sanitationOverrideRef.current = true;

      onOverrideChange?.(
        'sanitation',
        true
      );

      setSanitationDetailsSubmitting(false);

      closeSanitationDetailsForm();

    } catch (error: any) {

      console.error(
        '[manual-sanitation] failed',
        {
          source: 'manual-sanitation',
          endpoint: MANUAL_SANITATION_ENDPOINT,
          pen_id: selectedPen.pen_id,
          duration_seconds: parsedDuration,
          error,
        }
      );

      setSanitationDetailsSubmitting(false);

      // Keep the modal open with the entered value so the farmer can
      // correct/retry, per the failure requirements.
      setSanitationFormError(
        error?.message ||
        'Failed to start manual sanitation. Please try again.'
      );

    }

  };


  // ------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------

  return (
    <View style={styles.overrideSection}>

      <View style={styles.overrideTitleRow}>
        <Ionicons name="options-outline" size={18} color="#2F5D50" />
        <Text style={styles.overrideTitle}>
          Manual Override Control
        </Text>
      </View>


      {/* ================================================================
          TARGET PIG PEN PICKER
          ================================================================ */}

      <View style={styles.penPickerBlock}>

        <View style={styles.penPickerLabelRow}>

          <Ionicons name="grid-outline" size={14} color="#2F5D50" />

          <Text style={styles.penPickerLabel}>
            Target Pig Pen
          </Text>

        </View>


        {loadingPigPens ? (

          <View style={styles.penPickerLoadingRow}>

            <ActivityIndicator
              size="small"
              color="#2F5D50"
            />

            <Text style={styles.penPickerLoadingText}>
              Loading Pig Pens...
            </Text>

          </View>

        ) : noPigPensAvailable ? (

          <View style={styles.penPickerEmptyBox}>

            <Ionicons
              name="alert-circle-outline"
              size={15}
              color="#C97A00"
            />

            <Text style={styles.penPickerEmptyText}>
              No Pig Pens Available
            </Text>

          </View>

        ) : (

          <>

            <TouchableOpacity
              style={styles.penPickerButton}
              activeOpacity={0.8}
              onPress={() =>
                setPickerVisible(true)
              }
            >

              <Text
                style={
                  styles.penPickerButtonText
                }
                numberOfLines={1}
              >
                {selectedPen
                  ? selectedPen.pen_name
                  : 'Select Pig Pen'}
              </Text>

              <Ionicons
                name="chevron-down"
                size={17}
                color="#2F5D50"
              />

            </TouchableOpacity>


            <Text style={styles.deviceCodeLabel}>
              Device Code
            </Text>

            <Text style={styles.deviceCodeValue}>
              {selectedPen
                ? selectedPen.device_code
                : '—'}
            </Text>

          </>

        )}


        {showNoPenWarning && (

          <View style={styles.warningRow}>

            <Ionicons
              name="information-circle-outline"
              size={14}
              color="#C62828"
            />

            <Text style={styles.warningText}>
              Please choose a Pig Pen before
              using manual override.
            </Text>

          </View>

        )}

      </View>


      <View
        style={styles.overrideRowDivider}
      />


      {/* ================================================================
          FEEDING
          ================================================================ */}

      <View
        style={[
          styles.overrideRow,
          controlsDisabled &&
            styles.overrideRowDisabled,
        ]}
      >

        <View
          style={styles.overrideRowLeft}
        >

          <View
            style={[
              styles.overrideDot,
              feedingOverride &&
                styles.overrideDotActive,
            ]}
          />

          <Ionicons
            name="restaurant-outline"
            size={16}
            color="#2F5D50"
          />

          <Text
            style={styles.overrideRowLabel}
          >
            Feeding
          </Text>

        </View>


        <TouchableOpacity
          activeOpacity={0.8}
          disabled={
            feedingLoading ||
            controlsDisabled
          }
          style={[
            styles.toggleTrack,
            feedingOverride &&
              styles.toggleTrackActive,
            (feedingLoading ||
              controlsDisabled) &&
              styles.toggleTrackDisabled,
          ]}
          onPress={
            handleFeedingTogglePress
          }
        >

          {feedingLoading ? (

            <ActivityIndicator
              size="small"
              color="#2F5D50"
              style={[
                styles.toggleThumb,
                feedingOverride &&
                  styles.toggleThumbActive,
              ]}
            />

          ) : (

            <View
              style={[
                styles.toggleThumb,
                feedingOverride &&
                  styles.toggleThumbActive,
              ]}
            />

          )}

        </TouchableOpacity>

      </View>


      <View
        style={styles.overrideRowDivider}
      />


      {/* ================================================================
          SANITATION
          ================================================================ */}

      <View
        style={[
          styles.overrideRow,
          controlsDisabled &&
            styles.overrideRowDisabled,
        ]}
      >

        <View
          style={styles.overrideRowLeft}
        >

          <View
            style={[
              styles.overrideDot,
              sanitationOverride &&
                styles.overrideDotActive,
            ]}
          />

          <Ionicons
            name="water-outline"
            size={16}
            color="#2F5D50"
          />

          <Text
            style={styles.overrideRowLabel}
          >
            Sanitation
          </Text>

        </View>


        <TouchableOpacity
          activeOpacity={0.8}
          disabled={
            sanitationLoading ||
            controlsDisabled
          }
          style={[
            styles.toggleTrack,
            sanitationOverride &&
              styles.toggleTrackActive,
            (sanitationLoading ||
              controlsDisabled) &&
              styles.toggleTrackDisabled,
          ]}
          onPress={
            handleSanitationTogglePress
          }
        >

          {sanitationLoading ? (

            <ActivityIndicator
              size="small"
              color="#2F5D50"
              style={[
                styles.toggleThumb,
                sanitationOverride &&
                  styles.toggleThumbActive,
              ]}
            />

          ) : (

            <View
              style={[
                styles.toggleThumb,
                sanitationOverride &&
                  styles.toggleThumbActive,
              ]}
            />

          )}

        </TouchableOpacity>

      </View>


      {/* ================================================================
          PIG PEN PICKER MODAL
          ================================================================ */}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setPickerVisible(false)
        }
      >

        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() =>
            setPickerVisible(false)
          }
        >

          <View
            style={pickerStyles.sheet}
          >

            <Text
              style={pickerStyles.sheetTitle}
            >
              Select Pig Pen
            </Text>


            {pigPens.map((pen) => {

              const isActive =
                pen.pen_id ===
                selectedPenId;


              return (

                <TouchableOpacity
                  key={pen.pen_id}
                  style={[
                    pickerStyles.option,
                    isActive &&
                      pickerStyles.optionActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {

                    setSelectedPenId(
                      pen.pen_id
                    );

                    setShowNoPenWarning(
                      false
                    );

                    setPickerVisible(
                      false
                    );

                  }}
                >

                  <View
                    style={
                      pickerStyles.optionTextBlock
                    }
                  >

                    <Text
                      style={[
                        pickerStyles.optionLabel,
                        isActive &&
                          pickerStyles.optionLabelActive,
                      ]}
                    >
                      {pen.pen_name}
                    </Text>


                    <Text
                      style={
                        pickerStyles.optionDeviceCode
                      }
                    >
                      {pen.device_code}
                    </Text>

                  </View>


                  {isActive && (

                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2F5D50"
                    />

                  )}

                </TouchableOpacity>

              );

            })}

          </View>

        </TouchableOpacity>

      </Modal>


      {/* ================================================================
          CONFIRM MANUAL OVERRIDE MODAL
          ================================================================ */}

      <Modal
        visible={
          pendingOverride !== null
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {

          if (
            !confirmSubmitting
          ) {

            setPendingOverride(
              null
            );

            setConfirmError(
              null
            );

          }

        }}
      >

        <TouchableOpacity
          style={confirmStyles.overlay}
          activeOpacity={1}
          onPress={() => {

            if (
              !confirmSubmitting
            ) {

              setPendingOverride(
                null
              );

              setConfirmError(
                null
              );

            }

          }}
        >

          <TouchableOpacity
            activeOpacity={1}
            style={
              confirmStyles.container
            }
          >

            <Text
              style={confirmStyles.title}
            >
              {pendingOverride?.type ===
              'feeding'
                ? 'Confirm Manual Feeding'
                : 'Confirm Manual Sanitation'}
            </Text>


            <Text
              style={confirmStyles.message}
            >
              {pendingOverride?.type ===
              'feeding'
                ? 'Are you sure you want to manually activate the feeding system for the selected Pig Pen?\n\nThis action will immediately send the command to the Raspberry Pi.'
                : 'Are you sure you want to manually activate the sanitation system for the selected Pig Pen?\n\nThis action will immediately send the command to the Raspberry Pi.'}
            </Text>


            {confirmError && (

              <Text
                style={
                  confirmStyles.errorText
                }
              >
                {confirmError}
              </Text>

            )}


            <View
              style={confirmStyles.buttonRow}
            >

              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.cancelButton,
                ]}
                activeOpacity={0.8}
                disabled={
                  confirmSubmitting
                }
                onPress={() => {

                  setPendingOverride(
                    null
                  );

                  setConfirmError(
                    null
                  );

                }}
              >

                <Text
                  style={
                    confirmStyles.cancelButtonText
                  }
                >
                  Cancel
                </Text>

              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.confirmButton,
                ]}
                activeOpacity={0.8}
                disabled={
                  confirmSubmitting
                }
                onPress={async () => {

                  if (
                    !pendingOverride ||
                    confirmSubmitting
                  ) {
                    return;
                  }


                  const {
                    type,
                    nextValue,
                  } =
                    pendingOverride;


                  setConfirmError(
                    null
                  );

                  setConfirmSubmitting(
                    true
                  );


                  const result =
                    await handleManualOverride(
                      type,
                      nextValue
                    );


                  setConfirmSubmitting(
                    false
                  );


                  if (
                    result.success
                  ) {

                    setPendingOverride(
                      null
                    );

                  } else {

                    setConfirmError(
                      result.message ||
                      'Failed to update manual override.'
                    );

                  }

                }}
              >

                {confirmSubmitting ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Text
                    style={
                      confirmStyles.confirmButtonText
                    }
                  >
                    Confirm
                  </Text>

                )}

              </TouchableOpacity>

            </View>

          </TouchableOpacity>

        </TouchableOpacity>

      </Modal>


      {/* ================================================================
          CYCLE IN PROGRESS MODAL
          ================================================================ */}

      <Modal
        visible={
          showCycleInProgress
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setShowCycleInProgress(false)
        }
      >

        <TouchableOpacity
          style={confirmStyles.overlay}
          activeOpacity={1}
          onPress={() =>
            setShowCycleInProgress(
              false
            )
          }
        >

          <TouchableOpacity
            activeOpacity={1}
            style={
              confirmStyles.container
            }
          >

            <Text
              style={
                confirmStyles.title
              }
            >
              {cycleInProgressType ===
              'feeding'
                ? 'Feeding Cycle in Progress'
                : 'Sanitation Cycle in Progress'}
            </Text>


            <Text
              style={
                confirmStyles.message
              }
            >
              {cycleInProgressType ===
              'feeding'
                ? 'This feeding cycle cannot be stopped while it is ongoing. Please wait until the cycle is completed.'
                : 'This sanitation cycle cannot be stopped while it is ongoing. Please wait until the cycle is completed.'}
            </Text>


            <TouchableOpacity
              style={[
                confirmStyles.button,
                confirmStyles.confirmButton,
              ]}
              activeOpacity={0.8}
              onPress={() => {

                setShowCycleInProgress(
                  false
                );

                setCycleInProgressType(
                  null
                );

              }}
            >

              <Text
                style={
                  confirmStyles.confirmButtonText
                }
              >
                OK
              </Text>

            </TouchableOpacity>

          </TouchableOpacity>

        </TouchableOpacity>

      </Modal>


      {/* ================================================================
          MANUAL FEEDING DETAILS MODAL (NEW - Phase 1: frontend only)
          ================================================================ */}

      <Modal
        visible={feedingDetailsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeFeedingDetailsForm}
      >

        <TouchableOpacity
          style={confirmStyles.overlay}
          activeOpacity={1}
          onPress={closeFeedingDetailsForm}
        >

          <TouchableOpacity
            activeOpacity={1}
            style={confirmStyles.container}
          >

            <Text style={confirmStyles.title}>
              Manual Feeding
            </Text>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Pig Pen
              </Text>
              <Text style={feedFormStyles.fieldValue}>
                {selectedPen
                  ? selectedPen.pen_name
                  : '—'}
              </Text>
            </View>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Total Pigs
              </Text>
              <Text style={feedFormStyles.fieldValue}>
                {selectedPen &&
                selectedPen.pig_count !== null &&
                selectedPen.pig_count !== undefined
                  ? `${selectedPen.pig_count} pigs`
                  : '—'}
              </Text>
            </View>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Feed Type
              </Text>

              <TouchableOpacity
                style={styles.penPickerButton}
                activeOpacity={0.8}
                onPress={() =>
                  setFeedTypePickerVisible(true)
                }
              >
                <Text
                  style={styles.penPickerButtonText}
                  numberOfLines={1}
                >
                  {feedTypeSelected ?? 'Select Feed Type'}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={17}
                  color="#2F5D50"
                />
              </TouchableOpacity>
            </View>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Feed Amount Per Pig (kg)
              </Text>

              <TextInput
                style={feedFormStyles.input}
                value={feedAmountKg}
                onChangeText={setFeedAmountKg}
                placeholder="e.g. 5"
                placeholderTextColor="#A0B5AD"
                keyboardType="decimal-pad"
              />
            </View>


            {feedingFormError && (
              <Text style={confirmStyles.errorText}>
                {feedingFormError}
              </Text>
            )}


            <View style={confirmStyles.buttonRow}>

              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.cancelButton,
                ]}
                activeOpacity={0.8}
                onPress={closeFeedingDetailsForm}
              >
                <Text style={confirmStyles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.confirmButton,
                ]}
                activeOpacity={0.8}
                disabled={
                  feedingDetailsSubmitting
                }
                onPress={handleConfirmFeedingDetails}
              >
                {feedingDetailsSubmitting ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Text style={confirmStyles.confirmButtonText}>
                    Confirm Feeding
                  </Text>

                )}

              </TouchableOpacity>

            </View>

          </TouchableOpacity>

        </TouchableOpacity>

      </Modal>


      {/* ================================================================
          FEED TYPE PICKER MODAL (NEW - Phase 1: frontend only)
          ================================================================ */}

      <Modal
        visible={feedTypePickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setFeedTypePickerVisible(false)
        }
      >

        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() =>
            setFeedTypePickerVisible(false)
          }
        >

          <View style={pickerStyles.sheet}>

            <Text style={pickerStyles.sheetTitle}>
              Select Feed Type
            </Text>

            {FEED_TYPE_OPTIONS.map((option) => {

              const isActive =
                option === feedTypeSelected;

              return (

                <TouchableOpacity
                  key={option}
                  style={[
                    pickerStyles.option,
                    isActive &&
                      pickerStyles.optionActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setFeedTypeSelected(option);
                    setFeedTypePickerVisible(false);
                  }}
                >

                  <View style={pickerStyles.optionTextBlock}>
                    <Text
                      style={[
                        pickerStyles.optionLabel,
                        isActive &&
                          pickerStyles.optionLabelActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </View>

                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2F5D50"
                    />
                  )}

                </TouchableOpacity>

              );

            })}

          </View>

        </TouchableOpacity>

      </Modal>


      {/* ================================================================
          MANUAL SANITATION DETAILS MODAL (NEW)
          ================================================================ */}

      <Modal
        visible={sanitationDetailsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeSanitationDetailsForm}
      >

        <TouchableOpacity
          style={confirmStyles.overlay}
          activeOpacity={1}
          onPress={closeSanitationDetailsForm}
        >

          <TouchableOpacity
            activeOpacity={1}
            style={confirmStyles.container}
          >

            <Text style={confirmStyles.title}>
              Manual Sanitation
            </Text>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Pig Pen
              </Text>
              <Text style={feedFormStyles.fieldValue}>
                {selectedPen
                  ? selectedPen.pen_name
                  : '—'}
              </Text>
            </View>


            <View style={feedFormStyles.field}>
              <Text style={feedFormStyles.fieldLabel}>
                Duration (seconds)
              </Text>

              <TextInput
                style={feedFormStyles.input}
                value={sanitationDurationSeconds}
                onChangeText={setSanitationDurationSeconds}
                placeholder="e.g. 30"
                placeholderTextColor="#A0B5AD"
                keyboardType="number-pad"
              />
            </View>


            {sanitationFormError && (
              <Text style={confirmStyles.errorText}>
                {sanitationFormError}
              </Text>
            )}


            <View style={confirmStyles.buttonRow}>

              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.cancelButton,
                ]}
                activeOpacity={0.8}
                onPress={closeSanitationDetailsForm}
              >
                <Text style={confirmStyles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  confirmStyles.button,
                  confirmStyles.confirmButton,
                ]}
                activeOpacity={0.8}
                disabled={
                  sanitationDetailsSubmitting
                }
                onPress={handleConfirmSanitationDetails}
              >
                {sanitationDetailsSubmitting ? (

                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                ) : (

                  <Text style={confirmStyles.confirmButtonText}>
                    Confirm Sanitation
                  </Text>

                )}

              </TouchableOpacity>

            </View>

          </TouchableOpacity>

        </TouchableOpacity>

      </Modal>

    </View>
  );
};


// --------------------------------------------------------------------------
// MAIN STYLES
// --------------------------------------------------------------------------

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

  overrideTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  overrideTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A2D27',
    fontFamily: 'Arial',
  },

  // ------------------------------------------------------------------------
  // PIG PEN PICKER
  // ------------------------------------------------------------------------

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
    fontSize: 14,
    fontWeight: '700',
    color: '#5B6E67',
    fontFamily: 'Arial',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Arial',
    marginRight: 8,
  },

  penPickerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },

  penPickerLoadingText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#8A9994',
    fontFamily: 'Arial',
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
    fontSize: 14.5,
    fontWeight: '700',
    color: '#A9790B',
    fontFamily: 'Arial',
  },

  deviceCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0B5AD',
    fontFamily: 'Arial',
    marginTop: 2,
  },

  deviceCodeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Arial',
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
    fontSize: 13.5,
    fontWeight: '600',
    color: '#C62828',
    fontFamily: 'Arial',
    lineHeight: 18,
  },

  // ------------------------------------------------------------------------
  // OVERRIDE ROW
  // ------------------------------------------------------------------------

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
    gap: 9,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2D27',
    fontFamily: 'Arial',
  },

  // ------------------------------------------------------------------------
  // TOGGLE
  // ------------------------------------------------------------------------

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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  toggleThumbActive: {
    alignSelf: 'flex-end',
  },

});


// --------------------------------------------------------------------------
// PIG PEN PICKER MODAL STYLES
// --------------------------------------------------------------------------

const pickerStyles =
  StyleSheet.create({

    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(26, 45, 39, 0.4)',
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
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },

    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#1A2D27',
      fontFamily: 'Arial',
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
      fontSize: 15,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Arial',
    },

    optionLabelActive: {
      color: '#2F5D50',
    },

    optionDeviceCode: {
      fontSize: 13,
      fontWeight: '500',
      color: '#A0B5AD',
      fontFamily: 'Arial',
    },

  });


// --------------------------------------------------------------------------
// CONFIRMATION MODAL STYLES
// --------------------------------------------------------------------------

const confirmStyles =
  StyleSheet.create({

    overlay: {
      flex: 1,
      backgroundColor:
        'rgba(26, 45, 39, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },

    container: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 20,
      paddingHorizontal: 18,
      shadowColor: '#0F2D24',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },

    title: {
      fontSize: 17,
      fontWeight: '800',
      color: '#1A2D27',
      fontFamily: 'Arial',
      textAlign: 'center',
      marginBottom: 10,
    },

    message: {
      fontSize: 14.5,
      fontWeight: '500',
      color: '#5B6E67',
      fontFamily: 'Arial',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 18,
    },

    errorText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#C62828',
      fontFamily: 'Arial',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 14,
      marginTop: -8,
    },

    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },

    button: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cancelButton: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DCE6E2',
    },

    cancelButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#5B6E67',
      fontFamily: 'Arial',
    },

    confirmButton: {
      backgroundColor: '#2F5D50',
    },

    confirmButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: 'Arial',
    },

  });


// --------------------------------------------------------------------------
// MANUAL FEEDING DETAILS FORM STYLES (NEW - Phase 1: frontend only)
// --------------------------------------------------------------------------

const feedFormStyles =
  StyleSheet.create({

    field: {
      marginBottom: 12,
      gap: 6,
    },

    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: '#A0B5AD',
      fontFamily: 'Arial',
    },

    fieldValue: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Arial',
    },

    input: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DCE6E2',
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 15,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Arial',
    },

  });


export default ManualOverrideControls;