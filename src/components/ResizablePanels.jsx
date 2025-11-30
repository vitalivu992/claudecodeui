import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import './ResizablePanels.css';
import FileTree from './FileTree';
import GitPanel from './GitPanel';
import ChatInterface from './ChatInterface';
import StandaloneShell from './StandaloneShell';
import ErrorBoundary from './ErrorBoundary';
import ClaudeLogo from './ClaudeLogo';
import CursorLogo from './CursorLogo';
import Tooltip from './Tooltip';
import FileEditor from './FileEditor';
import DiffViewer from './DiffViewer';

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
  permissionMode,
  onPermissionModeChange,
  isMobile,
  onMenuClick,
  onSidebarToggle,
  }) {
  const [leftActiveTab, setLeftActiveTab] = useState('files');
  const [rightActiveTab, setRightActiveTab] = useState('chat');
  const [editingFile, setEditingFile] = useState(null);
  const [diffFile, setDiffFile] = useState(null);
  const [diffContent, setDiffContent] = useState(null);

  const handleFileOpen = (filePath, diffInfo = null) => {
    // Create a file object that FileEditor expects
    const file = {
      name: filePath.split('/').pop(),
      path: filePath,
      projectName: selectedProject?.name,
      diffInfo: diffInfo // Pass along diff information if available
    };
    setEditingFile(file);
    setRightActiveTab('editor'); // Switch to editor tab when opening a file
  };

  const handleShowDiff = (filePath, diff) => {
    setDiffFile(filePath);
    setDiffContent(diff);
    setRightActiveTab('diff'); // Switch to diff tab when showing diff
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
            {/* Desktop Sidebar Toggle Button */}
            {!isMobile && (
              <Tooltip content="Toggle sidebar" side="bottom">
                <button
                  onClick={onSidebarToggle}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  title="Toggle sidebar (Ctrl+B)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </Tooltip>
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
                       rightActiveTab === 'chat' ? 'Chat' :
                       rightActiveTab === 'editor' ? (editingFile ? editingFile.name : 'Editor') :
                       rightActiveTab === 'diff' ? (diffFile ? `Diff: ${diffFile.split('/').pop()}` : 'Diff') :
                       rightActiveTab === 'terminal' ? 'Terminal' :
                       'Project'}
                    </h2>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {rightActiveTab === 'editor' && editingFile ?
                        editingFile.path :
                        rightActiveTab === 'diff' && diffFile ?
                        diffFile :
                        rightActiveTab === 'terminal' ?
                        `Shell in ${selectedProject.displayName}` :
                        selectedProject.displayName
                      }
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
                    <path d="M80 104a24 24 0 1 0 0-48 24 24 0 1 0 0 48zm80-24c0 32.8-19.7 61-48 73.3v87.8c18.8-10.9 40.7-17.1 64-17.1h96c35.3 0 64-28.7 64-64v-6.7C307.7 141 288 112.8 288 80c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V160c0 70.7-57.3 128-128 128H176c-35.3 0-64 28.7-64 64v6.7c28.3 12.3 48 40.5 48 73.3c0 44.2-35.8 80-80 80s-80-35.8-80-80c0-32.8 19.7-61 48-73.3V153.3C19.7 141 0 112.8 0 80C0 35.8 35.8 0 80 0s80 35.8 80 80zm208 24a24 24 0 1 0 0-48 24 24 0 1 0 0 48zM56 432a24 24 0 1 0 48 0 24 24 0 1 0 -48 0z"/>
                  </svg>
                  Source Control
                </button>
                              </div>

              {/* Left Panel Content */}
              <div className="panel-body">
                {leftActiveTab === 'files' && (
                  <div className="h-full">
                    <FileTree selectedProject={selectedProject} onFileOpen={handleFileOpen} />
                  </div>
                )}
                {leftActiveTab === 'git' && (
                  <div className="h-full">
                    <GitPanel selectedProject={selectedProject} isMobile={isMobile} onShowDiff={handleShowDiff} />
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
                  onClick={() => setRightActiveTab('editor')}
                  className={`panel-tab ${rightActiveTab === 'editor' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editor
                </button>
                <button
                  onClick={() => setRightActiveTab('diff')}
                  className={`panel-tab ${rightActiveTab === 'diff' ? 'active' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Diff
                </button>
                {!isMobile && (
                  <button
                    onClick={() => setRightActiveTab('terminal')}
                    className={`panel-tab ${rightActiveTab === 'terminal' ? 'active' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Terminal
                  </button>
                )}
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
                        permissionMode={permissionMode}
                        onPermissionModeChange={onPermissionModeChange}
                        sendByCtrlEnter={true}
                      />
                    </ErrorBoundary>
                  </div>
                )}
                {rightActiveTab === 'editor' && (
                  <div className="h-full">
                    {editingFile ? (
                      <ErrorBoundary showDetails={true}>
                        <FileEditor
                          file={editingFile}
                          projectPath={selectedProject?.path}
                        />
                      </ErrorBoundary>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h3 className="text-lg font-medium mb-2">No File Open</h3>
                          <p className="text-sm">Select a file from the file tree to open it in the editor</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {rightActiveTab === 'diff' && (
                  <div className="h-full">
                    {diffFile && diffContent ? (
                      <ErrorBoundary showDetails={true}>
                        <div className="h-full flex flex-col">
                          <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {diffFile}
                              </h3>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto">
                            <DiffViewer
                              diff={diffContent}
                              fileName={diffFile}
                              isMobile={isMobile}
                              wrapText={true}
                            />
                          </div>
                        </div>
                      </ErrorBoundary>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                          <p className="text-sm">Select a file from the Staged or Changes list to view its diff</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {rightActiveTab === 'terminal' && !isMobile && (
                  <div className="h-full">
                    <ErrorBoundary showDetails={true}>
                      <StandaloneShell
                        project={selectedProject}
                        session={null}
                        isActive={true}
                        isPlainShell={true}
                        autoConnect={false}
                        showHeader={false}
                      />
                    </ErrorBoundary>
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