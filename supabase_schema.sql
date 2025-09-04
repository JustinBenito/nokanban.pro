-- Kanban Board Schema for Supabase
-- Run this SQL in your Supabase SQL editor

-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  column_order TEXT[] DEFAULT ARRAY['todo', 'inprogress', 'complete'],
  edit_password TEXT DEFAULT NULL, -- Password for editable links, NULL means read-only by default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create columns table with proper composite primary key
CREATE TABLE IF NOT EXISTS columns (
  id TEXT NOT NULL,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (board_id, id)  -- Composite key allows same column IDs across different boards
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boards_alias ON boards(alias);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-create columns for new boards
CREATE OR REPLACE FUNCTION create_default_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically create default columns when a new board is created
    INSERT INTO columns (id, board_id, title, position) VALUES
    ('todo', NEW.id, 'To-do', 0),
    ('inprogress', NEW.id, 'In Progress', 1),
    ('complete', NEW.id, 'Complete', 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create columns for new boards
DROP TRIGGER IF EXISTS auto_create_columns ON boards;
CREATE TRIGGER auto_create_columns
    AFTER INSERT ON boards
    FOR EACH ROW
    EXECUTE FUNCTION create_default_columns();

-- Enable Row Level Security (RLS) - Optional but recommended
-- ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE columns ENABLE ROW LEVEL SECURITY;  
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth needs)
-- CREATE POLICY "Allow all operations for boards" ON boards FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for columns" ON columns FOR ALL USING (true);
-- CREATE POLICY "Allow all operations for tasks" ON tasks FOR ALL USING (true);


-- COMPREHENSIVE DATABASE CLEANUP AND FIX FOR ALL BOARDS
-- This script handles ALL edge cases and makes the system robust
-- Run this in your Supabase SQL Editor

-- 1. Show current state for debugging
SELECT 'CURRENT BOARDS:' as info;
SELECT alias, id, created_at FROM boards ORDER BY created_at;

SELECT 'CURRENT COLUMNS:' as info;  
SELECT id, board_id, title, position FROM columns ORDER BY board_id, position;

SELECT 'ORPHANED COLUMNS (will be deleted):' as info;
SELECT * FROM columns WHERE board_id NOT IN (SELECT id FROM boards);

-- 2. Clean up orphaned columns (columns without matching boards)
DELETE FROM columns 
WHERE board_id NOT IN (SELECT id FROM boards);

-- 3. Fix the schema to handle conflicts properly
-- Drop the existing primary key constraint on columns.id
ALTER TABLE columns DROP CONSTRAINT IF EXISTS columns_pkey;

-- Add a composite primary key that makes sense: (board_id, id)
-- This allows the same column types (todo, inprogress, complete) across different boards
ALTER TABLE columns ADD CONSTRAINT columns_board_id_id_key PRIMARY KEY (board_id, id);

-- 4. Create proper columns for ALL existing boards
DO $$
DECLARE
    board_record RECORD;
BEGIN
    -- Loop through ALL boards
    FOR board_record IN SELECT id, alias FROM boards LOOP
        
        -- Delete any existing columns for this board to start fresh
        DELETE FROM columns WHERE board_id = board_record.id;
        
        -- Insert the standard 3 columns for each board
        INSERT INTO columns (id, board_id, title, position) VALUES
        ('todo', board_record.id, 'To-do', 0),
        ('inprogress', board_record.id, 'In Progress', 1),
        ('complete', board_record.id, 'Complete', 2);
        
        RAISE NOTICE 'Created columns for board: % (ID: %)', board_record.alias, board_record.id;
    END LOOP;
END $$;

-- 5. Create a function to auto-create columns for new boards
CREATE OR REPLACE FUNCTION create_default_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically create default columns when a new board is created
    INSERT INTO columns (id, board_id, title, position) VALUES
    ('todo', NEW.id, 'To-do', 0),
    ('inprogress', NEW.id, 'In Progress', 1),
    ('complete', NEW.id, 'Complete', 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to auto-create columns for future boards
DROP TRIGGER IF EXISTS auto_create_columns ON boards;
CREATE TRIGGER auto_create_columns
    AFTER INSERT ON boards
    FOR EACH ROW
    EXECUTE FUNCTION create_default_columns();

-- 7. Verify the fix worked
SELECT 'FINAL VERIFICATION - ALL BOARDS SHOULD HAVE 3 COLUMNS:' as info;
SELECT 
    b.alias,
    b.id as board_id,
    COUNT(c.id) as column_count,
    STRING_AGG(c.id, ', ' ORDER BY c.position) as column_ids
FROM boards b
LEFT JOIN columns c ON b.id = c.board_id
GROUP BY b.alias, b.id
ORDER BY b.alias;

SELECT 'CLEANUP COMPLETE!' as status;


-- Add the edit_password column if it doesn't exist
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS edit_password TEXT DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN boards.edit_password IS 'Password for editable links, NULL means read-only by default';