'use client';

import { useState } from 'react';

export default function TaskCard({ task, index, onDelete, onDragStart, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group bg-white border border-gray-200 rounded-lg p-3 task-card cursor-move relative ${
        isDragging ? 'task-dragging opacity-50' : ''
      }`}
    >

      {/* Task Content */}
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-2">
          <p className="text-sm text-gray-900 leading-relaxed">
            {task.content}
          </p>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(task.createdAt)}
          </div>
        </div>
        
        <button
          onClick={handleDeleteClick}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1 -m-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Drag Indicator */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity">
        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 11-4 0 2 2 0 014 0zM7 8a2 2 0 11-4 0 2 2 0 014 0zM7 14a2 2 0 11-4 0 2 2 0 014 0zM17 2a2 2 0 11-4 0 2 2 0 014 0zM17 8a2 2 0 11-4 0 2 2 0 014 0zM17 14a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
    </div>
  );
}