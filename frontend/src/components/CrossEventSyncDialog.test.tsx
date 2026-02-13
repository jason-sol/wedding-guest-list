import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrossEventSyncDialog from './CrossEventSyncDialog';
import { TestWrapper } from '../test/TestWrapper';

const mockEvents = [
  { id: 'event-1', name: 'Wedding Ceremony' },
  { id: 'event-2', name: 'Reception' },
  { id: 'event-3', name: 'After Party' },
];

describe('CrossEventSyncDialog', () => {
  test('renders title and description', () => {
    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync Deletion"
          description="Also delete this guest from other events?"
          events={mockEvents}
          onApply={vi.fn()}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Sync Deletion')).toBeInTheDocument();
    expect(screen.getByText('Also delete this guest from other events?')).toBeInTheDocument();
  });

  test('renders all events as checkboxes (all pre-selected)', () => {
    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={vi.fn()}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });

    expect(screen.getByText('Wedding Ceremony')).toBeInTheDocument();
    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('After Party')).toBeInTheDocument();
  });

  test('unchecking an event deselects it', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={vi.fn()}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  test('calls onApply with selected event IDs on "Apply" click', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={onApply}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    // Uncheck the first event
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await user.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });

    const calledWith = onApply.mock.calls[0][0] as string[];
    expect(calledWith).toContain('event-2');
    expect(calledWith).toContain('event-3');
    expect(calledWith).not.toContain('event-1');
  });

  test('calls onSkip on "Skip" click', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={vi.fn()}
          onSkip={onSkip}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /skip/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  test('disables "Apply" button when no events selected', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={vi.fn()}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('shows spinner during apply', async () => {
    const user = userEvent.setup();
    let resolveApply: () => void;
    const applyPromise = new Promise<void>((resolve) => {
      resolveApply = resolve;
    });
    const onApply = vi.fn().mockReturnValue(applyPromise);

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={onApply}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolveApply!();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  test('disables checkboxes during syncing', async () => {
    const user = userEvent.setup();
    let resolveApply: () => void;
    const applyPromise = new Promise<void>((resolve) => {
      resolveApply = resolve;
    });
    const onApply = vi.fn().mockReturnValue(applyPromise);

    render(
      <TestWrapper>
        <CrossEventSyncDialog
          title="Sync"
          description="Sync across events"
          events={mockEvents}
          onApply={onApply}
          onSkip={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });

    resolveApply!();
    await waitFor(() => {
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeDisabled();
      });
    });
  });
});
