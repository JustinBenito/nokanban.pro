import { supabase } from './supabase.js';
import { ensureDatabaseSetup, ensureDefaultColumns } from './migrate.js';

// Initialize default columns for a board
async function initializeDefaultColumns(boardId) {
  const defaultColumns = [
    { id: 'todo', board_id: boardId, title: 'To-do', position: 0 },
    { id: 'inprogress', board_id: boardId, title: 'In Progress', position: 1 },
    { id: 'complete', board_id: boardId, title: 'Complete', position: 2 }
  ];

  const { error } = await supabase
    .from('columns')
    .insert(defaultColumns);

  if (error) throw error;
}

// Get board by alias with all columns and tasks  
export async function getBoardByAlias(alias, newBoardPassword = null) {
  // First check if board exists
  let { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('alias', alias)
    .single();

  // If board doesn't exist, create it with columns in a transaction-like approach
  if (boardError?.code === 'PGRST116') {
    const boardData = {
      alias,
      title: alias,
      column_order: ['todo', 'inprogress', 'complete']
    };
    
    // If password provided for new board, include it
    if (newBoardPassword) {
      boardData.edit_password = newBoardPassword;
    }
    
    const { data: newBoard, error: createError } = await supabase
      .from('boards')
      .insert(boardData)
      .select()
      .single();

    if (createError) {
      // If it's a duplicate key error, the board was created by someone else in the meantime
      // Just fetch it instead of failing
      if (createError.code === '23505') {
        const { data: existingBoard, error: fetchError } = await supabase
          .from('boards')
          .select('*')
          .eq('alias', alias)
          .single();
          
        if (fetchError) throw fetchError;
        board = existingBoard;
      } else {
        throw createError;
      }
    } else {
      board = newBoard;
    }
  } else if (boardError) {
    throw boardError;
  }

  // Get columns first to ensure they exist
  let { data: columns, error: columnsError } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', board.id)
    .order('position');

  if (columnsError) throw columnsError;

  // If no columns exist for this board, create them automatically
  if (!columns || columns.length === 0) {
    console.log('No columns found for board:', board.id, '- creating default columns');
    
    try {
      const defaultColumns = [
        { id: 'todo', board_id: board.id, title: 'To-do', position: 0 },
        { id: 'inprogress', board_id: board.id, title: 'In Progress', position: 1 },
        { id: 'complete', board_id: board.id, title: 'Complete', position: 2 }
      ];

      const { data: newColumns, error: createError } = await supabase
        .from('columns')
        .insert(defaultColumns)
        .select();

      if (createError) {
        console.error('Failed to auto-create columns:', createError);
        
        // If creation fails, try to fetch existing columns (maybe they were created by trigger)
        const { data: existingColumns, error: fetchError } = await supabase
          .from('columns')
          .select('*')
          .eq('board_id', board.id)
          .order('position');
          
        if (!fetchError && existingColumns && existingColumns.length > 0) {
          columns = existingColumns;
          console.log('Found existing columns after creation failed:', columns.length);
        } else {
          // Last resort: create empty columns structure to prevent crashes
          columns = [
            { id: 'todo', board_id: board.id, title: 'To-do', position: 0 },
            { id: 'inprogress', board_id: board.id, title: 'In Progress', position: 1 },
            { id: 'complete', board_id: board.id, title: 'Complete', position: 2 }
          ];
          console.warn('Using fallback columns structure');
        }
      } else {
        columns = newColumns;
        console.log('Successfully auto-created columns:', columns.length);
      }
    } catch (error) {
      console.error('Error in column creation:', error);
      // Fallback to prevent crashes
      columns = [
        { id: 'todo', board_id: board.id, title: 'To-do', position: 0 },
        { id: 'inprogress', board_id: board.id, title: 'In Progress', position: 1 },
        { id: 'complete', board_id: board.id, title: 'Complete', position: 2 }
      ];
    }
  }

  // Now get tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('board_id', board.id)
    .order('column_id, position');

  if (tasksError) throw tasksError;

  console.log('getBoardByAlias - Raw tasks from database:', tasks);
  console.log('getBoardByAlias - Raw columns from database:', columns);

  // Transform to match the existing format
  const columnsObj = {};
  const tasksByColumn = {};

  // Group tasks by column
  tasks.forEach(task => {
    if (!tasksByColumn[task.column_id]) {
      tasksByColumn[task.column_id] = [];
    }
    tasksByColumn[task.column_id].push({
      id: task.id,
      content: task.title, // Map title to content for frontend compatibility
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      created_at: task.created_at,
      updated_at: task.updated_at,
      createdAt: task.created_at, // Also provide camelCase for compatibility
      updatedAt: task.updated_at
    });
  });

  // Build columns object
  columns.forEach(col => {
    columnsObj[col.id] = {
      id: col.id,
      title: col.title,
      tasks: tasksByColumn[col.id] || []
    };
  });

  const result = {
    alias: board.alias,
    title: board.title || board.alias,
    columns: columnsObj,
    columnOrder: board.column_order || ['todo', 'inprogress', 'complete'],
    createdAt: board.created_at,
    updatedAt: board.updated_at
  };

  console.log('getBoardByAlias - Returning board data:', JSON.stringify(result, null, 2));
  return result;
}

// Update board
export async function updateBoard(alias, boardData, password = null) {
  // First verify password if provided
  if (password !== null) {
    const isValid = await validateBoardPassword(alias, password);
    if (!isValid) {
      throw new Error('Invalid password for board modification');
    }
  }

  const { data, error } = await supabase
    .from('boards')
    .update({
      title: boardData.title,
      column_order: boardData.columnOrder
    })
    .eq('alias', alias)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete board
export async function deleteBoard(alias) {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('alias', alias);

  if (error) throw error;
}

// Validate board password
export async function validateBoardPassword(alias, password) {
  if (!password) return false;
  
  const { data: board, error } = await supabase
    .from('boards')
    .select('edit_password')
    .eq('alias', alias)
    .single();
    
  if (error || !board) return false;
  
  // If board has no password set, it's read-only by default
  if (!board.edit_password) return false;
  
  // Compare the provided password with stored password
  return board.edit_password === password;
}

// Set or update board password
export async function setBoardPassword(alias, password) {
  const { data, error } = await supabase
    .from('boards')
    .update({ edit_password: password })
    .eq('alias', alias)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Check if board is editable (has password)
export async function isBoardEditable(alias) {
  const { data: board, error } = await supabase
    .from('boards')
    .select('edit_password')
    .eq('alias', alias)
    .single();
    
  if (error || !board) return false;
  return board.edit_password !== null;
}

// Add new task
export async function addTask(boardAlias, columnId, taskData, password = null) {
  // Verify password if provided
  if (password !== null) {
    const isValid = await validateBoardPassword(boardAlias, password);
    if (!isValid) {
      throw new Error('Invalid password for task creation');
    }
  }

  // Get board ID
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id')
    .eq('alias', boardAlias)
    .single();

  if (boardError) throw boardError;

  // Get position for new task (last in column)
  const { data: lastTask, error: posError } = await supabase
    .from('tasks')
    .select('position')
    .eq('board_id', board.id)
    .eq('column_id', columnId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = lastTask ? lastTask.position + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      board_id: board.id,
      column_id: columnId,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      position
    })
    .select()
    .single();

  if (error) throw error;
  
  // Return with content field for frontend compatibility
  return {
    ...data,
    content: data.title,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Update task
export async function updateTask(taskId, taskData, boardAlias = null, password = null) {
  // Verify password if provided
  if (password !== null && boardAlias) {
    const isValid = await validateBoardPassword(boardAlias, password);
    if (!isValid) {
      throw new Error('Invalid password for task modification');
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete task
export async function deleteTask(taskId, boardAlias = null, password = null) {
  // Verify password if provided
  if (password !== null && boardAlias) {
    const isValid = await validateBoardPassword(boardAlias, password);
    if (!isValid) {
      throw new Error('Invalid password for task deletion');
    }
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
}

// Move task between columns - proper implementation with position management
export async function moveTask(boardAlias, taskId, sourceColumnId, destinationColumnId, destinationIndex, password = null) {
  console.log('moveTask called:', { boardAlias, taskId, sourceColumnId, destinationColumnId, destinationIndex });
  
  // Verify password if provided
  if (password !== null) {
    const isValid = await validateBoardPassword(boardAlias, password);
    if (!isValid) {
      throw new Error('Invalid password for task movement');
    }
  }
  
  // Get board ID
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id')
    .eq('alias', boardAlias)
    .single();

  if (boardError) {
    console.error('Board fetch error:', boardError);
    throw boardError;
  }

  console.log('Board found:', board.id);

  try {
    // Get current task to verify it exists
    const { data: currentTask, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('board_id', board.id)
      .single();

    if (taskError) {
      console.error('Task fetch error:', taskError);
      throw taskError;
    }

    console.log('Current task:', currentTask);

    // If moving within the same column, just update position
    if (sourceColumnId === destinationColumnId) {
      console.log('Moving within same column');
      
      // Get all tasks in the column ordered by position
      const { data: columnTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('board_id', board.id)
        .eq('column_id', destinationColumnId)
        .order('position');

      if (tasksError) throw tasksError;

      console.log('Column tasks before reorder:', columnTasks);

      // Remove the moving task and reorder
      const otherTasks = columnTasks.filter(t => t.id !== taskId);
      const reorderedTasks = [
        ...otherTasks.slice(0, destinationIndex),
        { id: taskId, position: destinationIndex },
        ...otherTasks.slice(destinationIndex)
      ];

      // Update all positions
      for (let i = 0; i < reorderedTasks.length; i++) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ position: i })
          .eq('id', reorderedTasks[i].id);

        if (updateError) {
          console.error('Position update error for task', reorderedTasks[i].id, ':', updateError);
          throw updateError;
        }
      }
    } else {
      console.log('Moving between columns');
      
      // Update the task's column
      const { error: moveError } = await supabase
        .from('tasks')
        .update({ 
          column_id: destinationColumnId,
          position: destinationIndex
        })
        .eq('id', taskId);

      if (moveError) {
        console.error('Move task error:', moveError);
        throw moveError;
      }

      // Get and reorder destination column tasks
      const { data: destTasks, error: destError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('board_id', board.id)
        .eq('column_id', destinationColumnId)
        .order('position');

      if (destError) throw destError;

      console.log('Destination column tasks:', destTasks);

      // Reorder destination column positions
      for (let i = 0; i < destTasks.length; i++) {
        if (destTasks[i].position !== i) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ position: i })
            .eq('id', destTasks[i].id);

          if (updateError) {
            console.error('Destination reorder error:', updateError);
            throw updateError;
          }
        }
      }

      // Reorder source column positions
      const { data: sourceTasks, error: sourceError } = await supabase
        .from('tasks')
        .select('id, position')
        .eq('board_id', board.id)
        .eq('column_id', sourceColumnId)
        .order('position');

      if (sourceError) throw sourceError;

      for (let i = 0; i < sourceTasks.length; i++) {
        if (sourceTasks[i].position !== i) {
          const { error: updateError } = await supabase
            .from('tasks')
            .update({ position: i })
            .eq('id', sourceTasks[i].id);

          if (updateError) {
            console.error('Source reorder error:', updateError);
            throw updateError;
          }
        }
      }
    }

    console.log('Move completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in moveTask:', error);
    throw error;
  }
}

// Duplicate board to new alias with all tasks
export async function duplicateBoard(sourceAlias, newAlias, password = null) {
  
  // Get source board with all data
  const sourceBoard = await getBoardByAlias(sourceAlias);
  
  // Create new board with same structure
  const newBoardData = {
    alias: newAlias,
    title: sourceBoard.title,
    column_order: sourceBoard.columnOrder,
    edit_password: password
  };
  
  const { data: newBoard, error: boardError } = await supabase
    .from('boards')
    .insert(newBoardData)
    .select()
    .single();
    
  if (boardError) {
    if (boardError.code === '23505') {
      throw new Error('Board alias already exists');
    }
    throw boardError;
  }
  
  // Create columns for new board
  const columnsToCreate = sourceBoard.columnOrder.map((columnId, index) => ({
    id: columnId,
    board_id: newBoard.id,
    title: sourceBoard.columns[columnId].title,
    position: index
  }));
  
  const { error: columnsError } = await supabase
    .from('columns')
    .insert(columnsToCreate);
    
  if (columnsError) throw columnsError;
  
  // Create tasks for new board
  const tasksToCreate = [];
  for (const [columnId, column] of Object.entries(sourceBoard.columns)) {
    column.tasks.forEach((task, index) => {
      tasksToCreate.push({
        board_id: newBoard.id,
        column_id: columnId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        position: index
      });
    });
  }
  
  if (tasksToCreate.length > 0) {
    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasksToCreate);
      
    if (tasksError) throw tasksError;
  }
  
  // Return the new board data
  return await getBoardByAlias(newAlias);
}