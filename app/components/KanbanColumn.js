'use client';

import { useState } from 'react';
import TaskCard from './TaskCard';

export default function KanbanColumn({
  column,
  title,
  count,
  onAddTask,
  onDeleteTask,
  onDragStart,
  onDragEnd,
  onDrop,
  isDragActive,
  isProgressColumn = false,
  isCompleteColumn = false,
  isMobile = false,
  savingTasks = new Set(),
  selectedTask = null,
  onTaskSelect = () => {},
  isReadOnly = false,
}) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      onAddTask(newTaskContent.trim());
      setNewTaskContent('');
      setIsAddingTask(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAddingTask(false);
      setNewTaskContent('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const taskElements = Array.from(e.currentTarget.querySelectorAll('[data-task-index]'));
    
    let dropIndex = 0;
    for (let i = 0; i < taskElements.length; i++) {
      const taskRect = taskElements[i].getBoundingClientRect();
      const taskY = taskRect.top + taskRect.height / 2 - rect.top;
      if (y > taskY) {
        dropIndex = i + 1;
      }
    }
    setDragOverIndex(dropIndex);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragOverIndex !== null) {
      onDrop(dragOverIndex);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const getColumnIcon = () => {
    if (isProgressColumn) {
      return (
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mr-2">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        </div>
      );
    } else if (isCompleteColumn) {
      return (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-2">
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mr-2">
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
        </div>
      );
    }
  };

  const columnHeight = isMobile ? 'flex-1' : 'h-[calc(100vh-12rem)]';

  const handleColumnClick = (e) => {
    // Prevent board deselect when clicking inside column
    e.stopPropagation();
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 flex flex-col ${isMobile ? 'flex-1 min-h-0' : 'h-[calc(100vh-12rem)]'}`}
      onClick={handleColumnClick}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {getColumnIcon()}
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {count}
            </span>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setIsAddingTask(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          {isReadOnly && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Column Content */}
      <div 
        className={`flex-1 p-4 ${isMobile ? 'overflow-y-auto min-h-0' : columnHeight + ' overflow-y-auto'} kanban-column-scroll`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-3">
          {/* Add Task Input */}
          {isAddingTask && !isReadOnly && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3">
              <input
                type="text"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (newTaskContent.trim()) {
                    handleAddTask();
                  } else {
                    setIsAddingTask(false);
                  }
                }}
                placeholder="Enter task description and press Enter..."
                className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500"
                autoFocus
              />
            </div>
          )}

          {/* Drop Indicator */}
          {isDragActive && dragOverIndex === 0 && (
            <div className="h-0.5 bg-blue-400 rounded-full opacity-75"></div>
          )}

          {/* Tasks */}
          {column?.tasks?.map((task, index) => (
            <div key={`${task.id}-${index}`}>
              <TaskCard
                task={task}
                index={index}
                onDelete={isReadOnly ? null : onDeleteTask}
                onDragStart={isReadOnly ? null : () => onDragStart(task, column.id)}
                onDragEnd={onDragEnd}
                isBeingSaved={savingTasks.has(task.id)}
                isSelected={selectedTask?.id === task.id}
                onSelect={onTaskSelect}
                isReadOnly={isReadOnly}
              />
              
              {/* Drop Indicator */}
              {isDragActive && dragOverIndex === index + 1 && (
                <div className="h-0.5 bg-blue-400 rounded-full opacity-75 mt-3"></div>
              )}
            </div>
          ))}

          {/* Empty State */}
          {!column?.tasks?.length && !isAddingTask && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 24c5.523 0 10 4.477 10 10M20 8a4 4 0 11-8 0 4 4 0 018 0zM44 8a4 4 0 11-8 0 4 4 0 018 0zM32 8a4 4 0 11-8 0 4 4 0 018 0z"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Click the + button above to add a new task.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}