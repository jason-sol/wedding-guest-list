import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkRsvpModal from './BulkRsvpModal';
import { TestWrapper } from '../test/TestWrapper';
import { Guest } from '../types';

vi.mock('../api', () => ({
  bulkUpdateRsvp: vi.fn(),
}));

import { bulkUpdateRsvp } from '../api';

const mockGuests: Guest[] = [
  { id: 'g1', eventId: 'e1', firstName: 'John', lastName: 'Doe', familyId: null, tags: [] },
  { id: 'g2', eventId: 'e1', firstName: 'Jane', lastName: 'Smith', familyId: null, tags: [] },
  { id: 'g3', eventId: 'e1', firstName: 'Bob', lastName: 'Jones', familyId: null, tags: [] },
];

describe('BulkRsvpModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders guest count in info alert', () => {
    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('renders three RSVP toggle buttons', () => {
    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Attending')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  test('"Update All" button disabled until RSVP status selected', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /update all/i })).toBeDisabled();

    await user.click(screen.getByText('Attending'));

    expect(screen.getByRole('button', { name: /update all/i })).not.toBeDisabled();
  });

  test('calls bulkUpdateRsvp API with correct args on submit', async () => {
    const user = userEvent.setup();
    const mockedBulkUpdateRsvp = vi.mocked(bulkUpdateRsvp);
    mockedBulkUpdateRsvp.mockResolvedValue({
      updated: 3,
      guests: mockGuests,
    });
    const onSuccess = vi.fn();

    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Attending'));
    await user.click(screen.getByRole('button', { name: /update all/i }));

    await waitFor(() => {
      expect(mockedBulkUpdateRsvp).toHaveBeenCalledWith(
        'e1',
        ['g1', 'g2', 'g3'],
        'accepted'
      );
    });
  });

  test('calls onSuccess after successful update', async () => {
    const user = userEvent.setup();
    const mockedBulkUpdateRsvp = vi.mocked(bulkUpdateRsvp);
    mockedBulkUpdateRsvp.mockResolvedValue({
      updated: 3,
      guests: mockGuests,
    });
    const onSuccess = vi.fn();

    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Attending'));
    await user.click(screen.getByRole('button', { name: /update all/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  test('shows error alert on API failure', async () => {
    const user = userEvent.setup();
    const mockedBulkUpdateRsvp = vi.mocked(bulkUpdateRsvp);
    mockedBulkUpdateRsvp.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(screen.getByText('Attending'));
    await user.click(screen.getByRole('button', { name: /update all/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    const alerts = screen.getAllByRole('alert');
    const errorAlert = alerts.find(
      (alert) => alert.classList.contains('MuiAlert-standardError') || alert.classList.contains('MuiAlert-filledError')
    );
    expect(errorAlert).toBeInTheDocument();
  });

  test('calls onClose on "Cancel" click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TestWrapper>
        <BulkRsvpModal
          selectedGuests={mockGuests}
          eventId="e1"
          onClose={onClose}
          onSuccess={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
