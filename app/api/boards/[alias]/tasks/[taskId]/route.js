import { updateTask, deleteTask } from '../../../../../../lib/database.js';

// PUT - Update task
export async function PUT(request, { params }) {
  try {
    const { alias, taskId } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    const taskData = await request.json();
    
    const updatedTask = await updateTask(taskId, taskData, alias, password);
    return Response.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    if (error.message.includes('Invalid password')) {
      return Response.json({ error: 'Invalid password for task modification' }, { status: 403 });
    }
    return Response.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Remove task
export async function DELETE(request, { params }) {
  try {
    const { alias, taskId } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    
    await deleteTask(taskId, alias, password);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    if (error.message.includes('Invalid password')) {
      return Response.json({ error: 'Invalid password for task deletion' }, { status: 403 });
    }
    return Response.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}