import React, { useState, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, Decoration } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { Save, Download, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

function FileEditor({ file, projectPath }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDiff, setShowDiff] = useState(!!file.diffInfo);
  const [wordWrap, setWordWrap] = useState(false);

  // Create diff highlighting
  const diffEffect = StateEffect.define();

  const diffField = StateField.define({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      decorations = decorations.map(tr.changes);

      for (let effect of tr.effects) {
        if (effect.is(diffEffect)) {
          decorations = effect.value;
        }
      }
      return decorations;
    },
    provide: f => EditorView.decorations.from(f)
  });

  const createDiffDecorations = (content, diffInfo) => {
    if (!diffInfo || !showDiff) return Decoration.none;

    const builder = new RangeSetBuilder();
    const lines = content.split('\n');
    const oldLines = diffInfo.old_string.split('\n');

    // Find the line where the old content starts
    let startLineIndex = -1;
    for (let i = 0; i <= lines.length - oldLines.length; i++) {
      let matches = true;
      for (let j = 0; j < oldLines.length; j++) {
        if (lines[i + j] !== oldLines[j]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        startLineIndex = i;
        break;
      }
    }

    if (startLineIndex >= 0) {
      let pos = 0;
      // Calculate position to start of old content
      for (let i = 0; i < startLineIndex; i++) {
        pos += lines[i].length + 1; // +1 for newline
      }

      // Highlight old lines (to be removed)
      for (let i = 0; i < oldLines.length; i++) {
        const lineStart = pos;
        const lineEnd = pos + oldLines[i].length;
        builder.add(lineStart, lineEnd, Decoration.line({
          class: isDarkMode ? 'diff-removed-dark' : 'diff-removed-light'
        }));
        pos += oldLines[i].length + 1;
      }
    }

    return builder.finish();
  };

  // Diff decoration theme
  const diffTheme = EditorView.theme({
    '.diff-removed-light': {
      backgroundColor: '#fef2f2',
      borderLeft: '3px solid #ef4444'
    },
    '.diff-removed-dark': {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderLeft: '3px solid #ef4444'
    },
    '.diff-added-light': {
      backgroundColor: '#f0fdf4',
      borderLeft: '3px solid #22c55e'
    },
    '.diff-added-dark': {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderLeft: '3px solid #22c55e'
    }
  });

  // Get language extension based on file extension
  const getLanguageExtension = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return [javascript({ jsx: true, typescript: ext.includes('ts') })];
      case 'py':
        return [python()];
      case 'html':
      case 'htm':
        return [html()];
      case 'css':
      case 'scss':
      case 'less':
        return [css()];
      case 'json':
        return [json()];
      case 'md':
      case 'markdown':
        return [markdown()];
      default:
        return [];
    }
  };

  // Load file content
  useEffect(() => {
    const loadFileContent = async () => {
      try {
        setLoading(true);

        const response = await api.readFile(file.projectName, file.path);

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setContent(data.content);
      } catch (error) {
        console.error('Error loading file:', error);
        setContent(`// Error loading file: ${error.message}\n// File: ${file.name}\n// Path: ${file.path}`);
      } finally {
        setLoading(false);
      }
    };

    loadFileContent();
  }, [file, projectPath]);

  // Update diff decorations when content or diff info changes
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && content && file.diffInfo && showDiff) {
      const decorations = createDiffDecorations(content, file.diffInfo);
      const view = editorRef.current.view;
      if (view) {
        view.dispatch({
          effects: diffEffect.of(decorations)
        });
      }
    }
  }, [content, file.diffInfo, showDiff, isDarkMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.saveFile(file.projectName, file.path, content);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Save failed: ${response.status}`);
      }

      const result = await response.json();

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000); // Hide after 2 seconds

    } catch (error) {
      console.error('Error saving file:', error);
      alert(`Error saving file: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-900 dark:text-white">Loading {file.name}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-mono">
              {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">{file.name}</h3>
              {file.diffInfo && (
                <span className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 px-2 py-1 rounded whitespace-nowrap">
                  📝 Has changes
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{file.path}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {file.diffInfo && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title={showDiff ? "Hide diff highlighting" : "Show diff highlighting"}
            >
              {showDiff ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${
              wordWrap
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <span className="text-sm font-mono font-bold">↵</span>
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Toggle theme"
          >
            <span className="text-lg">{isDarkMode ? '☀️' : '🌙'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Download file"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-3 py-2 text-white rounded-md disabled:opacity-50 flex items-center gap-2 transition-colors ${
              saveSuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {saveSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={content}
          onChange={setContent}
          extensions={[
            ...getLanguageExtension(file.name),
            diffField,
            diffTheme,
            ...(wordWrap ? [EditorView.lineWrapping] : [])
          ]}
          theme={isDarkMode ? oneDark : undefined}
          height="100%"
          style={{
            fontSize: '14px',
            height: '100%',
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightSelectionMatches: true,
            searchKeymap: true,
          }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Lines: {content.split('\n').length}</span>
          <span>Characters: {content.length}</span>
          <span>Language: {file.name.split('.').pop()?.toUpperCase() || 'Text'}</span>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          Press Ctrl+S to save
        </div>
      </div>
    </div>
  );
}

export default FileEditor;