import { isBoardEditable } from '../../../../../lib/database.js';

// GET - Check if board requires password for editing
export async function GET(request, { params }) {
  try {
    const { alias } = await params;
    
    const requiresPassword = await isBoardEditable(alias);
    
    return Response.json({ requiresPassword });
  } catch (error) {
    console.error('Error checking board editability:', error);
    return Response.json({ error: 'Failed to check board editability' }, { status: 500 });
  }
}