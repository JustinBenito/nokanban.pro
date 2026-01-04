'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import KanbanBoard from '../components/KanbanBoard';

const INITIAL_BOARD = {
  columns: {
    todo: {
      id: 'todo',
      title: 'To-do',
      tasks: []
    },
    inprogress: {
      id: 'inprogress',
      title: 'In Progress',
      tasks: []
    },
    complete: {
      id: 'complete',
      title: 'Complete',
      tasks: []
    }
  }
};

export default function BoardPage() {
  const params = useParams();
  const alias = params.alias;

  const [board, setBoard] = useState(INITIAL_BOARD);
  const [loading, setLoading] = useState(true);

  // Load board from localStorage
  useEffect(() => {
    const loadBoard = () => {
      try {
        const savedBoard = localStorage.getItem(`board_${alias}`);
        if (savedBoard) {
          setBoard(JSON.parse(savedBoard));
        }
      } catch (err) {
        console.error('Error loading board:', err);
      } finally {
        setLoading(false);
      }
    };

    if (alias) {
      loadBoard();
    }
  }, [alias]);

  // Save board to localStorage whenever it changes
  useEffect(() => {
    if (!loading && board) {
      try {
        localStorage.setItem(`board_${alias}`, JSON.stringify(board));
      } catch (err) {
        console.error('Error saving board:', err);
      }
    }
  }, [board, alias, loading]);

  // Add new task
  const addTask = (content, columnId) => {
    const newTask = {
      id: Date.now().toString(),
      content,
      createdAt: new Date().toISOString(),
    };

    setBoard(prevBoard => ({
      ...prevBoard,
      columns: {
        ...prevBoard.columns,
        [columnId]: {
          ...prevBoard.columns[columnId],
          tasks: [...prevBoard.columns[columnId].tasks, newTask]
        }
      }
    }));
  };

  // Move task between columns
  const moveTask = (taskId, sourceColumnId, destinationColumnId, destinationIndex) => {
    setBoard(prevBoard => {
      const sourceColumn = prevBoard.columns[sourceColumnId];
      const destColumn = prevBoard.columns[destinationColumnId];

      const taskIndex = sourceColumn.tasks.findIndex(task => task.id === taskId);
      const task = sourceColumn.tasks[taskIndex];

      if (!task) return prevBoard;

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
      newTasks.splice(destinationIndex, 0, task);

      newBoard.columns[destinationColumnId] = {
        ...destColumn,
        tasks: newTasks
      };

      return newBoard;
    });
  };

  // Delete task
  const deleteTask = (taskId) => {
    setBoard(prevBoard => {
      const newBoard = { ...prevBoard };
      for (const [columnId, column] of Object.entries(newBoard.columns)) {
        const taskIndex = column.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          newBoard.columns[columnId] = {
            ...column,
            tasks: column.tasks.filter(task => task.id !== taskId)
          };
          break;
        }
      }
      return newBoard;
    });
  };

  if (loading) {
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
