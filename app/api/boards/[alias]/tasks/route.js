import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOARDS_FILE = path.join(DATA_DIR, 'boards.json');

function getBoardsData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOARDS_FILE)) {
    fs.writeFileSync(BOARDS_FILE, JSON.stringify({}));
    return {};
  }
  const data = fs.readFileSync(BOARDS_FILE, 'utf8');
  return JSON.parse(data);
}

function saveBoardsData(boards) {
  fs.writeFileSync(BOARDS_FILE, JSON.stringify(boards, null, 2));
}

// POST - Add new task
export async function POST(request, { params }) {
  try {
    const { alias } = params;
    const { content, columnId } = await request.json();
    
    const boards = getBoardsData();
    
    // Initialize board if it doesn't exist
    if (!boards[alias]) {
      boards[alias] = {
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
    }
    
    // Create new task
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      createdAt: new Date().toISOString()
    };
    
    // Add task to specified column
    if (boards[alias].columns[columnId]) {
      boards[alias].columns[columnId].tasks.push(newTask);
      boards[alias].updatedAt = new Date().toISOString();
    } else {
      return Response.json({ error: 'Invalid column ID' }, { status: 400 });
    }
    
    saveBoardsData(boards);
    
    return Response.json(newTask);
  } catch (error) {
    return Response.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT - Move task between columns
export async function PUT(request, { params }) {
  try {
    const { alias } = params;
    const { taskId, sourceColumnId, destinationColumnId, destinationIndex } = await request.json();
    
    const boards = getBoardsData();
    
    if (!boards[alias]) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const board = boards[alias];
    
    // Find and remove task from source column
    let task = null;
    const sourceColumn = board.columns[sourceColumnId];
    if (sourceColumn) {
      const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
      if (taskIndex > -1) {
        task = sourceColumn.tasks.splice(taskIndex, 1)[0];
      }
    }
    
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Add task to destination column
    const destinationColumn = board.columns[destinationColumnId];
    if (destinationColumn) {
      destinationColumn.tasks.splice(destinationIndex, 0, task);
    } else {
      return Response.json({ error: 'Invalid destination column' }, { status: 400 });
    }
    
    board.updatedAt = new Date().toISOString();
    saveBoardsData(boards);
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to move task' }, { status: 500 });
  }
}