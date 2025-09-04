'use client';

import { useState } from 'react';

export default function TaskCard({ task, index, onDelete, onDragStart, onDragEnd, isBeingSaved = false, isSelected = false, onSelect = () => {}, isReadOnly = false }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    // Prevent dragging if task is being saved or in read-only mode
    if (isBeingSaved || isReadOnly || !onDragStart) {
      e.preventDefault();
      return;
    }
    
    setIsDragging(true);
    onDragStart();
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Create drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(task);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    // Toggle selection - if already selected, deselect
    if (isSelected) {
      onSelect(null);
    } else {
      onSelect(task);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 0 ? 'just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div
      data-task-index={index}
      draggable={!isBeingSaved && !isReadOnly && !!onDragStart}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`group bg-white border rounded-lg p-3 task-card relative ${
        isDragging ? 'task-dragging opacity-50' : ''
      } ${
        isBeingSaved 
          ? 'cursor-not-allowed opacity-60 bg-gray-50' 
          : isReadOnly
          ? 'cursor-default'
          : 'cursor-move hover:shadow-md'
      } ${
        isSelected 
          ? 'border-blue-500 border-2 shadow-md bg-blue-50' 
          : 'border-gray-200'
      } ${
        isReadOnly ? 'bg-gray-50' : ''
      } transition-all duration-200`}
    >

      {/* Task Content */}
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-2">
          <div className="flex items-start gap-2">
            {isBeingSaved && (
              <div className="animate-spin mt-1">
                <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            )}
            <div className="flex-1">
              <p className={`text-sm leading-relaxed ${isBeingSaved ? 'text-gray-600' : 'text-gray-900'}`}>
                {task.content}
              </p>
              <div className="mt-2 flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(task.createdAt)}
                {isBeingSaved && <span className="ml-2 text-blue-500 font-medium">Saving...</span>}
              </div>
            </div>
          </div>
        </div>
        
        {!isReadOnly && onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isBeingSaved}
            className={`opacity-0 group-hover:opacity-100 transition-all p-1 -m-1 ${
              isBeingSaved 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Drag Indicator */}
      {!isReadOnly && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 8a2 2 0 11-4 0 2 2 0 014 0zM7 14a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0zM17 8a2 2 0 11-4 0 2 2 0 014 0zM17 14a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      )}

      {/* Hover Effect Border */}
      {!isSelected && (
        <div className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}