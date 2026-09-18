import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Screens under test (do NOT modify these source files) ──────────────────
import PigPens from '../app/(tabs)/pig-pens';
import AddPigPen from '../app/pigpens/add-pig-pen';
import EditPigPen from '../app/pigpens/edit-pig-pen';
import PigPenDetails from '../app/pigpens/pig-pen-details';

// ── AsyncStorage: official Jest mock ────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// ── Icons: render as plain text so we never depend on native icon assets ──
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: (props: any) => <Text>{props.name}</Text> };
});

// ── expo-router ──────────────────────────────────────────────────────────
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn(() => ({} as any));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useFocusEffect: (effect: any) => {
    const { useEffect } = require('react');
    useEffect(() => {
      const cleanup = effect();
      return cleanup;
    }, []);
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

// ── Pig Pens screen's child components: mocked per instructions ───────────
// Only the props/buttons needed to exercise pig-pens.tsx are exposed.
jest.mock('../components/pig-pens/PigPensHeader', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return (props: any) => (
    <TouchableOpacity onPress={props.onAddPenPress}>
      <Text>Add Pig Pen</Text>
    </TouchableOpacity>
  );
});
jest.mock('../components/pig-pens/PigSummaryCards', () => () => null);
jest.mock('../components/pig-pens/PenFilter', () => () => null);
jest.mock('../components/pig-pens/SearchBar', () => () => null);
jest.mock('../components/pig-pens/DeletePigPenModal', () => () => null);
jest.mock('../components/pig-pens/PigPenCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return (props: any) => (
    <View>
      <Text>{props.penName}</Text>
      <Text>{props.deviceCode}</Text>
      <Text>{props.growthStage}</Text>
      <TouchableOpacity onPress={props.onEditPress}>
        <Text>Edit {props.penName}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={props.onViewDetailsPress}>
        <Text>View Details {props.penName}</Text>
      </TouchableOpacity>
    </View>
  );
});

const FARMER_ID = 501;

const setStoredUser = async (farmerId: number | null = FARMER_ID) => {
  if (farmerId === null) {
    await AsyncStorage.removeItem('user');
  } else {
    await AsyncStorage.setItem('user', JSON.stringify({ farmer_id: farmerId }));
  }
};

const jsonResponse = (body: any) => Promise.resolve({ json: () => Promise.resolve(body) } as any);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockUseLocalSearchParams.mockReturnValue({});
  global.fetch = jest.fn() as any;
});

// ════════════════════════════════════════════════════════════════════════
// A. PIG PENS — DISPLAYING
// ════════════════════════════════════════════════════════════════════════
describe('Pig Pens screen', () => {
  const MOCK_PEN = {
    pen_id: 9,
    device_code: 'OINK-009',
    pen_name: 'Pen Nine',
    description: 'A pen',
    pig_count: 12,
    pig_age_at_registration: 30,
    avg_weight: 40,
    currentAge: '30 days',
    growthStage: 'Grower',
    feedType: 'Grower Feed',
    actualFeedType: 'Grower Feed',
    recommendedFeed: 2,
    source: 'Recommendation Engine',
  };

  const mockPigPensFetch = (pigPens: any[] = [MOCK_PEN], success = true) => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('get_pig_pens.php')) {
        return jsonResponse({ success, pig_pens: pigPens });
      }
      if (url.includes('get_latest_environment.php')) {
        return jsonResponse({ success: true, data: [] });
      }
      return jsonResponse({ success: false });
    });
  };

  test('PIGPEN-01: renders, loads farmer_id, and requests get_pig_pens.php', async () => {
    await setStoredUser();
    mockPigPensFetch();

    const { unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oinkmate.online/oinkmate-api/api/pig-pens/get_pig_pens.php',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id: FARMER_ID }),
        })
      );
    });

    await unmount();
  });

  test('PIGPEN-02: displays returned pig pen information', async () => {
    await setStoredUser();
    mockPigPensFetch();

    const { getByText, unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(getByText('Pen Nine')).toBeTruthy();
      expect(getByText('OINK-009')).toBeTruthy();
      expect(getByText('Grower')).toBeTruthy();
    });

    await unmount();
  });

  test('PIGPEN-03: handles an unsuccessful API response without crashing', async () => {
    await setStoredUser();
    mockPigPensFetch([], false);

    const { getByText, unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(getByText('No Pig Pens Yet')).toBeTruthy();
    });

    await unmount();
  });

  test('PIGPEN-04: handles a failed fetch without crashing', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    const { getByText, unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(getByText('No Pig Pens Yet')).toBeTruthy();
    });

    await unmount();
  });

  test('PIGPEN-05: Add Pig Pen navigation uses the actual route', async () => {
    await setStoredUser();
    mockPigPensFetch([]);

    const { getByText, unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(getByText('Add Pig Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Add Pig Pen'));

    expect(mockPush).toHaveBeenCalledWith('/pigpens/add-pig-pen');

    await unmount();
  });

  test('PIGPEN-06: Edit and View Details navigation pass pen_id to the actual routes', async () => {
    await setStoredUser();
    mockPigPensFetch();

    const { getByText, unmount } = await render(<PigPens />);

    await waitFor(() => {
      expect(getByText('Edit Pen Nine')).toBeTruthy();
    });

    await fireEvent.press(getByText('Edit Pen Nine'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/pigpens/edit-pig-pen',
      params: { pen_id: MOCK_PEN.pen_id },
    });

    await fireEvent.press(getByText('View Details Pen Nine'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/pigpens/pig-pen-details',
      params: { pen_id: MOCK_PEN.pen_id },
    });

    await unmount();
  });
});

// ════════════════════════════════════════════════════════════════════════
// B. ADD PIG PEN
// ════════════════════════════════════════════════════════════════════════
describe('Add Pig Pen screen', () => {
  const fillValidForm = async (getByPlaceholderText: any, getByText: any) => {
    await fireEvent.changeText(getByPlaceholderText('Enter pen name'), 'North Pen');
    await fireEvent.changeText(
      getByPlaceholderText('Add any notes about this pig pen'),
      'Optional notes'
    );
    await fireEvent.changeText(getByPlaceholderText('Enter number of pigs'), '10');
    await fireEvent.changeText(getByPlaceholderText('Enter pig age in days'), '20');
    await fireEvent.changeText(
      getByPlaceholderText('Enter Device Code (e.g. OINKMATE-001)'),
      'OINK-100'
    );
    await fireEvent.changeText(getByPlaceholderText('Enter average weight in kg'), '45');
    await fireEvent.press(getByText('Select feed type'));
    await fireEvent.press(getByText('Grower Feed'));
  };

  test('PIGPEN-07: renders the Add Pig Pen screen', async () => {
    const { getByText, getByPlaceholderText } = await render(<AddPigPen />);
    expect(getByText('Add Pig Pen')).toBeTruthy();
    expect(getByPlaceholderText('Enter pen name')).toBeTruthy();
    expect(getByText('Save Pig Pen')).toBeTruthy();
  });

  test('PIGPEN-08: shows required-field validation errors on an empty form', async () => {
    const { getByText } = await render(<AddPigPen />);

    await fireEvent.press(getByText('Save Pig Pen'));

    expect(getByText('Pen name is required')).toBeTruthy();
    expect(getByText('Number of pigs is required')).toBeTruthy();
    expect(getByText('Device code is required')).toBeTruthy();
    expect(getByText('Pig age is required')).toBeTruthy();
    expect(getByText('Feed type is required')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('PIGPEN-09: shows validation errors for invalid number of pigs and pig age', async () => {
    const { getByText, getByPlaceholderText, queryByText } = await render(<AddPigPen />);

    await fireEvent.changeText(getByPlaceholderText('Enter number of pigs'), '0');
    await fireEvent.press(getByText('Save Pig Pen'));
    expect(getByText('Enter a valid number of pigs')).toBeTruthy();

    await fireEvent.changeText(getByPlaceholderText('Enter pig age in days'), 'abc');
    await fireEvent.press(getByText('Save Pig Pen'));
    expect(getByText('Enter a valid pig age in days')).toBeTruthy();
    expect(queryByText('Are you sure you want to add this pig pen?')).toBeNull();
  });

  test('PIGPEN-10: a valid form opens the confirmation modal', async () => {
    const { getByText, getByPlaceholderText } = await render(<AddPigPen />);

    await fillValidForm(getByPlaceholderText, getByText);
    await fireEvent.press(getByText('Save Pig Pen'));

    expect(getByText('Are you sure you want to add this pig pen?')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('PIGPEN-11: canceling the confirmation modal does not submit', async () => {
    const { getByText, getByPlaceholderText, queryByText } = await render(<AddPigPen />);

    await fillValidForm(getByPlaceholderText, getByText);
    await fireEvent.press(getByText('Save Pig Pen'));
    await fireEvent.press(getByText('Cancel'));

    expect(queryByText('Are you sure you want to add this pig pen?')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('PIGPEN-12: confirming sends the correct POST request and, on success, shows the success modal and navigates back', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockResolvedValue(
      await jsonResponse({ success: true })
    );

    const { getByText, getByPlaceholderText } = await render(<AddPigPen />);

    await fillValidForm(getByPlaceholderText, getByText);
    await fireEvent.press(getByText('Save Pig Pen'));
    await fireEvent.press(getByText('Yes, Add Pig Pen'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oinkmate.online/oinkmate-api/api/pig-pens/add_pig_pen.php',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id: FARMER_ID,
            device_code: 'OINK-100',
            pen_name: 'North Pen',
            description: 'Optional notes',
            pig_count: 10,
            pig_age_at_registration: 20,
            avg_weight: 45,
            feed_type: 'Grower Feed',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(getByText('Pig pen created successfully.')).toBeTruthy();
    });

    await fireEvent.press(getByText('OK'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pig-pens');
  });

  test('PIGPEN-13: an API error response is handled according to the source (device code already assigned)', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockResolvedValue(
      await jsonResponse({ success: false, message: 'Device code already assigned to another pen' })
    );

    const { getByText, getByPlaceholderText } = await render(<AddPigPen />);

    await fillValidForm(getByPlaceholderText, getByText);
    await fireEvent.press(getByText('Save Pig Pen'));
    await fireEvent.press(getByText('Yes, Add Pig Pen'));

    await waitFor(() => {
      expect(getByText('Device Code Already Used')).toBeTruthy();
      expect(
        getByText('This device code is already assigned to another pig pen.')
      ).toBeTruthy();
    });
  });

  test('PIGPEN-14: a network/fetch failure is handled according to the source', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    const { getByText, getByPlaceholderText } = await render(<AddPigPen />);

    await fillValidForm(getByPlaceholderText, getByText);
    await fireEvent.press(getByText('Save Pig Pen'));
    await fireEvent.press(getByText('Yes, Add Pig Pen'));

    await waitFor(() => {
      expect(getByText('Unable to Add Pig Pen')).toBeTruthy();
      expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// C. EDIT PIG PEN
// ════════════════════════════════════════════════════════════════════════
describe('Edit Pig Pen screen', () => {
  const PEN_ID = '55';

  const LOADED_PEN = {
    pen_name: 'South Pen',
    device_code: 'OINK-200',
    description: 'Existing description',
    pig_count: 8,
    growthStage: 'Finisher',
    actualFeedType: 'Finisher Feed',
    avg_weight: 60,
    pig_age_at_registration: 90,
  };

  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ pen_id: PEN_ID });
  });

  const mockLoad = (body: any) => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('get_pig_pen_details.php')) {
        return jsonResponse(body);
      }
      return jsonResponse({ success: false });
    });
  };

  test('PIGPEN-15: loads pig pen details via get_pig_pen_details.php and displays them', async () => {
    await setStoredUser();
    mockLoad({ success: true, pig_pen: LOADED_PEN });

    const { getByDisplayValue, unmount } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `https://oinkmate.online/oinkmate-api/api/pig-pens/get_pig_pen_details.php?pen_id=${PEN_ID}`
      );
    });

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
      expect(getByDisplayValue('OINK-200')).toBeTruthy();
      expect(getByDisplayValue('8')).toBeTruthy();
      expect(getByDisplayValue('60')).toBeTruthy();
    });

    await unmount();
  });

  test('PIGPEN-16: handles a missing/invalid pen response', async () => {
    await setStoredUser();
    mockLoad({ success: false });

    const { getByText } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByText('Pig Pen Not Found')).toBeTruthy();
      expect(getByText('We could not find this pig pen.')).toBeTruthy();
    });
  });

  test('PIGPEN-17: handles a fetch failure while loading', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    const { getByText } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByText('Something Went Wrong')).toBeTruthy();
      expect(getByText('Failed to load pig pen details. Please try again.')).toBeTruthy();
    });
  });

  test('PIGPEN-18: validates missing required information before update', async () => {
    await setStoredUser();
    mockLoad({ success: true, pig_pen: LOADED_PEN });

    const { getByText, getByDisplayValue } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.changeText(getByDisplayValue('South Pen'), '');
    await fireEvent.press(getByText('Update Pig Pen'));

    expect(getByText('Missing Information')).toBeTruthy();
    expect(getByText('Please fill out all required fields before saving.')).toBeTruthy();
  });

  test('PIGPEN-19: requires Actual Feed Type, then a valid form opens the Save Changes modal', async () => {
    await setStoredUser();
    mockLoad({ success: true, pig_pen: { ...LOADED_PEN, actualFeedType: '' } });

    const { getByText, getByDisplayValue } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Update Pig Pen'));
    expect(getByText('Please select an actual feed type before saving.')).toBeTruthy();

    await fireEvent.press(getByText('Select Feed Type'));
    await fireEvent.press(getByText('Finisher Feed'));
    await fireEvent.press(getByText('Update Pig Pen'));

    expect(getByText('Are you sure you want to update this pig pen?')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('update_pig_pen.php'),
      expect.anything()
    );
  });

  test('PIGPEN-20: canceling the Save Changes confirmation does not submit', async () => {
    await setStoredUser();
    mockLoad({ success: true, pig_pen: LOADED_PEN });

    const { getByText, getByDisplayValue, queryByText } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Update Pig Pen'));
    await fireEvent.press(getByText('Cancel'));

    expect(queryByText('Are you sure you want to update this pig pen?')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('update_pig_pen.php'),
      expect.anything()
    );
  });

  test('PIGPEN-21: confirming sends the correct POST request to update_pig_pen.php and navigates back on success', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('get_pig_pen_details.php')) {
        return jsonResponse({ success: true, pig_pen: LOADED_PEN });
      }
      if (url.includes('update_pig_pen.php')) {
        return jsonResponse({ success: true });
      }
      return jsonResponse({ success: false });
    });

    const { getByText, getByDisplayValue } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Update Pig Pen'));
    await fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oinkmate.online/oinkmate-api/api/pig-pens/update_pig_pen.php',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pen_id: Number(PEN_ID),
            farmer_id: FARMER_ID,
            device_code: 'OINK-200',
            pen_name: 'South Pen',
            description: 'Existing description',
            pig_count: 8,
            avg_weight: 60,
            pig_age_at_registration: 90,
            feed_type: 'Finisher Feed',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(getByText('Pig Pen Updated')).toBeTruthy();
    });

    await fireEvent.press(getByText('OK'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pig-pens');
  });

  test('PIGPEN-22: an API error response is handled according to the source (error_code)', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('get_pig_pen_details.php')) {
        return jsonResponse({ success: true, pig_pen: LOADED_PEN });
      }
      if (url.includes('update_pig_pen.php')) {
        return jsonResponse({ success: false, error_code: 'DUPLICATE_NAME' });
      }
      return jsonResponse({ success: false });
    });

    const { getByText, getByDisplayValue } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Update Pig Pen'));
    await fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Duplicate Pig Pen Name')).toBeTruthy();
      expect(getByText('A pig pen with this name already exists.')).toBeTruthy();
    });
  });

  test('PIGPEN-23: a network failure on update is handled according to the source', async () => {
    await setStoredUser();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('get_pig_pen_details.php')) {
        return jsonResponse({ success: true, pig_pen: LOADED_PEN });
      }
      return Promise.reject(new Error('Network down'));
    });

    const { getByText, getByDisplayValue } = await render(<EditPigPen />);

    await waitFor(() => {
      expect(getByDisplayValue('South Pen')).toBeTruthy();
    });

    await fireEvent.press(getByText('Update Pig Pen'));
    await fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Something Went Wrong')).toBeTruthy();
      expect(
        getByText('We could not reach the server. Please check your connection and try again.')
      ).toBeTruthy();
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// D. PIG PEN DETAILS
// ════════════════════════════════════════════════════════════════════════
describe('Pig Pen Details screen', () => {
  const PEN_ID = '77';

  const DETAILS_PEN = {
    pen_id: 77,
    device_code: 'OINK-777',
    pen_name: 'East Pen',
    description: 'A well-kept pen',
    created_at: '2024-01-15T12:00:00Z',
    pig_count: 15,
    avg_weight: 55.5,
    updated_at: '2024-02-20T12:00:00Z',
    currentAge: '45 days',
    growthStage: 'Grower',
    feedType: 'Grower Feed',
    actualFeedType: 'Starter Feed',
    recommendedFeed: 2.5,
    source: 'Recommendation Engine',
  };

  beforeEach(() => {
    mockUseLocalSearchParams.mockReturnValue({ pen_id: PEN_ID });
  });

  test('PIGPEN-24: calls get_pig_pen_details.php with pen_id and displays the returned information', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      await jsonResponse({ success: true, pig_pen: DETAILS_PEN })
    );

    const { getByText, getAllByText } = await render(<PigPenDetails />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `https://oinkmate.online/oinkmate-api/api/pig-pens/get_pig_pen_details.php?pen_id=${PEN_ID}`
      );
    });

    await waitFor(() => {
      // "East Pen" (pen_name) appears in both the Overview Card header and
      // the Pen Information card's "Pen Name" row, so it legitimately
      // appears twice — same pattern as "Grower" below.
      expect(getAllByText('East Pen').length).toBe(2);
      expect(getByText('OINK-777')).toBeTruthy();
      expect(getByText('15')).toBeTruthy();
      expect(getByText('45 days')).toBeTruthy();
      expect(getByText('55.5 kg')).toBeTruthy();
      expect(getByText('Starter Feed')).toBeTruthy();
      expect(getByText('Grower Feed')).toBeTruthy();
      expect(getByText('2.5 kg/day per pig')).toBeTruthy();
      expect(getByText('Recommendation Engine')).toBeTruthy();
      expect(getByText('A well-kept pen')).toBeTruthy();
      expect(getByText('January 15, 2024')).toBeTruthy();
      expect(getByText('February 20, 2024')).toBeTruthy();
      // "Grower" (growthStage) appears in both the overview chip and the
      // Feeding Recommendation card, so it must legitimately appear twice.
      expect(getAllByText('Grower').length).toBe(2);
    });
  });

  test('PIGPEN-25: handles a missing pen_id without crashing or calling fetch', async () => {
    mockUseLocalSearchParams.mockReturnValue({});

    const { getByText } = await render(<PigPenDetails />);

    await waitFor(() => {
      expect(getByText('Missing pen ID.')).toBeTruthy();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('PIGPEN-26: handles an unsuccessful API response / pig pen not found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(await jsonResponse({ success: false }));

    const { getByText } = await render(<PigPenDetails />);

    await waitFor(() => {
      expect(getByText('Pig Pen Not Found')).toBeTruthy();
    });
  });

  test('PIGPEN-27: handles a network failure without crashing', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

    const { getByText } = await render(<PigPenDetails />);

    await waitFor(() => {
      expect(getByText('Something went wrong while loading pen details.')).toBeTruthy();
    });
  });

  test('PIGPEN-28: back navigation uses the actual route from the source', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      await jsonResponse({ success: true, pig_pen: DETAILS_PEN })
    );

    const { getAllByText, getByText } = await render(<PigPenDetails />);

    await waitFor(() => {
      // "East Pen" legitimately renders twice (see PIGPEN-24) — this test
      // only needs to know the screen finished loading before pressing back.
      expect(getAllByText('East Pen').length).toBeGreaterThan(0);
    });

    // UNSAFE_getByType was removed in RNTL v14 (host-elements-only renderer).
    // The back button's icon is mocked to render as <Text>chevron-back</Text>,
    // and fireEvent.press walks up the tree to find the nearest onPress
    // handler, so this reaches the TouchableOpacity without needing a
    // testID or accessibilityRole added to pig-pen-details.tsx.
    await fireEvent.press(getByText('chevron-back'));

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/pig-pens');
  });
});