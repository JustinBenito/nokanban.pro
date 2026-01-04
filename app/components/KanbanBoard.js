'use client';

import { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard({ board, alias, onAddTask, onMoveTask, onDeleteTask }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState(null);
  const [deletedTask, setDeletedTask] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [copiedTask, setCopiedTask] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Undo functionality
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && deletedTask) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Copy selected task
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedTask) {
        e.preventDefault();
        setCopiedTask(selectedTask);
        showToast('Task copied');
        return;
      }

      // Paste copied task
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedTask) {
        e.preventDefault();

        // Find which column the copied task is in to duplicate it there
        let targetColumn = 'todo';
        for (const [columnId, column] of Object.entries(board.columns)) {
          if (column.tasks.some(t => t.id === copiedTask.id)) {
            targetColumn = columnId;
            break;
          }
        }

        onAddTask(copiedTask.content, targetColumn);
        showToast('Task duplicated');
        return;
      }

      // Escape to deselect task
      if (e.key === 'Escape' && selectedTask) {
        setSelectedTask(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deletedTask, selectedTask, copiedTask, board, onAddTask]);

  const showToast = (message) => {
    setToastMessage(message);
    setShowCopied(true);
    setTimeout(() => {
      setShowCopied(false);
      setToastMessage('');
    }, 2000);
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
    onDeleteTask(task.id);

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
    onAddTask(deletedTask.task.content, deletedTask.sourceColumn);
    setDeletedTask(null);
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
            <span className="text-3xl font-bold text-blue-600">{alias}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className='text-sm font-light text-gray-400'>Track your tasks quickly without ever signing up</p>
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
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
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
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
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
              selectedTask={selectedTask}
              onTaskSelect={setSelectedTask}
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
            onDeleteTask={handleDeleteTask}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDrop={(index) => handleDrop('todo', index)}
            isDragActive={draggedTask !== null}
            isMobile={true}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
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
            isMobile={true}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
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
            isMobile={true}
            selectedTask={selectedTask}
            onTaskSelect={setSelectedTask}
          />
        </div>
      </div>

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
