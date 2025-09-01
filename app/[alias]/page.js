'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../components/KanbanBoard';

export default function BoardPage() {
  const params = useParams();
  const alias = params.alias;
  
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch board data
  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${alias}`);
      if (!response.ok) throw new Error('Failed to fetch board');
      const data = await response.json();
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [alias]);

  useEffect(() => {
    if (alias) {
      fetchBoard();
    }
  }, [alias, fetchBoard]);

  // Update board in the backend
  const updateBoard = async (updatedBoard) => {
    try {
      const response = await fetch(`/api/boards/${alias}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBoard),
      });
      if (!response.ok) throw new Error('Failed to update board');
      const data = await response.json();
      setBoard(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Add new task
  const addTask = async (content, columnId) => {
    try {
      const response = await fetch(`/api/boards/${alias}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, columnId }),
      });
      if (!response.ok) throw new Error('Failed to add task');
      await fetchBoard(); // Refresh board
    } catch (err) {
      setError(err.message);
    }
  };

  // Move task between columns
  const moveTask = async (taskId, sourceColumnId, destinationColumnId, destinationIndex) => {
    try {
      const response = await fetch(`/api/boards/${alias}/tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sourceColumnId,
          destinationColumnId,
          destinationIndex,
        }),
      });
      if (!response.ok) throw new Error('Failed to move task');
      await fetchBoard(); // Refresh board
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`/api/boards/${alias}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      await fetchBoard(); // Refresh board
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your kanban board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchBoard}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <KanbanBoard
        board={board}
        alias={alias}
        onAddTask={addTask}
        onMoveTask={moveTask}
        onDeleteTask={deleteTask}
      />
    </div>
  );
}