import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------------------------------

const API_BASE_URL =
  'https://oinkmate.online/oinkmate-api/api';

const GET_NOTIFICATIONS_ENDPOINT =
  `${API_BASE_URL}/notifications/get_notifications.php`;

const MARK_NOTIFICATION_READ_ENDPOINT =
  `${API_BASE_URL}/notifications/mark_notification_read.php`;

// --------------------------------------------------------------------------
// TYPES
// --------------------------------------------------------------------------

type FilterKey = 'all' | 'unread' | 'read';

type NotificationType =
  | 'feed'
  | 'temperature'
  | 'ammonia'
  | 'water'
  | 'sanitation'
  | 'schedule'
  | 'system';

interface StoredUser {
  user_id?: number;
  farmer_id?: number;
  fullname?: string;
  email?: string;
  role?: string;
}

interface PigPen {
  pen_id: number;
  pen_name: string;
}

interface NotificationItem {
  notification_id: number;
  farmer_id: number;
  pen_id: number;
  pen_name: string;
  type: 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  updated_at?: string | null;
}

interface NotificationApiResponse {
  success: boolean;
  message?: string;
  pig_pens?: PigPen[];
  notifications?: NotificationItem[];
}

// --------------------------------------------------------------------------
// ICON HELPER
// --------------------------------------------------------------------------
//
// The database stores the notification severity in "type".
// The icon itself is selected from the notification title so that:
// - Feeding -> restaurant
// - Temperature -> thermometer
// - Ammonia -> cloud
// - Sanitation/Showering -> water/brush
// - Other -> information
// --------------------------------------------------------------------------

const getNotificationIcon = (
  title: string
): keyof typeof Ionicons.glyphMap => {

  const normalizedTitle =
    title.toLowerCase();

  if (
    normalizedTitle.includes('feed')
  ) {
    return 'restaurant-outline';
  }

  if (
    normalizedTitle.includes('temperature') ||
    normalizedTitle.includes('temp')
  ) {
    return 'thermometer-outline';
  }

  if (
    normalizedTitle.includes('ammonia')
  ) {
    return 'cloud-outline';
  }

  if (
    normalizedTitle.includes('sanitation') ||
    normalizedTitle.includes('clean')
  ) {
    return 'brush-outline';
  }

  if (
    normalizedTitle.includes('shower')
  ) {
    return 'water-outline';
  }

  if (
    normalizedTitle.includes('schedule')
  ) {
    return 'calendar-outline';
  }

  return 'information-circle-outline';
};

// --------------------------------------------------------------------------
// DATE HELPERS
// --------------------------------------------------------------------------

const parseNotificationDate = (
  value: string
): Date => {

  // MySQL DATETIME:
  // 2026-09-10 14:30:00
  //
  // Convert to a local-time-compatible ISO-like string.
  const normalized =
    value.includes('T')
      ? value
      : value.replace(' ', 'T');

  return new Date(normalized);
};


const getDateStart = (
  date: Date
): Date => {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};


const getGroupLabel = (
  dateValue: string
): 'Today' | 'Yesterday' | 'Earlier This Week' | 'Earlier' => {

  const date =
    parseNotificationDate(dateValue);

  const today =
    getDateStart(new Date());

  const notificationDay =
    getDateStart(date);

  const differenceInDays =
    Math.floor(
      (today.getTime() -
        notificationDay.getTime()) /
        (1000 * 60 * 60 * 24)
    );

  if (
    differenceInDays === 0
  ) {
    return 'Today';
  }

  if (
    differenceInDays === 1
  ) {
    return 'Yesterday';
  }

  // Determine whether it belongs to the current week.
  const currentDay =
    today.getDay();

  const daysSinceMonday =
    currentDay === 0
      ? 6
      : currentDay - 1;

  const weekStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() -
        daysSinceMonday
    );

  if (
    notificationDay.getTime() >=
    weekStart.getTime()
  ) {
    return 'Earlier This Week';
  }

  return 'Earlier';
};


const formatRelativeTime = (
  dateValue: string
): string => {

  const date =
    parseNotificationDate(dateValue);

  const now =
    new Date();

  const differenceMs =
    now.getTime() -
    date.getTime();

  const differenceSeconds =
    Math.floor(
      differenceMs / 1000
    );

  if (
    differenceSeconds < 60
  ) {
    return 'Just now';
  }

  const differenceMinutes =
    Math.floor(
      differenceSeconds / 60
    );

  if (
    differenceMinutes < 60
  ) {
    return `${differenceMinutes} min${
      differenceMinutes === 1
        ? ''
        : 's'
    } ago`;
  }

  const differenceHours =
    Math.floor(
      differenceMinutes / 60
    );

  if (
    differenceHours < 24
  ) {
    return `${differenceHours} hour${
      differenceHours === 1
        ? ''
        : 's'
    } ago`;
  }

  const differenceDays =
    Math.floor(
      differenceHours / 24
    );

  if (
    differenceDays === 1
  ) {
    return 'Yesterday';
  }

  if (
    differenceDays < 7
  ) {
    return `${differenceDays} days ago`;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
};

// --------------------------------------------------------------------------
// COMPONENT
// --------------------------------------------------------------------------

export default function Notifications() {

  const router =
    useRouter();

  const insets =
    useSafeAreaInsets();


  // ------------------------------------------------------------------------
  // USER
  // ------------------------------------------------------------------------

  const [user, setUser] =
    useState<StoredUser | null>(null);


  // ------------------------------------------------------------------------
  // NOTIFICATIONS
  // ------------------------------------------------------------------------

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [pigPens, setPigPens] =
    useState<PigPen[]>([]);


  // ------------------------------------------------------------------------
  // FILTERS
  // ------------------------------------------------------------------------

  const [filter, setFilter] =
    useState<FilterKey>('all');

  // null = All Pens
  const [selectedPenId, setSelectedPenId] =
    useState<number | null>(null);

  const [penPickerVisible, setPenPickerVisible] =
    useState(false);


  // ------------------------------------------------------------------------
  // LOADING / ERROR
  // ------------------------------------------------------------------------

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [markingReadId, setMarkingReadId] =
    useState<number | null>(null);


  // ------------------------------------------------------------------------
  // LOAD USER
  // ------------------------------------------------------------------------

  useEffect(() => {

    const loadUser =
      async () => {

        try {

          const stored =
            await AsyncStorage.getItem(
              'user'
            );

          if (!stored) {

            setUser(null);
            setLoading(false);

            return;
          }


          const parsed =
            JSON.parse(stored);

          setUser(parsed);

        } catch (error) {

          console.error(
            'Error loading user session:',
            error
          );

          setUser(null);
          setLoading(false);

        }

      };


    loadUser();

  }, []);


  // ------------------------------------------------------------------------
  // LOAD NOTIFICATIONS
  // ------------------------------------------------------------------------

  const loadNotifications =
    useCallback(
      async (
        showFullLoading = true
      ) => {

        if (!user?.farmer_id) {

          return;
        }


        if (showFullLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }


        setErrorMessage(null);


        try {

          const requestUrl =
            `${GET_NOTIFICATIONS_ENDPOINT}?farmer_id=${encodeURIComponent(
              String(user.farmer_id)
            )}`;


          console.log(
            'GET Notifications URL:',
            requestUrl
          );


          const response =
            await fetch(
              requestUrl,
              {
                method: 'GET',
                headers: {
                  Accept:
                    'application/json',
                },
              }
            );


          console.log(
            'Notifications HTTP Status:',
            response.status
          );


          const raw =
            await response.text();


          console.log(
            'Notifications Raw Response:',
            raw
          );


          let data:
            NotificationApiResponse | null =
            null;


          try {

            data =
              raw
                ? JSON.parse(raw)
                : null;

          } catch (parseError) {

            console.error(
              '[notifications] response was not valid JSON',
              {
                endpoint:
                  GET_NOTIFICATIONS_ENDPOINT,
                status:
                  response.status,
                raw,
                parseError,
              }
            );

            throw new Error(
              'The notification server returned an invalid response.'
            );

          }


          if (
            !response.ok ||
            !data?.success
          ) {

            throw new Error(
              data?.message ||
              'Failed to load notifications.'
            );

          }


          setPigPens(
            Array.isArray(
              data.pig_pens
            )
              ? data.pig_pens
              : []
          );


          setNotifications(
            Array.isArray(
              data.notifications
            )
              ? data.notifications
              : []
          );


        } catch (error: any) {

          console.error(
            '[notifications] failed to load notifications',
            {
              endpoint:
                GET_NOTIFICATIONS_ENDPOINT,
              farmer_id:
                user?.farmer_id,
              error,
            }
          );


          setErrorMessage(
            error?.message ||
            'Failed to load notifications.'
          );


        } finally {

          setLoading(false);
          setRefreshing(false);

        }

      },
      [user?.farmer_id]
    );


  // ------------------------------------------------------------------------
  // INITIAL LOAD
  // ------------------------------------------------------------------------

  useEffect(() => {

    if (!user?.farmer_id) {
      return;
    }


    loadNotifications(true);

  }, [
    user?.farmer_id,
    loadNotifications,
  ]);


  // ------------------------------------------------------------------------
  // MARK NOTIFICATION AS READ
  // ------------------------------------------------------------------------

  const handleNotificationPress =
    async (
      notification: NotificationItem
    ) => {

      if (
        notification.status ===
        'read'
      ) {

        return;

      }


      if (
        markingReadId !== null
      ) {

        return;

      }


      setMarkingReadId(
        notification.notification_id
      );


      try {

        const response =
          await fetch(
            MARK_NOTIFICATION_READ_ENDPOINT,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Accept:
                  'application/json',
              },
              body:
                JSON.stringify({
                  notification_id:
                    notification.notification_id,
                  farmer_id:
                    user?.farmer_id,
                }),
            }
          );


        const raw =
          await response.text();


        console.log(
          'Mark Notification Read Response:',
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
            '[notifications] invalid mark-read response',
            parseError
          );

        }


        if (
          !response.ok ||
          !data?.success
        ) {

          throw new Error(
            data?.message ||
            'Failed to mark notification as read.'
          );

        }


        // Update the local UI immediately.
        setNotifications(
          (current) =>
            current.map(
              (item) =>
                item.notification_id ===
                notification.notification_id
                  ? {
                      ...item,
                      status: 'read',
                    }
                  : item
            )
        );


      } catch (error) {

        console.error(
          '[notifications] failed to mark notification as read',
          {
            notification_id:
              notification.notification_id,
            error,
          }
        );

      } finally {

        setMarkingReadId(
          null
        );

      }

    };


  // ------------------------------------------------------------------------
  // FILTERED NOTIFICATIONS
  // ------------------------------------------------------------------------

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            notification.status ===
            'unread'
        ).length,
      [notifications]
    );


  const filteredNotifications =
    useMemo(
      () => {

        return notifications.filter(
          (notification) => {

            // Pig Pen filter.
            if (
              selectedPenId !== null &&
              notification.pen_id !==
                selectedPenId
            ) {
              return false;
            }


            // Read / Unread filter.
            if (
              filter === 'unread'
            ) {

              return (
                notification.status ===
                'unread'
              );

            }


            if (
              filter === 'read'
            ) {

              return (
                notification.status ===
                'read'
              );

            }


            return true;

          }
        );

      },
      [
        notifications,
        selectedPenId,
        filter,
      ]
    );


  // ------------------------------------------------------------------------
  // GROUP NOTIFICATIONS
  // ------------------------------------------------------------------------

  const grouped =
    useMemo(
      () => {

        const groupOrder:
          (
            | 'Today'
            | 'Yesterday'
            | 'Earlier This Week'
            | 'Earlier'
          )[] = [
            'Today',
            'Yesterday',
            'Earlier This Week',
            'Earlier',
          ];


        return groupOrder
          .map(
            (group) => ({
              group,
              items:
                filteredNotifications.filter(
                  (notification) =>
                    getGroupLabel(
                      notification.created_at
                    ) === group
                ),
            })
          )
          .filter(
            (group) =>
              group.items.length > 0
          );

      },
      [filteredNotifications]
    );


  // ------------------------------------------------------------------------
  // SELECTED PEN LABEL
  // ------------------------------------------------------------------------

  const selectedPenLabel =
    selectedPenId === null
      ? 'All Pens'
      : pigPens.find(
          (pen) =>
            pen.pen_id ===
            selectedPenId
        )?.pen_name ||
        'All Pens';


  // ------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop:
            insets.top,
        },
      ]}
    >

      {/* ================================================================
          HEADER
          ================================================================ */}

      <View style={styles.header}>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.replace(
              '/(tabs)/dashboard'
            )
          }
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color="#2F5D50"
          />
        </TouchableOpacity>


        {/* Logo + Title */}
        <View style={styles.headerCenter}>

          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text
            style={styles.headerTitle}
          >
            Notifications
          </Text>

        </View>


        {/* Spacer */}
        <View
          style={styles.headerSpacer}
        />

      </View>


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        onScrollToTop={() => {}}
      >

        {/* ================================================================
            PIG PEN FILTER
            ================================================================ */}

        <TouchableOpacity
          style={styles.penFilterButton}
          activeOpacity={0.85}
          onPress={() =>
            setPenPickerVisible(true)
          }
        >

          <View
            style={styles.penFilterLeft}
          >

            <Ionicons
              name="grid-outline"
              size={16}
              color="#2F5D50"
            />

            <Text
              style={
                styles.penFilterLabel
              }
            >
              {selectedPenLabel}
            </Text>

          </View>


          <Ionicons
            name="chevron-down"
            size={17}
            color="#2F5D50"
          />

        </TouchableOpacity>


        {/* ================================================================
            FILTER TABS
            ================================================================ */}

        <View
          style={styles.segmentedControl}
        >

          {[
            {
              key: 'all' as FilterKey,
              label: 'All',
            },
            {
              key: 'unread' as FilterKey,
              label: 'Unread',
            },
            {
              key: 'read' as FilterKey,
              label: 'Read',
            },
          ].map((tab) => (

            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segment,
                filter === tab.key &&
                  styles.segmentActive,
              ]}
              onPress={() =>
                setFilter(tab.key)
              }
              activeOpacity={0.85}
            >

              <Text
                style={[
                  styles.segmentText,
                  filter === tab.key &&
                    styles.segmentTextActive,
                ]}
              >
                {tab.label}

                {tab.key ===
                  'unread' &&
                  unreadCount > 0
                  ? ` (${unreadCount})`
                  : ''}

              </Text>

            </TouchableOpacity>

          ))}

        </View>


        {/* ================================================================
            LOADING
            ================================================================ */}

        {loading ? (

          <View
            style={styles.loadingState}
          >

            <ActivityIndicator
              size="small"
              color="#2F5D50"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading notifications...
            </Text>

          </View>

        ) : errorMessage ? (

          /* ================================================================
             ERROR
             ================================================================ */

          <View
            style={styles.emptyState}
          >

            <View
              style={styles.emptyIconWrap}
            >

              <Ionicons
                name="alert-circle-outline"
                size={28}
                color="#B0C0BC"
              />

            </View>


            <Text
              style={styles.emptyTitle}
            >
              Unable to Load Notifications
            </Text>


            <Text
              style={styles.emptySubtitle}
            >
              {errorMessage}
            </Text>


            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() =>
                loadNotifications(
                  true
                )
              }
            >

              <Text
                style={
                  styles.retryButtonText
                }
              >
                Try Again
              </Text>

            </TouchableOpacity>

          </View>

        ) : grouped.length === 0 ? (

          /* ================================================================
             EMPTY STATE
             ================================================================ */

          <View
            style={styles.emptyState}
          >

            <View
              style={styles.emptyIconWrap}
            >

              <Ionicons
                name="notifications-off-outline"
                size={28}
                color="#B0C0BC"
              />

            </View>


            <Text
              style={styles.emptyTitle}
            >
              No Notifications Yet
            </Text>


            <Text
              style={styles.emptySubtitle}
            >
              You're all caught up.
            </Text>

          </View>

        ) : (

          /* ================================================================
             NOTIFICATION LIST
             ================================================================ */

          grouped.map(
            ({
              group,
              items,
            }) => (

              <View
                key={group}
                style={styles.groupBlock}
              >

                <Text
                  style={styles.groupLabel}
                >
                  {group}
                </Text>


                <View
                  style={{
                    gap: 10,
                  }}
                >

                  {items.map(
                    (item) => {

                      const isUnread =
                        item.status ===
                        'unread';

                      const isMarkingRead =
                        markingReadId ===
                        item.notification_id;


                      return (

                        <TouchableOpacity
                          key={
                            item.notification_id
                          }
                          activeOpacity={0.85}
                          onPress={() =>
                            handleNotificationPress(
                              item
                            )
                          }
                          disabled={
                            isMarkingRead
                          }
                        >

                          <View
                            style={[
                              styles.notifCard,
                              isUnread &&
                                styles.notifCardUnread,
                            ]}
                          >

                            {/* Notification icon */}

                            <View
                              style={[
                                styles.notifIconWrap,
                                isUnread &&
                                  styles.notifIconWrapUnread,
                              ]}
                            >

                              {isMarkingRead ? (

                                <ActivityIndicator
                                  size="small"
                                  color="#2F5D50"
                                />

                              ) : (

                                <Ionicons
                                  name={
                                    getNotificationIcon(
                                      item.title
                                    )
                                  }
                                  size={17}
                                  color={
                                    isUnread
                                      ? '#2F5D50'
                                      : '#8A9994'
                                  }
                                />

                              )}

                            </View>


                            {/* Notification content */}

                            <View
                              style={
                                styles.notifTextBlock
                              }
                            >

                              <View
                                style={
                                  styles.notifTopRow
                                }
                              >

                                <Text
                                  style={[
                                    styles.notifTitle,
                                    isUnread &&
                                      styles.notifTitleUnread,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {item.title}
                                </Text>


                                {isUnread && (
                                  <View
                                    style={
                                      styles.unreadDot
                                    }
                                  />
                                )}

                              </View>


                              <Text
                                style={
                                  styles.notifPenName
                                }
                                numberOfLines={1}
                              >
                                {item.pen_name}
                              </Text>


                              <Text
                                style={
                                  styles.notifDescription
                                }
                                numberOfLines={2}
                              >
                                {item.message}
                              </Text>


                              <View
                                style={
                                  styles.notifBottomRow
                                }
                              >

                                <Text
                                  style={
                                    styles.notifTimestamp
                                  }
                                >
                                  {formatRelativeTime(
                                    item.created_at
                                  )}
                                </Text>


                                <View
                                  style={[
                                    styles.statusBadge,
                                    isUnread &&
                                      styles.statusBadgeUnread,
                                  ]}
                                >

                                  <Text
                                    style={[
                                      styles.statusBadgeText,
                                      isUnread &&
                                        styles.statusBadgeTextUnread,
                                    ]}
                                  >
                                    {isUnread
                                      ? 'Unread'
                                      : 'Read'}
                                  </Text>

                                </View>

                              </View>

                            </View>

                          </View>

                        </TouchableOpacity>

                      );

                    }
                  )}

                </View>

              </View>

            )
          )

        )}


        {/* Small bottom spacing */}

        <View
          style={styles.bottomSpacer}
        />

      </ScrollView>


      {/* ================================================================
          PIG PEN FILTER MODAL
          ================================================================ */}

      <Modal
        visible={
          penPickerVisible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setPenPickerVisible(false)
        }
      >

        <TouchableOpacity
          style={pickerStyles.overlay}
          activeOpacity={1}
          onPress={() =>
            setPenPickerVisible(false)
          }
        >

          <View
            style={pickerStyles.sheet}
          >

            <Text
              style={
                pickerStyles.sheetTitle
              }
            >
              Filter by Pig Pen
            </Text>


            {/* ============================================================
                ALL PENS
                ============================================================ */}

            <TouchableOpacity
              style={[
                pickerStyles.option,
                selectedPenId === null &&
                  pickerStyles.optionActive,
              ]}
              activeOpacity={0.8}
              onPress={() => {

                setSelectedPenId(
                  null
                );

                setPenPickerVisible(
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
                    selectedPenId ===
                      null &&
                      pickerStyles.optionLabelActive,
                  ]}
                >
                  All Pens
                </Text>

                <Text
                  style={
                    pickerStyles.optionDeviceCode
                  }
                >
                  Show notifications from all pens
                </Text>

              </View>


              {selectedPenId ===
                null && (

                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color="#2F5D50"
                />

              )}

            </TouchableOpacity>


            {/* ============================================================
                ACTUAL PIG PENS
                ============================================================ */}

            {pigPens.map(
              (pen) => {

                const isActive =
                  pen.pen_id ===
                  selectedPenId;


                return (

                  <TouchableOpacity
                    key={
                      pen.pen_id
                    }
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

                      setPenPickerVisible(
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

              }
            )}

          </View>

        </TouchableOpacity>

      </Modal>

    </View>
  );
}


// --------------------------------------------------------------------------
// MAIN STYLES
// --------------------------------------------------------------------------

const styles =
  StyleSheet.create({

    screen: {
      flex: 1,
      backgroundColor:
        '#F7F8F9',
    },


    /* Header — exact existing design */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor:
        '#FFFFFF',
      paddingTop: 12,
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor:
        '#E2EDEA',
    },

    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        '#F0F0F0',
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 1,
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

    headerSpacer: {
      width: 36,
    },


    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
      gap: 18,
    },


    /* Pig Pen filter */

    penFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      paddingVertical: 11,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor:
        '#E2EDEA',
    },

    penFilterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    penFilterLabel: {
      fontSize: 13.5,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
    },


    /* Filter tabs */

    segmentedControl: {
      flexDirection: 'row',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      padding: 4,
      gap: 4,
      borderWidth: 1,
      borderColor:
        '#E2EDEA',
    },

    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
    },

    segmentActive: {
      backgroundColor:
        '#2F5D50',
    },

    segmentText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#4A5C57',
      fontFamily: 'Inter',
    },

    segmentTextActive: {
      color: '#FFFFFF',
    },


    /* Loading */

    loadingState: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 60,
    },

    loadingText: {
      fontSize: 12.5,
      color: '#8A9994',
      fontFamily: 'Inter',
      fontWeight: '500',
    },


    /* Date group */

    groupBlock: {
      gap: 10,
    },

    groupLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: '#8A9994',
      fontFamily: 'Inter',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },


    /* Notification card */

    notifCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor:
        '#EEF1F0',
      shadowColor:
        '#0F2D24',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },

    notifCardUnread: {
      backgroundColor:
        '#EAF7F1',
      borderColor:
        '#D8EAE4',
    },

    notifIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor:
        '#F7F8F9',
      alignItems: 'center',
      justifyContent: 'center',
    },

    notifIconWrapUnread: {
      backgroundColor:
        '#FFFFFF',
    },

    notifTextBlock: {
      flex: 1,
      gap: 3,
    },

    notifTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    notifTitle: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: '600',
      color: '#4A5C57',
      fontFamily: 'Inter',
    },

    notifTitleUnread: {
      fontWeight: '800',
      color: '#1A2D27',
    },

    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        '#D96C8D',
    },

    notifPenName: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#2F5D50',
      fontFamily: 'Inter',
    },

    notifDescription: {
      fontSize: 12,
      color: '#6B7975',
      fontFamily: 'Inter',
      lineHeight: 17,
    },

    notifBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },

    notifTimestamp: {
      fontSize: 10.5,
      color: '#8A9994',
      fontFamily: 'Inter',
      fontWeight: '500',
    },

    statusBadge: {
      backgroundColor:
        '#F0F3F2',
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },

    statusBadgeUnread: {
      backgroundColor:
        '#FBEEF1',
    },

    statusBadgeText: {
      fontSize: 9.5,
      fontWeight: '700',
      color: '#8A9994',
      fontFamily: 'Inter',
    },

    statusBadgeTextUnread: {
      color: '#D96C8D',
    },


    /* Empty state */

    emptyState: {
      alignItems: 'center',
      gap: 6,
      paddingVertical: 60,
      paddingHorizontal: 20,
    },

    emptyIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        '#E2EDEA',
      marginBottom: 6,
    },

    emptyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#1A2D27',
      fontFamily: 'Inter',
      textAlign: 'center',
    },

    emptySubtitle: {
      fontSize: 12.5,
      color: '#8A9994',
      fontFamily: 'Inter',
      fontWeight: '500',
      textAlign: 'center',
    },


    /* Retry */

    retryButton: {
      marginTop: 8,
      backgroundColor:
        '#2F5D50',
      borderRadius: 10,
      paddingVertical: 9,
      paddingHorizontal: 16,
    },

    retryButtonText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: 'Inter',
    },


    bottomSpacer: {
      height: 32,
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
      maxHeight: '75%',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 14,
      gap: 6,
      shadowColor:
        '#0F2D24',
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
      backgroundColor:
        '#EAF7F1',
    },

    optionTextBlock: {
      flex: 1,
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
      fontSize: 12,
      fontWeight: '500',
      color: '#A0B5AD',
      fontFamily: 'Arial',
    },

  });