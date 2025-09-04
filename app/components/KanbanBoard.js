'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanColumn from './KanbanColumn';
import { ExportIcon } from "@phosphor-icons/react";


export default function KanbanBoard({ board, alias, onAddTask, onMoveTask, onDeleteTask, savingTasks = new Set() }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(alias);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [deletedTask, setDeletedTask] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [copiedTask, setCopiedTask] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  // Check if current board is editable and get password
  const [isEditable, setIsEditable] = useState(() => {
    // Initialize based on URL parameters to avoid timing issues
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hasPassword = urlParams.has('pwd');
      const isNewBoard = urlParams.get('new') === 'true';
      return hasPassword && isNewBoard;
    }
    return false;
  });
  const [boardPassword, setBoardPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('pwd');
    }
    return null;
  });
  
  
  useEffect(() => {
    const checkBoardEditability = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const password = urlParams.get('pwd');
        const isNewBoard = urlParams.get('new') === 'true';
        
        if (password) {
          // If it's a new board creation, assume editable and set password
          if (isNewBoard) {
            setIsEditable(true);
            setBoardPassword(password);
            return;
          }
          
          // For existing boards, verify password with backend
          try {
            const response = await fetch(`/api/boards/${alias}/validate?pwd=${password}`);
            if (response.ok) {
              setIsEditable(true);
              setBoardPassword(password);
            } else {
              setIsEditable(false);
              setBoardPassword(null);
            }
          } catch (err) {
            console.error('Error validating password:', err);
            setIsEditable(false);
            setBoardPassword(null);
          }
        } else {
          // No password provided - check if board requires password
          try {
            const response = await fetch(`/api/boards/${alias}/editable`);
            const data = await response.json();
            setIsEditable(!data.requiresPassword);
            setBoardPassword(null);
          } catch (err) {
            console.error('Error checking board editability:', err);
            setIsEditable(false);
            setBoardPassword(null);
          }
        }
      }
    };
    
    if (alias) {
      checkBoardEditability();
    }
  }, [alias]);
  const router = useRouter();

  // Update current alias when alias prop changes
  useEffect(() => {
    setCurrentAlias(alias);
  }, [alias]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Undo functionality
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletedTask) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Share modal shortcuts
      if (showShareModal) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          e.preventDefault();
          if (e.shiftKey) {
            handleCopyEditableLink();
          } else {
            handleCopyReadOnlyLink();
          }
        } else if (e.key === 'Escape') {
          setShowShareModal(false);
        }
        return;
      }

      // Global copy shortcuts (when not in share modal)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !showShareModal) {
        e.preventDefault();
        
        if (selectedTask) {
          // Copy selected task (only on editable boards)
          if (isEditable) {
            setCopiedTask(selectedTask);
            showToast('Task copied');
          } else {
            showToast('Task copying not available on read-only boards');
          }
        } else {
          // Copy board link
          if (e.shiftKey) {
            const { link, password } = generateEditableLink();
            try {
              // Only set password if we don't already have one
              if (!boardPassword) {
                const response = await fetch(`/api/boards/${alias}/password`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ password }),
                });
                
                if (!response.ok) {
                  showToast('Failed to create editable link');
                  return;
                }
                
                setBoardPassword(password);
              }
              
              await copyToClipboard(link);
              showToast('Editable link copied');
            } catch (err) {
              console.error('Error creating editable link:', err);
              showToast('Failed to create editable link');
            }
          } else {
            await copyToClipboard(boardUrl);
            showToast('Board link copied');
          }
        }
        return;
      }

      // Global paste shortcut for tasks (only on editable boards)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedTask && !showShareModal && isEditable) {
        e.preventDefault();
        
        // Find which column the copied task is in to duplicate it there
        let targetColumn = 'todo'; // default
        for (const [columnId, column] of Object.entries(board.columns)) {
          if (column.tasks.some(t => t.id === copiedTask.id)) {
            targetColumn = columnId;
            break;
          }
        }
        
        try {
          await onAddTask(copiedTask.content || copiedTask.title, targetColumn);
          showToast('Task duplicated');
        } catch (err) {
          console.error('Failed to duplicate task:', err);
          showToast('Failed to duplicate task');
        }
        return;
      }

      // Escape to deselect task
      if (e.key === 'Escape' && selectedTask) {
        setSelectedTask(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletedTask, showShareModal, selectedTask, copiedTask, board, isEditable, boardPassword]);

  const boardUrl = `nokn.pro/${currentAlias}`;

  const handleAliasEdit = () => {
    setIsEditingAlias(true);
  };

  const handleAliasSubmit = async (e) => {
    e.preventDefault();
    const newAlias = currentAlias.trim().toLowerCase();
    
    if (newAlias && newAlias !== alias) {
      try {
        // Check if new alias is available
        const checkResponse = await fetch(`/api/boards/${newAlias}`);
        
        if (checkResponse.ok) {
          // Alias already exists
          showToast(`Alias "${newAlias}" is already taken. Please choose another.`);
          setCurrentAlias(alias); // Reset to original
          setIsEditingAlias(false);
          return;
        }
        
        // Create new board with same data and password
        const createResponse = await fetch(`/api/boards/${newAlias}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceAlias: alias,
            password: boardPassword,
            boardData: board
          }),
        });
        
        if (createResponse.ok) {
          // Navigate to new alias with same password
          const urlParams = boardPassword ? `?pwd=${boardPassword}` : '';
          router.push(`/${newAlias}${urlParams}`);
        } else {
          showToast('Failed to change alias. Please try again.');
          setCurrentAlias(alias);
        }
      } catch (err) {
        console.error('Error changing alias:', err);
        showToast('Failed to change alias. Please try again.');
        setCurrentAlias(alias);
      }
    }
    setIsEditingAlias(false);
  };

  const handleAliasKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAliasSubmit(e);
    } else if (e.key === 'Escape') {
      setCurrentAlias(alias);
      setIsEditingAlias(false);
    }
  };

  const generateEditableLink = () => {
    // Use existing password if available, otherwise generate new one
    const password = boardPassword || Math.random().toString(36).substring(2, 15);
    return { link: `${boardUrl}?pwd=${password}`, password };
  };

  const showToast = (message) => {
    setToastMessage(message);
    setShowCopied(true);
    setTimeout(() => {
      setShowCopied(false);
      setToastMessage('');
    }, 2000);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        console.error('Failed to copy to clipboard:', fallbackErr);
        return false;
      }
    }
  };

  const handleCopyReadOnlyLink = async () => {
    const success = await copyToClipboard(boardUrl);
    if (success) {
      showToast('Read-only link copied');
    }
    setShowShareModal(false);
  };

  const handleCopyEditableLink = async () => {
    const { link, password } = generateEditableLink();
    
    try {
      // Only set password if we don't already have one
      if (!boardPassword) {
        const response = await fetch(`/api/boards/${alias}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to set board password');
        }
        
        // Update local state with the password
        setBoardPassword(password);
      }
      
      const success = await copyToClipboard(link);
      if (success) {
        showToast('Editable link copied');
      }
    } catch (err) {
      console.error('Error creating editable link:', err);
      showToast('Failed to create editable link');
    }
    
    setShowShareModal(false);
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const handleDeleteTask = async (task) => {
    // Find which column the task belongs to
    let sourceColumn = null;
    let taskIndex = -1;
    
    for (const [columnId, column] of Object.entries(board.columns)) {
      const index = column.tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        sourceColumn = columnId;
        taskIndex = index;
        break;
      }
    }

    // Store the deleted task info for undo
    setDeletedTask({
      task,
      sourceColumn,
      taskIndex
    });

    // Clear any existing timer
    if (undoTimer) {
      clearTimeout(undoTimer);
    }

    // Delete immediately
    await onDeleteTask(task.id);

    // Set timer to clear the undo option after 5 seconds
    const timer = setTimeout(() => {
      setDeletedTask(null);
    }, 5000);
    
    setUndoTimer(timer);
  };

  const handleUndo = async () => {
    if (!deletedTask) return;

    // Clear the timer
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }

    // Re-add the task to its original position
    try {
      await onAddTask(deletedTask.task.content, deletedTask.sourceColumn);
      setDeletedTask(null);
    } catch (err) {
      console.error('Failed to undo task deletion:', err);
    }
  };

  const handleDismissUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    setDeletedTask(null);
  };

  const handleDragStart = (task, sourceColumnId) => {
    setDraggedTask(task);
    setDraggedFromColumn(sourceColumnId);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedFromColumn(null);
  };

  const handleDrop = (destinationColumnId, destinationIndex) => {
    if (draggedTask && draggedFromColumn) {
      onMoveTask(
        draggedTask.id,
        draggedFromColumn,
        destinationColumnId,
        destinationIndex
      );
    }
  };

  const getTaskCount = (columnId) => {
    return board?.columns[columnId]?.tasks.length || 0;
  };

  const Modern3dKbd = ({ children, onClick }) => (
    <kbd 
      onClick={onClick}
      className="transform-gpu cursor-pointer rounded-[16px] border border-neutral-500/50 bg-neutral-300 shadow-[-10px_0px_15px_rgba(255,255,255,1),3px_10px_12.5px_rgba(0,0,0,0.1)] outline-hidden transition-all duration-150 active:shadow-none dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-[-10px_0px_15px_rgba(0,0,0,0.3),3px_10px_12.5px_rgba(255,255,255,0.05)]"
    >
      <span className="-translate-y-1 z-10 block size-full transform-gpu rounded-[15px] bg-neutral-100 px-3 py-1 text-neutral-500 shadow-[inset_0px_2px_4px_rgba(255,255,255,0.8)] transition-all duration-150 active:translate-y-0 active:shadow-transparent dark:bg-neutral-800 dark:text-neutral-300 dark:shadow-[inset_0px_2px_4px_rgba(255,255,255,0.05)]">
        {children}
      </span>
    </kbd>
  );

  const handleBoardClick = () => {
    // Deselect task when clicking on board background
    if (selectedTask) {
      setSelectedTask(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" onClick={handleBoardClick}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl font-bold text-gray-900 mr-1">nokn.pro/</span>
            {isEditingAlias ? (
              <form onSubmit={handleAliasSubmit} className="inline-flex">
                <input
                  type="text"
                  value={currentAlias}
                  onChange={(e) => setCurrentAlias(e.target.value)}
                  onKeyDown={handleAliasKeyDown}
                  onBlur={handleAliasSubmit}
                  className="text-3xl font-bold text-blue-600 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-700 min-w-0"
                  style={{ width: `${Math.max(currentAlias.length, 8)}ch` }}
                  pattern="[a-zA-Z0-9_-]+"
                  title="Only letters, numbers, underscores and hyphens are allowed"
                  autoFocus
                />
              </form>
            ) : (
              <button
                onClick={handleAliasEdit}
                className="text-3xl font-bold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 -mx-1 transition-colors"
                title="Click to edit alias"
              >
                {currentAlias}
              </button>
            )}
          </div>
          <button
            onClick={handleShareClick}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            title="Share board URL"
          >
            <ExportIcon size={20} />
            
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className='text-sm font-light text-gray-400'>Track your tasks quickly without ever signing up</p>
          {!isEditable && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Read-only view
            </span>
          )}
        </div>
        {/* <p className='text-xs font-light text-gray-400 mt-1'>
          Contribute and increase the{' '}
          <a 
            href="https://github.com/justinbenito/nokanban" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            ⭐ GitHub stars
          </a>
        </p> */}

      </div>

      {/* Board Content */}
      <div className="p-4 sm:p-6">
        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-6">
            <KanbanColumn
              column={board?.columns.todo}
              title="To-do"
              count={getTaskCount('todo')}
              onAddTask={isEditable ? (content) => onAddTask(content, 'todo') : null}
              onDeleteTask={isEditable ? handleDeleteTask : null}
              onDragStart={isEditable ? handleDragStart : null}
              onDragEnd={handleDragEnd}
              onDrop={isEditable ? (index) => handleDrop('todo', index) : null}
              isDragActive={draggedTask !== null}
              savingTasks={savingTasks}
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
              isReadOnly={!isEditable}
            />
            <KanbanColumn
              column={board?.columns.inprogress}
              title="In Progress"
              count={getTaskCount('inprogress')}
              onAddTask={isEditable ? (content) => onAddTask(content, 'inprogress') : null}
              onDeleteTask={isEditable ? handleDeleteTask : null}
              onDragStart={isEditable ? handleDragStart : null}
              onDragEnd={handleDragEnd}
              onDrop={isEditable ? (index) => handleDrop('inprogress', index) : null}
              isDragActive={draggedTask !== null}
              isProgressColumn={true}
              savingTasks={savingTasks}
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
              isReadOnly={!isEditable}
            />
            <KanbanColumn
              column={board?.columns.complete}
              title="Complete"
              count={getTaskCount('complete')}
              onAddTask={isEditable ? (content) => onAddTask(content, 'complete') : null}
              onDeleteTask={isEditable ? handleDeleteTask : null}
              onDragStart={isEditable ? handleDragStart : null}
              onDragEnd={handleDragEnd}
              onDrop={isEditable ? (index) => handleDrop('complete', index) : null}
              isDragActive={draggedTask !== null}
              isCompleteColumn={true}
              savingTasks={savingTasks}
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
              isReadOnly={!isEditable}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-[calc(100vh-8rem)] flex flex-col justify-between gap-4">
          <KanbanColumn
            column={board?.columns.todo}
            title="To-do"
            count={getTaskCount('todo')}
            onAddTask={isEditable ? (content) => onAddTask(content, 'todo') : null}
            onDeleteTask={isEditable ? handleDeleteTask : null}
            onDragStart={isEditable ? handleDragStart : null}
            onDragEnd={handleDragEnd}
            onDrop={isEditable ? (index) => handleDrop('todo', index) : null}
            isDragActive={draggedTask !== null}
            isMobile={true}
            savingTasks={savingTasks}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
            isReadOnly={!isEditable}
          />
          <KanbanColumn
            column={board?.columns.inprogress}
            title="In Progress"
            count={getTaskCount('inprogress')}
            onAddTask={isEditable ? (content) => onAddTask(content, 'inprogress') : null}
            onDeleteTask={isEditable ? handleDeleteTask : null}
            onDragStart={isEditable ? handleDragStart : null}
            onDragEnd={handleDragEnd}
            onDrop={isEditable ? (index) => handleDrop('inprogress', index) : null}
            isDragActive={draggedTask !== null}
            isProgressColumn={true}
            isMobile={true}
            savingTasks={savingTasks}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
            isReadOnly={!isEditable}
          />
          <KanbanColumn
            column={board?.columns.complete}
            title="Complete"
            count={getTaskCount('complete')}
            onAddTask={isEditable ? (content) => onAddTask(content, 'complete') : null}
            onDeleteTask={isEditable ? handleDeleteTask : null}
            onDragStart={isEditable ? handleDragStart : null}
            onDragEnd={handleDragEnd}
            onDrop={isEditable ? (index) => handleDrop('complete', index) : null}
            isDragActive={draggedTask !== null}
            isCompleteColumn={true}
            isMobile={true}
            savingTasks={savingTasks}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
            isReadOnly={!isEditable}
          />
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-gray-300 p-6 max-w-md w-full mx-4 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Share Your Board</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">Choose what you want to share:</p>
            
            {/* Horizontal Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Read-only Link */}
              <div 
                onClick={handleCopyReadOnlyLink}
                className="flex flex-col p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-center"
              >
                <h4 className="font-medium text-gray-900 mb-2">Read-only Link</h4>
                <p className="text-sm text-gray-500 mb-3">Others can view but not edit</p>
                <p className="text-xs text-gray-400 font-mono truncate mb-3">{boardUrl}</p>
                <div className="flex justify-center">
                  <Modern3dKbd onClick={handleCopyReadOnlyLink}>
                    <span className="flex items-center gap-1">
                      <span>⌘</span>
                      <span className="font-medium text-xs">C</span>
                    </span>
                  </Modern3dKbd>
                </div>
              </div>

              {/* Editable Link */}
              <div 
                onClick={handleCopyEditableLink}
                className="flex flex-col p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-center"
              >
                <h4 className="font-medium text-gray-900 mb-2">Editable Link</h4>
                <p className="text-sm text-gray-500 mb-3">Others can view and edit tasks</p>
                <p className="text-xs text-gray-400 font-mono truncate mb-3">{generateEditableLink().link}</p>
                <div className="flex justify-center">
                  <Modern3dKbd onClick={handleCopyEditableLink}>
                    <span className="flex items-center gap-1">
                      <span>⌘</span>
                      <span className="font-medium text-xs justify-center">shift</span>
                      <span className="font-medium text-xs">C</span>
                    </span>
                  </Modern3dKbd>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-400 text-center">
              Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-gray-600">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showCopied && (
        <div className={`fixed right-4 bg-green-600 text-white px-4 py-3 rounded-lg border border-gray-400 flex items-center gap-2 z-50 animate-slide-up ${deletedTask ? 'bottom-20' : 'bottom-4'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{toastMessage || 'Copied!'}</span>
        </div>
      )}

      {/* Undo Toast */}
      {deletedTask && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg border border-gray-400 flex items-center gap-3 z-50 animate-slide-up">
          <span className="text-sm">Task deleted</span>
          <button
            onClick={handleUndo}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1"
          >
            Undo
            <span className="text-xs opacity-75">
              {navigator.platform.includes('Mac') ? '⌘Z' : 'Ctrl+Z'}
            </span>
          </button>
          <button
            onClick={handleDismissUndo}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div> 
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 px-4 sm:px-6">
        <div className="text-center text-sm text-gray-500">
          Built with <span className="text-red-500">♥</span> from{' '}
          <span className="font-medium text-gray-700">Justin</span>
          {' '}<span className="text-gray-400">×</span>{' '}
          <a 
            href="https://limegreen.studio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-lime-600 hover:text-lime-700 font-medium transition-colors"
          >
            Lime Green Studios
          </a>
        </div>
      </footer>
    </div>
  );
}