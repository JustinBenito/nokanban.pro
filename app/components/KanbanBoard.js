'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanColumn from './KanbanColumn';
import { ExportIcon } from "@phosphor-icons/react";


export default function KanbanBoard({ board, alias, onAddTask, onMoveTask, onDeleteTask }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(alias);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [deletedTask, setDeletedTask] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const router = useRouter();

  // Update current alias when alias prop changes
  useEffect(() => {
    setCurrentAlias(alias);
  }, [alias]);

  // Keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletedTask) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletedTask]);

  const boardUrl = `nokn.pro/${currentAlias}`;

  const handleAliasEdit = () => {
    setIsEditingAlias(true);
  };

  const handleAliasSubmit = (e) => {
    e.preventDefault();
    if (currentAlias.trim() && currentAlias !== alias) {
      // Navigate to the new alias
      router.push(`/${currentAlias.trim().toLowerCase()}`);
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(boardUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = boardUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
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
            onClick={handleCopyUrl}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            title="Share board URL"
          >
            <ExportIcon size={24} />
            Share
          </button>
        </div>
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
              onAddTask={(content) => onAddTask(content, 'todo')}
              onDeleteTask={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={(index) => handleDrop('todo', index)}
              isDragActive={draggedTask !== null}
            />
            <KanbanColumn
              column={board?.columns.inprogress}
              title="In Progress"
              count={getTaskCount('inprogress')}
              onAddTask={(content) => onAddTask(content, 'inprogress')}
              onDeleteTask={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={(index) => handleDrop('inprogress', index)}
              isDragActive={draggedTask !== null}
              isProgressColumn={true}
            />
            <KanbanColumn
              column={board?.columns.complete}
              title="Complete"
              count={getTaskCount('complete')}
              onAddTask={(content) => onAddTask(content, 'complete')}
              onDeleteTask={handleDeleteTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={(index) => handleDrop('complete', index)}
              isDragActive={draggedTask !== null}
              isCompleteColumn={true}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden h-[calc(100vh-8rem)] flex flex-col justify-between gap-4">
          <KanbanColumn
            column={board?.columns.todo}
            title="To-do"
            count={getTaskCount('todo')}
            onAddTask={(content) => onAddTask(content, 'todo')}
            onDeleteTask={onDeleteTask}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={(index) => handleDrop('todo', index)}
            isDragActive={draggedTask !== null}
            isMobile={true}
          />
          <KanbanColumn
            column={board?.columns.inprogress}
            title="In Progress"
            count={getTaskCount('inprogress')}
            onAddTask={(content) => onAddTask(content, 'inprogress')}
            onDeleteTask={onDeleteTask}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={(index) => handleDrop('inprogress', index)}
            isDragActive={draggedTask !== null}
            isProgressColumn={true}
            isMobile={true}
          />
          <KanbanColumn
            column={board?.columns.complete}
            title="Complete"
            count={getTaskCount('complete')}
            onAddTask={(content) => onAddTask(content, 'complete')}
            onDeleteTask={onDeleteTask}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={(index) => handleDrop('complete', index)}
            isDragActive={draggedTask !== null}
            isCompleteColumn={true}
            isMobile={true}
          />
        </div>
      </div>

      {/* Share Toast */}
      {showCopied && (
        <div className={`fixed right-4 bg-green-600 text-white px-4 py-3 rounded-lg border border-gray-400 flex items-center gap-2 z-50 animate-slide-up ${deletedTask ? 'bottom-20' : 'bottom-4'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">Copied!</span>
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
    </div>
  );
}