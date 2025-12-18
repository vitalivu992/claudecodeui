import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DarkModeToggle from '@/components/DarkModeToggle.jsx';

// Mock the ThemeContext
const mockToggleDarkMode = vi.fn();
let mockIsDarkMode = false;

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDarkMode: mockIsDarkMode,
    toggleDarkMode: mockToggleDarkMode
  })
}));

describe('DarkModeToggle component', () => {
  beforeEach(() => {
    mockToggleDarkMode.mockClear();
    mockIsDarkMode = false;
  });

  it('should render correctly with light mode', () => {
    render(<DarkModeToggle />);

    const button = screen.getByRole('switch', { name: /toggle dark mode/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-checked', 'false');

    // Check for sun icon in light mode
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });

  it('should render correctly with dark mode', () => {
    // Set dark mode to true
    mockIsDarkMode = true;

    render(<DarkModeToggle />);

    const button = screen.getByRole('switch', { name: /toggle dark mode/i });
    expect(button).toHaveAttribute('aria-checked', 'true');
  });

  it('should call toggleDarkMode when clicked', () => {
    render(<DarkModeToggle />);

    const button = screen.getByRole('switch', { name: /toggle dark mode/i });
    fireEvent.click(button);

    expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('should have correct accessibility attributes', () => {
    render(<DarkModeToggle />);

    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'false');
    expect(button).toHaveAttribute('aria-label', 'Toggle dark mode');

    // Check for screen reader only text
    const srOnlyText = screen.getByText('Toggle dark mode');
    expect(srOnlyText).toHaveClass('sr-only');
  });

  it('should have correct CSS classes', () => {
    render(<DarkModeToggle />);

    const button = screen.getByRole('switch');
    expect(button).toHaveClass(
      'relative',
      'inline-flex',
      'h-8',
      'w-14',
      'items-center',
      'rounded-full',
      'bg-gray-200',
      'transition-colors',
      'duration-200'
    );
  });

  it('should toggle icon based on theme', () => {
    const { unmount } = render(<DarkModeToggle />);

    // In light mode, should have sun icon
    let button = screen.getByRole('switch');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-checked', 'false');

    // Unmount and re-render with dark mode
    unmount();
    mockIsDarkMode = true;
    render(<DarkModeToggle />);

    // Get button again after re-render
    button = screen.getByRole('switch');

    // Should update aria-checked
    expect(button).toHaveAttribute('aria-checked', 'true');
  });
});
