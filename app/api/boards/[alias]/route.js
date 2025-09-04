import { getBoardByAlias, updateBoard, deleteBoard, duplicateBoard } from '../../../../lib/database.js';

// GET - Fetch board data by alias
export async function GET(request, { params }) {
  try {
    const { alias } = await params;
    const url = new URL(request.url);
    const isNew = url.searchParams.get('new') === 'true';
    const password = url.searchParams.get('pwd');
    
    // If it's a new board request and has password, create with password
    const newBoardPassword = isNew && password ? password : null;
    
    const board = await getBoardByAlias(alias, newBoardPassword);
    return Response.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    
    // Handle specific Supabase errors
    if (error.message?.includes('Missing Supabase environment variables')) {
      return Response.json({ 
        error: 'Database configuration error. Please check environment variables.',
        details: error.message
      }, { status: 500 });
    }
    
    return Response.json({ 
      error: 'Failed to fetch board',
      details: error.message
    }, { status: 500 });
  }
}

// PUT - Update board data
export async function PUT(request, { params }) {
  try {
    const { alias } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    const updatedBoard = await request.json();
    
    const board = await updateBoard(alias, updatedBoard, password);
    return Response.json(board);
  } catch (error) {
    console.error('Error updating board:', error);
    if (error.message.includes('Invalid password')) {
      return Response.json({ error: 'Invalid password for board modification' }, { status: 403 });
    }
    return Response.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE - Delete board
export async function DELETE(request, { params }) {
  try {
    const { alias } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    
    // For now, we'll require password validation for board deletion
    if (password) {
      const { validateBoardPassword } = await import('../../../../lib/database.js');
      const isValid = await validateBoardPassword(alias, password);
      if (!isValid) {
        return Response.json({ error: 'Invalid password for board deletion' }, { status: 403 });
      }
    }
    
    await deleteBoard(alias);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return Response.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}

// POST - Duplicate/Clone board to new alias
export async function POST(request, { params }) {
  try {
    const { alias: newAlias } = await params;
    const { sourceAlias, password, boardData } = await request.json();
    
    if (!sourceAlias) {
      return Response.json({ error: 'Source alias is required' }, { status: 400 });
    }
    
    const duplicatedBoard = await duplicateBoard(sourceAlias, newAlias, password);
    return Response.json(duplicatedBoard);
  } catch (error) {
    console.error('Error duplicating board:', error);
    if (error.message.includes('already exists')) {
      return Response.json({ error: 'Board alias already exists' }, { status: 409 });
    }
    return Response.json({ error: 'Failed to duplicate board' }, { status: 500 });
  }
}