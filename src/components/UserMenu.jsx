import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, ExternalLink, LogOut, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const UserMenu = ({ onShowSettings, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  const handleSettings = () => {
    onShowSettings();
    setIsOpen(false);
  };

  const handleHelp = () => {
    window.open('https://github.com/vitalivu992/claudecodeui', '_blank');
    setIsOpen(false);
  };

  // Get display name from user's full name or username
  const getDisplayName = (user) => {
    if (!user) return 'User';

    // Use full name from userInfo if available, otherwise fallback to username
    const displayName = user?.userInfo?.name || user?.username || '';

    if (!displayName) {
      return user?.username || 'User';
    }

    // If it contains commas, take the first part (usually the actual name)
    const nameParts = displayName.split(',');
    const primaryName = nameParts[0].trim();

    // If the display name is empty or just contains special characters, fallback to username
    if (!primaryName || primaryName.match(/^[,;&\s]*$/)) {
      return user?.username || 'User';
    }

    return primaryName;
  };

  // Generate avatar from user's full name or username
  const getInitials = (user) => {
    if (!user) return '?';

    // Use full name from userInfo if available, otherwise fallback to username
    const displayName = user?.userInfo?.name || user?.username || '';

    if (!displayName) {
      return user?.username?.slice(0, 2).toUpperCase() || '?';
    }

    // If it contains commas, take the first part (usually the actual name)
    const nameParts = displayName.split(',');
    const primaryName = nameParts[0].trim();

    // If there are spaces, take initials of first and last name
    if (primaryName.includes(' ')) {
      const words = primaryName.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
    }

    // Take first 2 characters of the name
    return primaryName.slice(0, 2).toUpperCase();
  };

  if (isMobile) {
    return (
      <div className="p-4 pb-20 border-t border-border/50">
        <div className="relative" ref={menuRef}>
          <button
            className="w-full h-16 bg-muted/50 hover:bg-muted/70 rounded-2xl flex items-center justify-start gap-4 px-4 active:scale-[0.98] transition-all duration-150"
            onClick={() => setIsOpen(!isOpen)}
          >
            <div className="w-12 h-12 rounded-2xl bg-background/80 flex items-center justify-center">
              <span className="text-xl font-bold text-foreground">
                {getInitials(user)}
              </span>
            </div>
            <div className="flex-1 text-left">
              <div className="text-xl font-bold text-foreground">
                {getDisplayName(user)}
              </div>
            </div>
            <ChevronUp
              className={`w-6 h-6 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-2xl shadow-lg overflow-hidden">
              <div className="py-2">
                {/* Settings */}
                <button
                  onClick={handleSettings}
                  className="w-full flex items-center gap-4 px-6 py-4 text-xl font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </button>

                {/* Help */}
                <button
                  onClick={handleHelp}
                  className="w-full flex items-center gap-4 px-6 py-4 text-xl font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Help
                </button>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-4 text-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="hidden md:flex w-full justify-start gap-2 p-2 h-auto font-normal text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200 rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-md bg-background/80 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold">
            {getInitials(user)}
          </span>
        </div>
        <span className="text-sm font-medium truncate">
          {getDisplayName(user)}
        </span>
        <ChevronUp
          className={`w-4 h-4 ml-auto transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-background dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-1">
            {/* Settings */}
            <button
              onClick={handleSettings}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Settings</span>
            </button>

            {/* Help */}
            <button
              onClick={handleHelp}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Help</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;