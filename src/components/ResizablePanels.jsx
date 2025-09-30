import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './ResizablePanels.css';
import FileTree from './FileTree';
import GitPanel from './GitPanel';
import ChatInterface from './ChatInterface';
import StandaloneShell from './StandaloneShell';
import TaskList from './TaskList';
import ErrorBoundary from './ErrorBoundary';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo';
import Tooltip from './Tooltip';

function ResizablePanels({
  selectedProject,
  selectedSession,
  ws,
  sendMessage,
  messages,
  onFileOpen,
  onInputFocusChange,
  onSessionActive,
  onSessionInactive,
  onReplaceTemporarySession,
  onNavigateToSession,
  onShowSettings,
  autoExpandTools,
  showRawParameters,
  autoScrollToBottom,
  sendByCtrlEnter,
  isMobile,
  onMenuClick,
  shouldShowTasksTab,
  tasks,
  currentProject,
  refreshTasks,
  existingPRDs,
  onTaskClick,
  onShowPRDEditor,
  onRefreshPRDs
}) {
  const [leftActiveTab, setLeftActiveTab] = useState('files');
  const [rightActiveTab, setRightActiveTab] = useState('chat');

  const handleFileOpen = (filePath, diffInfo = null) => {
    // Create a file object that CodeEditor expects
    const file = {
      name: filePath.split('/').pop(),
      path: filePath,
      projectName: selectedProject?.name,
      diffInfo: diffInfo // Pass along diff information if available
    };
    onFileOpen(file);
  };

  const handleTaskClick = (task) => {
    // If task is just an ID (from dependency click), find the full task object
    if (typeof task === 'object' && task.id && !task.title) {
      const fullTask = tasks?.find(t => t.id === task.id);
      if (fullTask) {
        onTaskClick(fullTask);
      }
    } else {
      onTaskClick(task);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with project info and mobile menu */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 pwa-header-safe flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isMobile && (
              <button
                onClick={onMenuClick}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onMenuClick();
                }}
                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation active:scale-95 pwa-menu-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <div className="min-w-0 flex items-center gap-2">
              {rightActiveTab === 'chat' && selectedSession && (
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {selectedSession.__provider === 'cursor' ? (
                    <CursorLogo className="w-5 h-5" />
                  ) : (
                    <ClaudeLogo className="w-5 h-5" />
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {rightActiveTab === 'chat' && selectedSession ? (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {selectedSession.__provider === 'cursor' ? (selectedSession.name || 'Untitled Session') : (selectedSession.summary || 'New Session')}
                    </h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedProject.displayName} <span className="hidden sm:inline">• {selectedSession.id}</span>
                    </div>
                  </div>
                ) : rightActiveTab === 'chat' && !selectedSession ? (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      New Session
                    </h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedProject.displayName}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      {leftActiveTab === 'files' ? 'Project Files' :
                       leftActiveTab === 'git' ? 'Source Control' :
                       (leftActiveTab === 'tasks' && shouldShowTasksTab) ? 'TaskMaster' :
                       rightActiveTab === 'chat' ? 'Chat' :
                       rightActiveTab === 'shell' ? 'Shell' :
                       'Project'}
                    </h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {selectedProject.displayName}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resizable Panels */}
      <div className="flex-1 panel-content">
        <PanelGroup direction="horizontal" className="panel-group">
          {/* Left Panel */}
          <Panel defaultSize={30} minSize={20} maxSize={50} className="panel panel-left">
            <div className="panel-content bg-white dark:bg-gray-900">
              {/* Left Panel Tabs */}
              <div className="panel-tabs">
                <button
                  onClick={() => setLeftActiveTab('files')}
                  className={`panel-tab ${leftActiveTab === 'files' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Files
                </button>
                <button
                  onClick={() => setLeftActiveTab('git')}
                  className={`panel-tab ${leftActiveTab === 'git' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Source Control
                </button>
                {shouldShowTasksTab && (
                  <button
                    onClick={() => setLeftActiveTab('tasks')}
                    className={`panel-tab ${leftActiveTab === 'tasks' ? 'active' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Tasks
                  </button>
                )}
              </div>

              {/* Left Panel Content */}
              <div className="panel-body">
                {leftActiveTab === 'files' && (
                  <div className="h-full">
                    <FileTree selectedProject={selectedProject} />
                  </div>
                )}
                {leftActiveTab === 'git' && (
                  <div className="h-full">
                    <GitPanel selectedProject={selectedProject} isMobile={isMobile} />
                  </div>
                )}
                {shouldShowTasksTab && leftActiveTab === 'tasks' && (
                  <div className="h-full flex flex-col">
                    <TaskList
                      tasks={tasks || []}
                      onTaskClick={handleTaskClick}
                      showParentTasks={true}
                      className="flex-1 overflow-y-auto"
                      currentProject={currentProject}
                      onTaskCreated={refreshTasks}
                      onShowPRDEditor={onShowPRDEditor}
                      existingPRDs={existingPRDs}
                      onRefreshPRDs={onRefreshPRDs}
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="panel-resize-handle" />

          {/* Right Panel */}
          <Panel defaultSize={70} minSize={50} className="panel panel-right">
            <div className="panel-content bg-white dark:bg-gray-900">
              {/* Right Panel Tabs */}
              <div className="panel-tabs">
                <button
                  onClick={() => setRightActiveTab('chat')}
                  className={`panel-tab ${rightActiveTab === 'chat' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat
                </button>
                <button
                  onClick={() => setRightActiveTab('shell')}
                  className={`panel-tab ${rightActiveTab === 'shell' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Shell
                </button>
              </div>

              {/* Right Panel Content */}
              <div className="panel-body">
                {rightActiveTab === 'chat' && (
                  <div className="h-full">
                    <ErrorBoundary showDetails={true}>
                      <ChatInterface
                        selectedProject={selectedProject}
                        selectedSession={selectedSession}
                        ws={ws}
                        sendMessage={sendMessage}
                        messages={messages}
                        onFileOpen={handleFileOpen}
                        onInputFocusChange={onInputFocusChange}
                        onSessionActive={onSessionActive}
                        onSessionInactive={onSessionInactive}
                        onReplaceTemporarySession={onReplaceTemporarySession}
                        onNavigateToSession={onNavigateToSession}
                        onShowSettings={onShowSettings}
                        autoExpandTools={autoExpandTools}
                        showRawParameters={showRawParameters}
                        autoScrollToBottom={autoScrollToBottom}
                        sendByCtrlEnter={sendByCtrlEnter}
                      />
                    </ErrorBoundary>
                  </div>
                )}
                {rightActiveTab === 'shell' && (
                  <div className="h-full">
                    <StandaloneShell
                      project={selectedProject}
                      session={selectedSession}
                      isActive={true}
                      showHeader={false}
                    />
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default ResizablePanels;