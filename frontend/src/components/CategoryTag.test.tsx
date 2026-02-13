import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryTag, { getLuminance, shouldUseWhiteText, getContrastAdjustedColor } from './CategoryTag';
import { TestWrapper } from '../test/TestWrapper';

describe('CategoryTag', () => {
  test('renders category label text', () => {
    render(
      <TestWrapper>
        <CategoryTag category="Friends" />
      </TestWrapper>
    );

    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  test('applies background color from categoryInfo', () => {
    render(
      <TestWrapper>
        <CategoryTag
          category="VIP"
          categoryInfo={{ name: 'VIP', color: '#FF5733' }}
        />
      </TestWrapper>
    );

    const chip = screen.getByText('VIP').closest('.MuiChip-root');
    expect(chip).toHaveStyle({ backgroundColor: '#FF5733' });
  });

  test('uses white text on dark backgrounds', () => {
    render(
      <TestWrapper>
        <CategoryTag
          category="Navy"
          categoryInfo={{ name: 'Navy', color: '#000080' }}
        />
      </TestWrapper>
    );

    const chip = screen.getByText('Navy').closest('.MuiChip-root');
    expect(chip).toHaveStyle({ color: '#FFFFFF' });
  });

  test('uses dark text on light backgrounds', () => {
    render(
      <TestWrapper>
        <CategoryTag
          category="Yellow"
          categoryInfo={{ name: 'Yellow', color: '#FFFF00' }}
        />
      </TestWrapper>
    );

    const chip = screen.getByText('Yellow').closest('.MuiChip-root');
    expect(chip).toHaveStyle({ color: '#1E293B' });
  });

  test('shows delete button when removable=true with onRemove', () => {
    const onRemove = vi.fn();
    render(
      <TestWrapper>
        <CategoryTag category="Work" removable={true} onRemove={onRemove} />
      </TestWrapper>
    );

    const chip = screen.getByText('Work').closest('.MuiChip-root');
    const deleteIcon = chip?.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).toBeInTheDocument();
  });

  test('hides delete button when removable=false', () => {
    render(
      <TestWrapper>
        <CategoryTag category="Work" removable={false} />
      </TestWrapper>
    );

    const chip = screen.getByText('Work').closest('.MuiChip-root');
    const deleteIcon = chip?.querySelector('.MuiChip-deleteIcon');
    expect(deleteIcon).toBeNull();
  });

  test('calls onRemove when delete button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <TestWrapper>
        <CategoryTag category="Work" removable={true} onRemove={onRemove} />
      </TestWrapper>
    );

    const chip = screen.getByText('Work').closest('.MuiChip-root');
    const deleteIcon = chip?.querySelector('.MuiChip-deleteIcon') as HTMLElement;
    await user.click(deleteIcon);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('renders with default color when no categoryInfo provided', () => {
    render(
      <TestWrapper>
        <CategoryTag category="Default" />
      </TestWrapper>
    );

    const chip = screen.getByText('Default').closest('.MuiChip-root');
    expect(chip).toHaveStyle({ backgroundColor: '#4ECDC4' });
  });

  test('renders with size="medium"', () => {
    render(
      <TestWrapper>
        <CategoryTag category="Medium" size="medium" />
      </TestWrapper>
    );

    const chip = screen.getByText('Medium').closest('.MuiChip-root');
    expect(chip).toHaveClass('MuiChip-sizeMedium');
  });
});
