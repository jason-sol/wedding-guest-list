import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { TestWrapper } from '../test/TestWrapper';

// Helper to get the password input by its id, avoiding conflict with
// "Show password" / "Hide password" aria-labels
function getPasswordInput(): HTMLInputElement {
  return document.getElementById('password') as HTMLInputElement;
}

function getUsernameInput(): HTMLInputElement {
  return document.getElementById('username') as HTMLInputElement;
}

describe('Login', () => {
  test('renders username and password fields', () => {
    render(
      <TestWrapper>
        <Login onLoginSuccess={vi.fn()} />
      </TestWrapper>
    );

    expect(getUsernameInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  test('renders "Sign In" button', () => {
    render(
      <TestWrapper>
        <Login onLoginSuccess={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('calls onLoginSuccess with username and password on form submit', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn().mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <Login onLoginSuccess={onLoginSuccess} />
      </TestWrapper>
    );

    await user.type(getUsernameInput(), 'testuser');
    await user.type(getPasswordInput(), 'testpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith('testuser', 'testpass');
    });
  });

  test('shows loading spinner during submission', async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const onLoginSuccess = vi.fn().mockReturnValue(loginPromise);

    render(
      <TestWrapper>
        <Login onLoginSuccess={onLoginSuccess} />
      </TestWrapper>
    );

    await user.type(getUsernameInput(), 'testuser');
    await user.type(getPasswordInput(), 'testpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolveLogin!();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  test('disables inputs during loading', async () => {
    const user = userEvent.setup();
    let resolveLogin: () => void;
    const loginPromise = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const onLoginSuccess = vi.fn().mockReturnValue(loginPromise);

    render(
      <TestWrapper>
        <Login onLoginSuccess={onLoginSuccess} />
      </TestWrapper>
    );

    await user.type(getUsernameInput(), 'testuser');
    await user.type(getPasswordInput(), 'testpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(getUsernameInput()).toBeDisabled();
    expect(getPasswordInput()).toBeDisabled();

    resolveLogin!();
    await waitFor(() => {
      expect(getUsernameInput()).not.toBeDisabled();
    });
  });

  test('shows error message when login fails', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn().mockRejectedValue(new Error('Bad credentials'));

    render(
      <TestWrapper>
        <Login onLoginSuccess={onLoginSuccess} />
      </TestWrapper>
    );

    await user.type(getUsernameInput(), 'testuser');
    await user.type(getPasswordInput(), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Bad credentials')).toBeInTheDocument();
    });
  });

  test('password visibility toggle works', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Login onLoginSuccess={vi.fn()} />
      </TestWrapper>
    );

    const passwordInput = getPasswordInput();
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('Show password');
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText('Hide password');
    await user.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('shows "Wedding Guest List" title', () => {
    render(
      <TestWrapper>
        <Login onLoginSuccess={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText('Wedding Guest List')).toBeInTheDocument();
  });
});
