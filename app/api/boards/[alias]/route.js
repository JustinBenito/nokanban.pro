import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get all boards data
function getBoardsData() {
  ensureDataDir();
  if (!fs.existsSync(BOARDS_FILE)) {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify({}));
    return {};
  }
  const data = fs.readFileSync(BOARDS_FILE, 'utf8');
  return JSON.parse(data);
}

// Save boards data
function saveBoardsData(boards) {
  ensureDataDir();
  fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2));
}

// GET - Fetch board data by alias
export async function GET(request, { params }) {
  try {
    const { alias } = params;
    const boards = getBoardsData();
    
    const board = boards[alias] || {
      alias,
      columns: {
        'todo': { id: 'todo', title: 'To-do', tasks: [] },
        'inprogress': { id: 'inprogress', title: 'In Progress', tasks: [] },
        'complete': { id: 'complete', title: 'Complete', tasks: [] }
      },
      columnOrder: ['todo', 'inprogress', 'complete'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return Response.json(board);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch board' }, { status: 500 });
  }
}

// PUT - Update board data
export async function PUT(request, { params }) {
  try {
    const { alias } = params;
    const updatedBoard = await request.json();
    
    const boards = getBoardsData();
    boards[alias] = {
      ...updatedBoard,
      alias,
      updatedAt: new Date().toISOString()
    };
    
    saveBoardsData(boards);
    
    return Response.json(boards[alias]);
  } catch (error) {
    return Response.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

// DELETE - Delete board
export async function DELETE(request, { params }) {
  try {
    const { alias } = params;
    const boards = getBoardsData();
    
    if (boards[alias]) {
      delete boards[alias];
      saveBoardsData(boards);
    }
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}