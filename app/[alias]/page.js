'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../components/KanbanBoard';

export default function BoardPage() {
  const params = useParams();
  const alias = params.alias;
  
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const [savingTasks, setSavingTasks] = useState(new Set()); // Track tasks being saved
  const [boardPassword, setBoardPassword] = useState(null);
  
  // Get password from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const password = urlParams.get('pwd');
      setBoardPassword(password);
    }
  }, []);

  // Fetch board data - removed board dependency to prevent infinite loops
  const fetchBoard = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      // Preserve URL parameters when fetching board
      let apiUrl = `/api/boards/${alias}`;
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.toString()) {
          apiUrl += `?${urlParams.toString()}`;
        }
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch board: ${errorText}`);
      }
      const data = await response.json();
      setBoard(data);
      setInitialLoad(false);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching board:', err);
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
    // Generate optimistic task with all required fields
    const tempTask = {
      id: 'temp-' + Date.now(),
      content,
      title: content,
      description: '',
      priority: 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Optimistically update UI - ensure column exists
    setBoard(prevBoard => {
      const currentColumn = prevBoard.columns[columnId] || { id: columnId, title: columnId, tasks: [] };
      return {
        ...prevBoard,
        columns: {
          ...prevBoard.columns,
          [columnId]: {
            ...currentColumn,
            tasks: [...(currentColumn.tasks || []), tempTask]
          }
        }
      };
    });

    try {
      // Mark task as being saved
      setSavingTasks(prev => new Set(prev).add(tempTask.id));
      
      const response = await fetch(`/api/boards/${alias}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, columnId }),
      });
      if (!response.ok) throw new Error('Failed to add task');
      
      // Get the real task from server response
      const realTask = await response.json();
      
      // Remove from saving tasks
      setSavingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempTask.id);
        return newSet;
      });
      
      // Replace temp task with real task - ensure column exists
      setBoard(prevBoard => {
        const currentColumn = prevBoard.columns[columnId] || { id: columnId, title: columnId, tasks: [] };
        return {
          ...prevBoard,
          columns: {
            ...prevBoard.columns,
            [columnId]: {
              ...currentColumn,
              tasks: (currentColumn.tasks || []).map(task => 
                task.id === tempTask.id ? realTask : task
              )
            }
          }
        };
      });
    } catch (err) {
      // Remove from saving tasks on error
      setSavingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(tempTask.id);
        return newSet;
      });
      
      // Revert optimistic update on error - ensure column exists
      setBoard(prevBoard => {
        const currentColumn = prevBoard.columns[columnId] || { id: columnId, title: columnId, tasks: [] };
        return {
          ...prevBoard,
          columns: {
            ...prevBoard.columns,
            [columnId]: {
              ...currentColumn,
              tasks: (currentColumn.tasks || []).filter(task => task.id !== tempTask.id)
            }
          }
        };
      });
      setError(err.message);
    }
  };

  // Move task between columns
  const moveTask = async (taskId, sourceColumnId, destinationColumnId, destinationIndex) => {
    // Prevent moving temporary tasks
    if (taskId.toString().startsWith('temp-')) {
      console.warn('Cannot move temporary task, please wait for it to be saved');
      return;
    }
    
    // Store original state for potential rollback
    const originalBoard = { ...board };
    
    // Optimistically update UI with better error handling
    setBoard(prevBoard => {
      if (!prevBoard || !prevBoard.columns) return prevBoard;
      
      const sourceColumn = prevBoard.columns[sourceColumnId];
      const destColumn = prevBoard.columns[destinationColumnId];
      
      if (!sourceColumn || !destColumn || !sourceColumn.tasks) {
        console.warn('Invalid column data for move operation');
        return prevBoard;
      }
      
      const taskIndex = sourceColumn.tasks.findIndex(task => task.id === taskId);
      const task = sourceColumn.tasks[taskIndex];
      
      if (!task) {
        console.warn('Task not found for move operation');
        return prevBoard;
      }
      
      // Create new board state
      const newBoard = { ...prevBoard };
      
      // Remove from source
      newBoard.columns = { ...newBoard.columns };
      newBoard.columns[sourceColumnId] = {
        ...sourceColumn,
        tasks: sourceColumn.tasks.filter(t => t.id !== taskId)
      };
      
      // Add to destination
      const newTasks = [...destColumn.tasks];
      const safeDestinationIndex = Math.min(destinationIndex, newTasks.length);
      newTasks.splice(safeDestinationIndex, 0, task);
      
      newBoard.columns[destinationColumnId] = {
        ...destColumn,
        tasks: newTasks
      };
      
      return newBoard;
    });

    try {
      const url = boardPassword ? `/api/boards/${alias}/tasks?pwd=${boardPassword}` : `/api/boards/${alias}/tasks`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          sourceColumnId,
          destinationColumnId,
          destinationIndex,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to move task');
      }
      
      // Refresh board data to sync with database
      console.log('Move successful, refreshing board data');
      await fetchBoard(false); // Don't show loading spinner
      console.log('Board data refreshed after move');
      
    } catch (err) {
      console.error('Move task error:', err);
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
      const url = boardPassword ? `/api/boards/${alias}/tasks/${taskId}?pwd=${boardPassword}` : `/api/boards/${alias}/tasks/${taskId}`;
      const response = await fetch(url, {
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

  if (loading && initialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          
          {/* Board Skeleton */}
          <div className="flex gap-6 overflow-x-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-shrink-0 w-80">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {[1, 2].map(j => (
                      <div key={j} className="bg-gray-50 rounded-lg p-3">
                        <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            onClick={() => fetchBoard(true)}
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
        savingTasks={savingTasks}
      />
    </div>
  );
}