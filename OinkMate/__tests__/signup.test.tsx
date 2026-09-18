/**
 * __tests__/signup.test.tsx
 *
 * Unit tests for app/authentication/signup.tsx
 *
 * These tests exercise ONLY behavior that actually exists in signup.tsx:
 *  - required-field validation
 *  - email format validation
 *  - password requirement validation (length / upper / lower / number / special)
 *  - password confirmation matching
 *  - the POST request to farmer_register.php on a fully valid form
 *  - success / business-logic-failure / server-error / network-error handling
 *  - the password-requirements checklist and match/mismatch indicator UI
 *
 * No real network calls are made — `fetch` is mocked. `expo-router` is
 * mocked so `router.push` calls can be asserted without a real navigator.
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import SignUp from '../app/authentication/signup';

// ── Mock expo-router (signup.tsx calls router.push on back / success / footer link) ──
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
import { router } from 'expo-router';

// ── Mock global fetch — no real requests to the OinkMate API ─────────────────
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

// ── Helpers ────────────────────────────────────────────────────────────────
const STRONG_PASSWORD = 'Passw0rd!'; // meets all 5 REQS in signup.tsx

type FormOverrides = Partial<{
  fullname: string;
  contactNumber: string;
  farmName: string;
  farmAddress: string;
  email: string;
  password: string;
  confirmPassword: string;
}>;

const DEFAULT_VALID_FORM = {
  fullname: 'Juan Dela Cruz',
  contactNumber: '09171234567',
  farmName: 'Dela Cruz Piggery',
  farmAddress: 'Lipa City, Batangas',
  email: 'juan@gmail.com',
  password: STRONG_PASSWORD,
  confirmPassword: STRONG_PASSWORD,
};

async function fillForm(overrides: FormOverrides = {}) {
  const values = { ...DEFAULT_VALID_FORM, ...overrides };

  fireEvent.changeText(screen.getByPlaceholderText('Full Name'), values.fullname);
  fireEvent.changeText(screen.getByPlaceholderText('Contact Number'), values.contactNumber);
  fireEvent.changeText(screen.getByPlaceholderText('Farm Name'), values.farmName);
  fireEvent.changeText(screen.getByPlaceholderText('Farm Address'), values.farmAddress);
  fireEvent.changeText(screen.getByPlaceholderText('Email'), values.email);
  fireEvent.changeText(screen.getByPlaceholderText('Password'), values.password);
  fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), values.confirmPassword);
}

function submit() {
  fireEvent.press(screen.getByText('Create Account'));
}

function mockFetchOnce(response: { ok: boolean; status?: number; json?: () => Promise<any> }) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.json ?? (async () => ({})),
  });
}

// ── SIGNUP-01: Renders the registration form ────────────────────────────────
test('SIGNUP-01: renders all required fields and the Create Account button', async () => {
  render(<SignUp />);

  expect(screen.getByPlaceholderText('Full Name')).toBeTruthy();
  expect(screen.getByPlaceholderText('Contact Number')).toBeTruthy();
  expect(screen.getByPlaceholderText('Farm Name')).toBeTruthy();
  expect(screen.getByPlaceholderText('Farm Address')).toBeTruthy();
  expect(screen.getByPlaceholderText('Email')).toBeTruthy();
  expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  expect(screen.getByPlaceholderText('Confirm Password')).toBeTruthy();
  expect(screen.getByText('Create Account')).toBeTruthy();
});

// ── SIGNUP-02: Required-field validation ────────────────────────────────────
test('SIGNUP-02: shows "Missing Information" when required fields are empty and does not call fetch', async () => {
  render(<SignUp />);

  // Leave every field blank and submit
  submit();

  await waitFor(() => {
    expect(screen.getByText('Missing Information')).toBeTruthy();
    expect(screen.getByText('Please fill in all required fields before continuing.')).toBeTruthy();
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── SIGNUP-03: Email format validation ──────────────────────────────────────
test('SIGNUP-03: shows "Invalid Email" for a malformed email and does not call fetch', async () => {
  render(<SignUp />);

  await fillForm({ email: 'not-an-email' });
  submit();

  await waitFor(() => {
    expect(screen.getByText('Invalid Email')).toBeTruthy();
    expect(screen.getByText('Enter a valid email address (e.g. user@gmail.com).')).toBeTruthy();
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── SIGNUP-04: Password requirement validation ──────────────────────────────
test('SIGNUP-04: shows "Password Requirements" when password fails the strength rules', async () => {
  render(<SignUp />);

  // "abc" fails length, uppercase, number, and special-character rules
  await fillForm({ password: 'abc', confirmPassword: 'abc' });
  submit();

  await waitFor(() => {
    expect(screen.getByText('Password Requirements')).toBeTruthy();
    expect(
      screen.getByText('Your password does not meet all the requirements listed below it.')
    ).toBeTruthy();
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── SIGNUP-05: Password confirmation matching ───────────────────────────────
test('SIGNUP-05: shows "Passwords Don\'t Match" when confirm password differs', async () => {
  render(<SignUp />);

  await fillForm({ password: STRONG_PASSWORD, confirmPassword: 'Different1!' });
  submit();

  await waitFor(() => {
    expect(screen.getByText("Passwords Don't Match")).toBeTruthy();
    expect(screen.getByText('Please make sure both password fields are identical.')).toBeTruthy();
  });
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── SIGNUP-06: Valid form submits the correct request ───────────────────────
test('SIGNUP-06: submits a valid form as a POST with the correct endpoint and JSON body', async () => {
  mockFetchOnce({ ok: true, json: async () => ({ success: true }) });
  render(<SignUp />);

  await fillForm({
    fullname: '  Juan Dela Cruz  ',
    contactNumber: '  09171234567  ',
    farmName: '  Dela Cruz Piggery  ',
    farmAddress: '  Lipa City, Batangas  ',
    email: '  juan@gmail.com  ',
  });
  submit();

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

  expect(global.fetch).toHaveBeenCalledWith(
    'https://oinkmate.online/oinkmate-api/api/farmer_register.php',
    expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullname: 'Juan Dela Cruz',
        contact_number: '09171234567',
        farm_name: 'Dela Cruz Piggery',
        farm_address: 'Lipa City, Batangas',
        email: 'juan@gmail.com',
        password: STRONG_PASSWORD,
      }),
    })
  );
});

// ── SIGNUP-07: Successful registration ──────────────────────────────────────
test('SIGNUP-07: shows "Registration Successful" when the API returns success', async () => {
  mockFetchOnce({ ok: true, json: async () => ({ success: true }) });
  render(<SignUp />);

  await fillForm();
  submit();

  await waitFor(() => {
    expect(screen.getByText('Registration Successful')).toBeTruthy();
    expect(screen.getByText('Your account has been created successfully.')).toBeTruthy();
  });

  // Pressing the modal's primary button navigates to Sign In
  fireEvent.press(screen.getByText('Continue to Sign In'));
  expect(router.push).toHaveBeenCalledWith('/authentication/signin');
});

// ── SIGNUP-08: Business-logic failure with server message ──────────────────
test('SIGNUP-08: shows "Registration Failed" with the server-provided message', async () => {
  mockFetchOnce({
    ok: true,
    json: async () => ({ success: false, message: 'Email is already registered.' }),
  });
  render(<SignUp />);

  await fillForm();
  submit();

  await waitFor(() => {
    expect(screen.getByText('Registration Failed')).toBeTruthy();
    expect(screen.getByText('Email is already registered.')).toBeTruthy();
  });
});

// ── SIGNUP-09: Business-logic failure without a server message ─────────────
test('SIGNUP-09: falls back to the default failure message when the API omits one', async () => {
  mockFetchOnce({ ok: true, json: async () => ({ success: false }) });
  render(<SignUp />);

  await fillForm();
  submit();

  await waitFor(() => {
    expect(screen.getByText('Registration Failed')).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
  });
});

// ── SIGNUP-10: HTTP/server error ────────────────────────────────────────────
test('SIGNUP-10: shows "Server Error" with the status code when the response is not ok', async () => {
  mockFetchOnce({ ok: false, status: 500 });
  render(<SignUp />);

  await fillForm();
  submit();

  await waitFor(() => {
    expect(screen.getByText('Server Error')).toBeTruthy();
    expect(screen.getByText('We hit a snag on our end (500). Please try again.')).toBeTruthy();
  });
});

// ── SIGNUP-11: Network / fetch error ────────────────────────────────────────
test('SIGNUP-11: shows "Connection Error" when fetch throws a network error', async () => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));
  render(<SignUp />);

  await fillForm();
  submit();

  await waitFor(() => {
    expect(screen.getByText('Connection Error')).toBeTruthy();
    expect(
      screen.getByText('Unable to connect. Check your internet connection and try again.')
    ).toBeTruthy();
  });
});

// ── SIGNUP-12: Live password requirements checklist ─────────────────────────
test('SIGNUP-12: password requirements checklist appears only after the password field is touched', async () => {
  render(<SignUp />);

  // Not visible before the user types anything into the password field
  expect(screen.queryByText('Minimum 8 characters')).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText('Password'), 'a');

  await waitFor(() => {
    expect(screen.getByText('Minimum 8 characters')).toBeTruthy();
    expect(screen.getByText('Uppercase letter')).toBeTruthy();
    expect(screen.getByText('Lowercase letter')).toBeTruthy();
    expect(screen.getByText('Number')).toBeTruthy();
    expect(screen.getByText('Special character')).toBeTruthy();
  });
});

// ── SIGNUP-13: Match / mismatch indicator ───────────────────────────────────
test('SIGNUP-13: shows a live match/mismatch indicator once confirm password is touched', async () => {
  render(<SignUp />);

  fireEvent.changeText(screen.getByPlaceholderText('Password'), STRONG_PASSWORD);
  fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), 'Different1!');

  await waitFor(() => {
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
  });

  fireEvent.changeText(screen.getByPlaceholderText('Confirm Password'), STRONG_PASSWORD);

  await waitFor(() => {
    expect(screen.getByText('Passwords match')).toBeTruthy();
  });
});