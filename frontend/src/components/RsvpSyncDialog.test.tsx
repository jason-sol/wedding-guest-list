import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RsvpSyncDialog from './RsvpSyncDialog';
import { TestWrapper } from '../test/TestWrapper';

vi.mock('../api', () => ({
  updateGuest: vi.fn().mockResolvedValue({
    id: 'g1',
    eventId: 'e1',
    firstName: 'John',
    lastName: 'Doe',
    familyId: null,
    tags: [],
    rsvp: 'accepted',
  }),
}));

import { updateGuest } from '../api';

const mockOtherEvents = [
  { id: 'event-2', name: 'Reception', guestId: 'guest-2' },
  { id: 'event-3', name: 'After Party', guestId: 'guest-3' },
];

describe('RsvpSyncDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders guest name and new RSVP status label', () => {
    render(
      <TestWrapper>
        <RsvpSyncDialog
          guestName="John Doe"
          newStatus="accepted"
          otherEvents={mockOtherEvents}
          onClose={vi.fn()}
          onSynced={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    expect(screen.getByText('Attending')).toBeInTheDocument();
  });

  test('renders all other events as checkboxes (all pre-selected)', () => {
    render(
      <TestWrapper>
        <RsvpSyncDialog
          guestName="John Doe"
          newStatus="pending"
          otherEvents={mockOtherEvents}
          onClose={vi.fn()}
          onSynced={vi.fn()}
        />
      </TestWrapper>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });

    expect(screen.getByText('Reception')).toBeInTheDocument();
    expect(screen.getByText('After Party')).toBeInTheDocument();
  });

  test('calls onSynced after applying', async () => {
    const user = userEvent.setup();
    const onSynced = vi.fn();

    render(
      <TestWrapper>
        <RsvpSyncDialog
          guestName="John Doe"
          newStatus="accepted"
          otherEvents={mockOtherEvents}
          onClose={vi.fn()}
          onSynced={onSynced}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(onSynced).toHaveBeenCalledTimes(1);
    });

    expect(updateGuest).toHaveBeenCalledWith('event-2', 'guest-2', { rsvp: 'accepted' });
    expect(updateGuest).toHaveBeenCalledWith('event-3', 'guest-3', { rsvp: 'accepted' });
  });

  test('calls onClose on "Skip" click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TestWrapper>
        <RsvpSyncDialog
          guestName="John Doe"
          newStatus="declined"
          otherEvents={mockOtherEvents}
          onClose={onClose}
          onSynced={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /skip/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('disables "Apply" when no events selected', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RsvpSyncDialog
          guestName="John Doe"
          newStatus="accepted"
          otherEvents={mockOtherEvents}
          onClose={vi.fn()}
          onSynced={vi.fn()}
        />
      </TestWrapper>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });
});
