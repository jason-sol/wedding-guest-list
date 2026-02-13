import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCategoryModal from './AddCategoryModal';
import { TestWrapper } from '../test/TestWrapper';
import { CategoryInfo } from '../types';

vi.mock('../api', () => ({
  addCategory: vi.fn(),
  deleteCategory: vi.fn(),
  renameCategory: vi.fn(),
}));

import { addCategory, deleteCategory, renameCategory } from '../api';

const mockCategories: CategoryInfo[] = [
  { name: 'Family', color: '#FF6B6B' },
  { name: 'Friends', color: '#4ECDC4' },
  { name: 'Work', color: '#45B7D1' },
];

describe('AddCategoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders existing categories list', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Family')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  test('shows "No categories" message when empty', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={[]}
        />
      </TestWrapper>
    );

    expect(screen.getByText('No categories have been created yet.')).toBeInTheDocument();
  });

  test('shows category input field with label "New Category Name"', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    expect(screen.getByLabelText(/new category name/i)).toBeInTheDocument();
  });

  test('disables "Add Category" when input empty', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /add category/i })).toBeDisabled();
  });

  test('shows duplicate error when entering existing category name', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/new category name/i), 'Family');

    await waitFor(() => {
      expect(screen.getByText('This category already exists')).toBeInTheDocument();
    });
  });

  test('calls addCategory API on form submit', async () => {
    const user = userEvent.setup();
    const mockedAddCategory = vi.mocked(addCategory);
    mockedAddCategory.mockResolvedValue({ name: 'Neighbors', color: '#123456' });

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/new category name/i), 'Neighbors');
    await user.click(screen.getByRole('button', { name: /add category/i }));

    await waitFor(() => {
      expect(mockedAddCategory).toHaveBeenCalledWith('Neighbors');
    });
  });

  test('calls onSuccess after successful add', async () => {
    const user = userEvent.setup();
    const mockedAddCategory = vi.mocked(addCategory);
    mockedAddCategory.mockResolvedValue({ name: 'Neighbors', color: '#123456' });
    const onSuccess = vi.fn();

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={onSuccess}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    await user.type(screen.getByLabelText(/new category name/i), 'Neighbors');
    await user.click(screen.getByRole('button', { name: /add category/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  test('shows "View Categories" title in readOnly mode', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
          readOnly={true}
        />
      </TestWrapper>
    );

    expect(screen.getByText('View Categories')).toBeInTheDocument();
  });

  test('hides input and delete buttons in readOnly mode', () => {
    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
          readOnly={true}
        />
      </TestWrapper>
    );

    expect(screen.queryByLabelText(/new category name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add category/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete .* category/i)).not.toBeInTheDocument();
  });

  test('edit button enters rename mode with text field', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    const editButton = screen.getByLabelText('Edit Family category');
    await user.click(editButton);

    // In edit mode, a TextField should appear with the current category name
    const editInput = screen.getByDisplayValue('Family');
    expect(editInput).toBeInTheDocument();
  });

  test('calls renameCategory API on save edit', async () => {
    const user = userEvent.setup();
    const mockedRenameCategory = vi.mocked(renameCategory);
    mockedRenameCategory.mockResolvedValue({ name: 'Relatives', color: '#FF6B6B' });

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    const editButton = screen.getByLabelText('Edit Family category');
    await user.click(editButton);

    const editInput = screen.getByDisplayValue('Family');
    await user.clear(editInput);
    await user.type(editInput, 'Relatives');

    // Click the save (check) button
    const saveButton = screen.getByTestId('CheckIcon').closest('button');
    await user.click(saveButton!);

    await waitFor(() => {
      expect(mockedRenameCategory).toHaveBeenCalledWith('Family', 'Relatives');
    });
  });

  test('delete button calls deleteCategory API', async () => {
    const user = userEvent.setup();
    const mockedDeleteCategory = vi.mocked(deleteCategory);
    mockedDeleteCategory.mockResolvedValue(undefined);

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TestWrapper>
        <AddCategoryModal
          onClose={vi.fn()}
          onSuccess={vi.fn()}
          categories={mockCategories}
        />
      </TestWrapper>
    );

    const deleteButton = screen.getByLabelText('Delete Family category');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockedDeleteCategory).toHaveBeenCalledWith('Family');
    });

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
