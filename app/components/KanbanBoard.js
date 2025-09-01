'use client';

import { useState, useRef } from 'react';
import KanbanColumn from './KanbanColumn';

export default function KanbanBoard({ board, alias, onAddTask, onMoveTask, onDeleteTask }) {
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  const boardUrl = `nokn.pro/${alias}`;

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
          <h1 className="text-xl font-medium text-gray-900">
            nokn.pro/{alias}
          </h1>
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="h-4 w-4 mr-1.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {showCopied ? 'Copied!' : 'Copy'}
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
              onDeleteTask={onDeleteTask}
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
              onDeleteTask={onDeleteTask}
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
              onDeleteTask={onDeleteTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={(index) => handleDrop('complete', index)}
              isDragActive={draggedTask !== null}
              isCompleteColumn={true}
            />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          <div className="space-y-6">
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
      </div>
    </div>
  );
}