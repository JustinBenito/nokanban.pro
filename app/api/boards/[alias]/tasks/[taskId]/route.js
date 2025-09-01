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

// DELETE - Remove task
export async function DELETE(request, { params }) {
  try {
    const { alias, taskId } = params;
    
    const boards = getBoardsData();
    
    if (!boards[alias]) {
      return Response.json({ error: 'Board not found' }, { status: 404 });
    }
    
    const board = boards[alias];
    let taskFound = false;
    
    // Find and remove task from any column
    Object.values(board.columns).forEach(column => {
      const taskIndex = column.tasks.findIndex(task => task.id === taskId);
      if (taskIndex > -1) {
        column.tasks.splice(taskIndex, 1);
        taskFound = true;
      }
    });
    
    if (!taskFound) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }
    
    board.updatedAt = new Date().toISOString();
    saveBoardsData(boards);
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}