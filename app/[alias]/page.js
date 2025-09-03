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
    // Generate optimistic task
    const tempTask = {
      id: 'temp-' + Date.now(),
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update UI
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: {
        ...prevBoard.columns,
        [columnId]: {
          ...prevBoard.columns[columnId],
          tasks: [...(prevBoard.columns[columnId]?.tasks || []), tempTask]
        }
      }
    }));

    try {
      const response = await fetch(`/api/boards/${alias}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, columnId }),
      });
      if (!response.ok) throw new Error('Failed to add task');
      
      // Get the real task from server response
      const realTask = await response.json();
      
      // Replace temp task with real task
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: {
          ...prevBoard.columns,
          [columnId]: {
            ...prevBoard.columns[columnId],
            tasks: prevBoard.columns[columnId].tasks.map(task => 
              task.id === tempTask.id ? realTask : task
            )
          }
        }
      }));
    } catch (err) {
      // Revert optimistic update on error
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: {
          ...prevBoard.columns,
          [columnId]: {
            ...prevBoard.columns[columnId],
            tasks: prevBoard.columns[columnId].tasks.filter(task => task.id !== tempTask.id)
          }
        }
      }));
      setError(err.message);
    }
  };

  // Move task between columns
  const moveTask = async (taskId, sourceColumnId, destinationColumnId, destinationIndex) => {
    // Store original state for potential rollback
    const originalBoard = board;
    
    // Optimistically update UI
    setBoard(prevBoard => {
      const newBoard = { ...prevBoard };
      
      // Find and remove task from source column
      const sourceColumn = newBoard.columns[sourceColumnId];
      const taskIndex = sourceColumn.tasks.findIndex(task => task.id === taskId);
      const task = sourceColumn.tasks[taskIndex];
      
      if (task) {
        // Remove from source
        newBoard.columns[sourceColumnId] = {
          ...sourceColumn,
          tasks: sourceColumn.tasks.filter(t => t.id !== taskId)
        };
        
        // Add to destination
        const destColumn = newBoard.columns[destinationColumnId];
        const newTasks = [...destColumn.tasks];
        newTasks.splice(destinationIndex, 0, task);
        
        newBoard.columns[destinationColumnId] = {
          ...destColumn,
          tasks: newTasks
        };
      }
      
      return newBoard;
    });

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
    } catch (err) {
      // Revert to original state on error
      setBoard(originalBoard);
      setError(err.message);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    // Find and remove task optimistically
    let deletedTask = null;
    let sourceColumnId = null;
    
    setBoard(prevBoard => {
      const newBoard = { ...prevBoard };
      for (const [columnId, column] of Object.entries(newBoard.columns)) {
        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          deletedTask = column.tasks[taskIndex];
          sourceColumnId = columnId;
          newBoard.columns[columnId] = {
            ...column,
            tasks: column.tasks.filter(task => task.id !== taskId)
          };
          break;
        }
      }
      return newBoard;
    });

    try {
      const response = await fetch(`/api/boards/${alias}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (err) {
      // Revert deletion on error
      if (deletedTask && sourceColumnId) {
        setBoard(prevBoard => ({
          ...prevBoard,
          columns: {
            ...prevBoard.columns,
            [sourceColumnId]: {
              ...prevBoard.columns[sourceColumnId],
              tasks: [...prevBoard.columns[sourceColumnId].tasks, deletedTask]
            }
          }
        }));
      }
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