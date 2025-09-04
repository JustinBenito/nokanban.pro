import { supabase } from './supabase.js';

// Check if tables exist and create them if they don't
export async function ensureDatabaseSetup() {
  try {
    // Try to check if boards table exists by querying it
    const { data, error } = await supabase.from('boards').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist, create it
      console.log('Database tables not found. Please run the SQL from supabase_schema.sql in your Supabase SQL Editor.');
      throw new Error('Database not initialized. Please run supabase_schema.sql in your Supabase project.');
    }
    
    return true;
  } catch (error) {
    console.error('Database setup check failed:', error);
    throw error;
  }
}

// Initialize default columns for a board if they don't exist
export async function ensureDefaultColumns(boardId) {
  const { data: existingColumns } = await supabase
    .from('columns')
    .select('id')
    .eq('board_id', boardId);

  if (!existingColumns || existingColumns.length === 0) {
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
}