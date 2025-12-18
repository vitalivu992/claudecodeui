import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = () => {
    // Cycle through themes: light -> dark -> system -> light
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
      default:
        return '💻';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'System';
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <button
        onClick={handleThemeChange}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:focus:ring-blue-400 transition-colors duration-200 flex items-center justify-center space-x-2"
        aria-label={`Current theme: ${getThemeLabel()}. Click to change theme.`}
      >
        <span className="text-lg">{getThemeIcon()}</span>
        <span>{getThemeLabel()}</span>
      </button>
    </div>
  );
}

export default ThemeToggle;
