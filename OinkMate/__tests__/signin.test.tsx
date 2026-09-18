import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SignIn from '../app/authentication/signin';

// ── Mocks for native/external modules signin.tsx depends on ────────────────
// AsyncStorage has no real native backing in a Jest/Node environment, so we
// use the library's official jest mock.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-router's `router` needs a real navigator context at runtime; signin.tsx
// only calls router.push / router.replace, so a lightweight mock is enough.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

// NOTE on LOGIN-01 (empty email + password):
// signin.tsx does NOT use Alert.alert() or any other non-rendered native UI
// for this case. The "Missing Information" message is shown via the same
// custom <AuthModal> (a real RN <Modal> rendering <Text>) used for every
// other error/success state in the screen (Login Failed, Server Error,
// Connection Error, Welcome Back!). LOGIN-02 and LOGIN-03 already exercise
// this exact same showModal({ title: 'Missing Information', ... }) branch
// and pass, which confirms the modal renders correctly in this test
// environment — no Alert mocking/spying is needed or applicable here.
//
// The only change below is querying LOGIN-01 with the same waitFor(() =>
// getByText(...)) pattern already proven to work in LOGIN-02/03, and
// confirming the "Sign In" button is present before pressing it, so the
// assertion is as robust as the other passing tests. Nothing about the
// 5000ms timeout was changed, and LOGIN-02 through LOGIN-07 are untouched.

describe('OinkMate - Sign In', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('LOGIN-01: shows an error when email and password are empty', async () => {
    await render(<SignIn />);

    const signInButton = await screen.findByText('Sign In');
    await fireEvent.press(signInButton);

    // Unique string: only shown as the modal title in this scenario.
    await waitFor(() => {
      expect(screen.getByText('Missing Information')).toBeTruthy();
    });
  });

  it('LOGIN-02: shows an error when email is invalid', async () => {
    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'invalid-email');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    await fireEvent.press(screen.getByText('Sign In'));

    // This message is rendered twice (inline field error + modal message),
    // so we assert presence via getAllByText rather than a single findByText.
    await waitFor(() => {
      expect(screen.getAllByText('Enter a valid email address').length).toBeGreaterThan(0);
    });
  });

  it('LOGIN-03: shows an error when password is empty', async () => {
    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@gmail.com');
    await fireEvent.press(screen.getByText('Sign In'));

    // Same collision as LOGIN-02: appears inline under the password field
    // and inside the modal message.
    await waitFor(() => {
      expect(screen.getAllByText('Password is required').length).toBeGreaterThan(0);
    });
  });

  it('LOGIN-04: sends login request when valid credentials are entered', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: { user_id: 1, fullname: 'Juan Dela Cruz' },
      }),
    });

    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@gmail.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password123!');
    await fireEvent.press(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://oinkmate.online/oinkmate-api/api/farmer_login.php',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    // On success the component also persists the user to AsyncStorage
    // and shows the "Welcome Back!" success modal.
    expect(await screen.findByText('Welcome Back!')).toBeTruthy();
  });

  it('LOGIN-05: shows Login Failed when API returns unsuccessful login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        message: 'Incorrect email or password.',
      }),
    });

    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'wrong@gmail.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'wrongpassword');
    await fireEvent.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Login Failed')).toBeTruthy();
  });

  it('LOGIN-06: shows Server Error when API response is not successful', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@gmail.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password123!');
    await fireEvent.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Server Error')).toBeTruthy();
  });

  it('LOGIN-07: shows Connection Error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await render(<SignIn />);

    await fireEvent.changeText(screen.getByPlaceholderText('Email'), 'user@gmail.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Password'), 'Password123!');
    await fireEvent.press(screen.getByText('Sign In'));

    expect(await screen.findByText('Connection Error')).toBeTruthy();
  });
});