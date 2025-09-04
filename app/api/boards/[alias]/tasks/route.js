import { addTask, moveTask } from '../../../../../lib/database.js';

// POST - Add new task
export async function POST(request, { params }) {
  try {
    const { alias } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    const { content, columnId, title, description, priority } = await request.json();
    
    const taskData = {
      title: title || content || 'Untitled Task',
      description: description || '',
      priority: priority || 'medium'
    };
    
    const newTask = await addTask(alias, columnId, taskData, password);
    return Response.json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error.message.includes('Invalid password')) {
      return Response.json({ error: 'Invalid password for task creation' }, { status: 403 });
    }
    return Response.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT - Move task between columns
export async function PUT(request, { params }) {
  try {
    const { alias } = await params;
    const body = await request.json();
    const { taskId, sourceColumnId, destinationColumnId, destinationIndex } = body;
    
    // Validate taskId format (check if it's a valid UUID or temp ID)
    if (taskId.toString().startsWith('temp-')) {
      return Response.json({ 
        error: 'Cannot move temporary task',
        details: 'Task is still being saved to database'
      }, { status: 400 });
    }
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      return Response.json({ 
        error: 'Invalid task ID',
        details: 'Task ID must be a valid UUID'
      }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    
    const result = await moveTask(alias, taskId, sourceColumnId, destinationColumnId, destinationIndex, password);
    return Response.json(result);
  } catch (error) {
    console.error('Error moving task:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    
    // Handle password errors
    if (error.message.includes('Invalid password')) {
      return Response.json({ error: 'Invalid password for task movement' }, { status: 403 });
    }
    
    // Handle specific database errors
    if (error.code === '22P02') {
      return Response.json({ 
        error: 'Invalid task ID format',
        details: 'The task ID is not in the correct format'
      }, { status: 400 });
    }
    
    return Response.json({ 
      error: 'Failed to move task',
      details: error.message,
      code: error.code 
    }, { status: 500 });
  }
}