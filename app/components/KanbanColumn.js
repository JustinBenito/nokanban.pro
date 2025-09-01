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

  const columnHeight = isMobile ? 'mobile-kanban-column' : 'h-[600px]';

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col ${isMobile ? 'mobile-kanban-column' : ''}`}>
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
          <button
            onClick={() => setIsAddingTask(true)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Column Content */}
      <div 
        className={`flex-1 p-4 ${columnHeight} overflow-y-auto kanban-column-scroll`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        <div className="space-y-3">
          {/* Add Task Input */}
          {isAddingTask && (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-3">
              <input
                type="text"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newTaskContent.trim()) {
                    setIsAddingTask(false);
                  }
                }}
                placeholder="Enter task description..."
                className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddTask}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskContent('');
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Drop Indicator */}
          {isDragActive && dragOverIndex === 0 && (
            <div className="h-0.5 bg-blue-400 rounded-full opacity-75"></div>
          )}

          {/* Tasks */}
          {column?.tasks?.map((task, index) => (
            <div key={task.id}>
              <TaskCard
                task={task}
                index={index}
                onDelete={() => onDeleteTask(task.id)}
                onDragStart={() => onDragStart(task, column.id)}
                onDragEnd={onDragEnd}
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
                Get started by adding a new task.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}