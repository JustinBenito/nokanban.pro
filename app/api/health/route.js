import { supabase } from '../../../lib/supabase.js';

export async function GET() {
  try {
    // Test database connection
    const { data, error } = await supabase.from('boards').select('count').single();
    
    if (error && error.code === '42P01') {
      return Response.json({ 
        status: 'error', 
        message: 'Database tables not found. Please run supabase_schema.sql in your Supabase project.',
        setupRequired: true
      }, { status: 500 });
    }
    
    if (error) {
      return Response.json({ 
        status: 'error', 
        message: error.message 
      }, { status: 500 });
    }
    
    return Response.json({ 
      status: 'ok', 
      message: 'Database connection successful' 
    });
    
  } catch (error) {
    return Response.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
}