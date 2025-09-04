import { validateBoardPassword } from '../../../../../lib/database.js';

// GET - Validate board password
export async function GET(request, { params }) {
  try {
    const { alias } = await params;
    const url = new URL(request.url);
    const password = url.searchParams.get('pwd');
    
    if (!password) {
      return Response.json({ error: 'Password required' }, { status: 400 });
    }
    
    const isValid = await validateBoardPassword(alias, password);
    
    if (isValid) {
      return Response.json({ valid: true });
    } else {
      return Response.json({ valid: false }, { status: 403 });
    }
  } catch (error) {
    console.error('Error validating password:', error);
    return Response.json({ error: 'Failed to validate password' }, { status: 500 });
  }
}