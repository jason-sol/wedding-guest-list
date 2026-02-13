import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';
import { TestWrapper } from '../test/TestWrapper';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.showSuccess('Success msg')}>success</button>
      <button onClick={() => toast.showError('Error msg')}>error</button>
      <button onClick={() => toast.showWarning('Warning msg')}>warning</button>
      <button onClick={() => toast.showInfo('Info msg')}>info</button>
    </div>
  );
}

describe('Toast', () => {
  test('useToast throws error when used outside ToastProvider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useToast());
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });

  test('showSuccess renders success alert with message', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('success'));

    await waitFor(() => {
      expect(screen.getByText('Success msg')).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-filledSuccess');
  });

  test('showError renders error alert with message', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('error'));

    await waitFor(() => {
      expect(screen.getByText('Error msg')).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-filledError');
  });

  test('showWarning renders warning alert with message', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('warning'));

    await waitFor(() => {
      expect(screen.getByText('Warning msg')).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-filledWarning');
  });

  test('showInfo renders info alert with message', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('info'));

    await waitFor(() => {
      expect(screen.getByText('Info msg')).toBeInTheDocument();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('MuiAlert-filledInfo');
  });

  test('toast auto-removes after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('success'));

    expect(screen.getByText('Success msg')).toBeInTheDocument();

    // Advance past the 4000ms auto-remove timeout
    await act(async () => {
      vi.advanceTimersByTime(4001);
    });

    expect(screen.queryByText('Success msg')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test('close button removes toast immediately', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(
      <TestWrapper>
        <ToastProvider>
          <TestConsumer />
        </ToastProvider>
      </TestWrapper>
    );

    await user.click(screen.getByText('success'));

    expect(screen.getByText('Success msg')).toBeInTheDocument();

    const closeButton = screen.getByRole('alert').querySelector('button');
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton!);

    expect(screen.queryByText('Success msg')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
