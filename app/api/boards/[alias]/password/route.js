import { setBoardPassword } from '../../../../../lib/database.js';

// POST - Set board password for editable links
export async function POST(request, { params }) {
  try {
    const { alias } = await params;
    const { password } = await request.json();
    
    if (!password) {
      return Response.json({ error: 'Password is required' }, { status: 400 });
    }
    
    const updatedBoard = await setBoardPassword(alias, password);
    return Response.json({ success: true, message: 'Password set successfully' });
  } catch (error) {
    console.error('Error setting board password:', error);
    return Response.json({ error: 'Failed to set board password' }, { status: 500 });
  }
}