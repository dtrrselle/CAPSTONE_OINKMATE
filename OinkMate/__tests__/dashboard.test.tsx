import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import Dashboard from '../app/(tabs)/dashboard';

// AsyncStorage has no real native backing in Jest — use the official mock,
// same pattern as signin.test.tsx.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
import AsyncStorage from '@react-native-async-storage/async-storage';

// dashboard.tsx, QuickAccessGrid.tsx, and RecentAlerts.tsx each call useRouter()
// independently — share one mock push so all three resolve to the same spy.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const seedUser = async (user: object) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

const mockFarmOverviewFetch = (body: object) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => body,
  });
};

describe('OinkMate - Dashboard', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    await AsyncStorage.clear();
  });

  it('DASHBOARD-01: renders the dashboard sections successfully', async () => {
    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Farm Overview')).toBeTruthy();
      expect(screen.getByText('Quick Access')).toBeTruthy();
      expect(screen.getByText('Recent Alerts')).toBeTruthy();
    });
  });

  it("DASHBOARD-02: displays the logged-in farmer's name from AsyncStorage", async () => {
    await seedUser({ farmer_id: 1, fullname: 'Juan Dela Cruz' });

    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome, Juan Dela Cruz')).toBeTruthy();
    });
  });

  it('DASHBOARD-03: displays the current date and time in the header', async () => {
    jest.useFakeTimers();
    // Deliberately NOT 5:42 AM / 5:30 AM — those exact strings are also the
    // hardcoded times on RecentAlerts' cards, which would make the time text
    // ambiguous on the fully rendered Dashboard.
    const fixedNow = new Date(2026, 5, 26, 8, 15, 0);
    jest.setSystemTime(fixedNow);

    await render(<Dashboard />);

    const expectedDate = fixedNow.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const expectedTime = fixedNow.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Scope the time lookup to the same date/time chip that renders the date,
    // since RecentAlerts also hardcodes "5:42 AM" elsewhere on the Dashboard.
    const dateElement = screen.getByText(expectedDate);
    const dateTimeChip = dateElement.parent;
    expect(dateTimeChip).toBeTruthy();
    expect(within(dateTimeChip!).getByText(expectedTime)).toBeTruthy();

    jest.useRealTimers();
  });

  it('DASHBOARD-04: displays the default System Status banner', async () => {
    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Device Connected')).toBeTruthy();
      expect(screen.getByText('All sensors operating normally.')).toBeTruthy();
      expect(screen.getByText('LIVE')).toBeTruthy();
    });
  });

  it('DASHBOARD-06: displays the Farm Overview section with default zero values', async () => {
    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Total Pigs')).toBeTruthy();
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getAllByText('0').length).toBe(3);
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('DASHBOARD-07: fetches farm overview data using the farmer_id from the session', async () => {
    await seedUser({ farmer_id: 42, fullname: 'Juan Dela Cruz' });
    mockFarmOverviewFetch({ success: true, data: { total_pig_pens: 1, total_pigs: 2, active_pens: 1 } });

    await render(<Dashboard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oinkmate.online/oinkmate-api/api/dashboard/get_farm_overview.php?farmer_id=42'
      );
    });
  });

  it('DASHBOARD-08: displays the farm overview values returned by the API', async () => {
    await seedUser({ farmer_id: 42, fullname: 'Juan Dela Cruz' });
    mockFarmOverviewFetch({
      success: true,
      data: { total_pig_pens: 128, total_pigs: 964, active_pens: 57 },
    });

    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('128')).toBeTruthy();
      expect(screen.getByText('964')).toBeTruthy();
      expect(screen.getByText('57')).toBeTruthy();
    });
  });

  it('DASHBOARD-09: keeps zero values when the API returns an unsuccessful response', async () => {
    await seedUser({ farmer_id: 42, fullname: 'Juan Dela Cruz' });
    mockFarmOverviewFetch({ success: false });

    await render(<Dashboard />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBe(3);
    });
  });

  it('DASHBOARD-10: keeps zero values when the fetch request fails', async () => {
    await seedUser({ farmer_id: 42, fullname: 'Juan Dela Cruz' });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

    await render(<Dashboard />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBe(3);
    });
  });

  it('DASHBOARD-11: displays all Quick Access options', async () => {
    await render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Pig Pens').length).toBe(2); // Farm Overview card + Quick Access card
      expect(screen.getByText('Environment')).toBeTruthy();
      expect(screen.getByText('Feeding')).toBeTruthy();
      expect(screen.getByText('Sanitation')).toBeTruthy();
      expect(screen.getByText('Expenses')).toBeTruthy();
      expect(screen.getByText('Learning Center')).toBeTruthy();
    });
  });

  it('DASHBOARD-12: Quick Access items navigate to their actual routes', async () => {
    await render(<Dashboard />);

    await fireEvent.press(screen.getByText('Manage pens')); // pig-pens card
    expect(mockPush).toHaveBeenCalledWith('/pig-pens');

    await fireEvent.press(screen.getByText('Environment'));
    expect(mockPush).toHaveBeenCalledWith('/environment/environment');

    await fireEvent.press(screen.getByText('Feeding'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/schedule', params: { tab: 'feeding' } });

    await fireEvent.press(screen.getByText('Sanitation'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/schedule', params: { tab: 'sanitation' } });

    await fireEvent.press(screen.getByText('Expenses'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/expenses');

    await fireEvent.press(screen.getByText('Learning Center'));
    expect(mockPush).toHaveBeenCalledWith('/learning/learning-hub');
  });

  it('DASHBOARD-13: the notification bell navigates to the notifications route', async () => {
    await render(<Dashboard />);

    await fireEvent.press(screen.getByLabelText('Notifications'));

    expect(mockPush).toHaveBeenCalledWith('/notifications/notifications');
  });

  it('DASHBOARD-14: displays the actual Recent Alerts', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2027, 0, 1, 10, 15, 0)); // avoids colliding with alert times below

    await render(<Dashboard />);

    expect(screen.getByText('High Ammonia Detected')).toBeTruthy();
    expect(screen.getByText('NH₃ reached 18 ppm in Pen 3.')).toBeTruthy();
    expect(screen.getByText('5:42 AM')).toBeTruthy();
    expect(screen.getByText('Critical')).toBeTruthy();

    expect(screen.getByText('High Temperature')).toBeTruthy();
    expect(screen.getByText('Temperature reached 32°C in Pen 5.')).toBeTruthy();
    expect(screen.getByText('5:30 AM')).toBeTruthy();
    expect(screen.getByText('Warning')).toBeTruthy();

    jest.useRealTimers();
  });

  it('DASHBOARD-15: the Recent Alerts "View All" button navigates to the notifications route', async () => {
    await render(<Dashboard />);

    await fireEvent.press(screen.getByText('View All'));

    expect(mockPush).toHaveBeenCalledWith('/notifications/notifications');
  });
});