/*
 * MainContent.jsx - Main Content Area with Session Protection Props Passthrough
 *
 * SESSION PROTECTION PASSTHROUGH:
 * ===============================
 *
 * This component serves as a passthrough layer for Session Protection functions:
 * - Receives session management functions from App.jsx
 * - Passes them down to ChatInterface.jsx
 *
 * No session protection logic is implemented here - it's purely a props bridge.
 */

import React, { useState, useEffect } from 'react';
import ChatInterface from './ChatInterface';
import FileTree from './FileTree';
import GitPanel from './GitPanel';
import ResizablePanels from './ResizablePanels';
import ErrorBoundary from './ErrorBoundary';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo';
import Tooltip from './Tooltip';
import { api } from '../utils/api';

function MainContent({
  selectedProject,
  selectedSession,
  activeTab,
  setActiveTab,
  ws,
  sendMessage,
  messages,
  isMobile,
  isPWA,
  onMenuClick,
  onSidebarToggle,
  isLoading,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onReplaceTemporarySession,
  onNavigateToSession,
  onShowSettings,         // Show tools settings panel
  autoExpandTools,        // Auto-expand tool accordions
  showRawParameters,      // Show raw parameters in tool accordions
  autoScrollToBottom,     // Auto-scroll to bottom when new messages arrive
  permissionMode,         // Global permission mode setting
  onPermissionModeChange, // Permission mode change handler
  }) {

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with menu button for mobile */}
        {isMobile && (
          <div
            className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 pwa-header-safe flex-shrink-0"
          >
            <button
              onClick={onMenuClick}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 pwa-menu-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="w-12 h-12 mx-auto mb-4">
              <div
                className="w-full h-full rounded-full border-4 border-gray-200 border-t-blue-500"
                style={{ animation: 'spin 1s linear infinite' }}
              ></div>
            </div>
            <p className="text-lg font-medium">Loading...</p>
            <p className="text-sm mt-2">Setting up your workspace</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with menu button for mobile */}
        {isMobile && (
          <div
            className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 pwa-header-safe flex-shrink-0"
          >
            <button
              onClick={onMenuClick}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 pwa-menu-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 dark:text-gray-400 max-w-md mx-4">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Project Selected
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select a project from the sidebar to get started with your development workspace.
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              <p>Choose an existing project or create a new one to begin using Claude Code.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ErrorBoundary>
        <ResizablePanels
          selectedProject={selectedProject}
          selectedSession={selectedSession}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          ws={ws}
          sendMessage={sendMessage}
          messages={messages}
          onInputFocusChange={onInputFocusChange}
          onSessionActive={onSessionActive}
          onSessionInactive={onSessionInactive}
          onReplaceTemporarySession={onReplaceTemporarySession}
          onNavigateToSession={onNavigateToSession}
          onShowSettings={onShowSettings}
          autoExpandTools={autoExpandTools}
          showRawParameters={showRawParameters}
          autoScrollToBottom={autoScrollToBottom}
          permissionMode={permissionMode}
          onPermissionModeChange={onPermissionModeChange}
            isMobile={isMobile}
          onMenuClick={onMenuClick}
          onSidebarToggle={onSidebarToggle}
        />
      </ErrorBoundary>
    </div>
  );
}

export default React.memo(MainContent);