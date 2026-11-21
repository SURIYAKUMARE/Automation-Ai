import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const timestamp = new Date().toISOString();
  const envSummary = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not-configured',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    supabaseKey: (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) ? 'configured' : 'missing',
    geminiKey: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID ? 'configured' : 'missing',
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
    metaAppId: process.env.META_APP_ID ? 'configured' : 'missing',
  };

  let supabaseStatus = {
    connected: false,
    latencyMs: 0,
    message: 'Not connected',
  };

  const startTime = Date.now();
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    const latency = Date.now() - startTime;

    if (!error) {
      supabaseStatus = {
        connected: true,
        latencyMs: latency,
        message: 'Successfully connected and verified public.profiles table',
      };
    } else {
      supabaseStatus = {
        connected: false,
        latencyMs: latency,
        message: `Database query notice: ${error.message}`,
      };
    }
  } catch (err: any) {
    supabaseStatus = {
      connected: false,
      latencyMs: Date.now() - startTime,
      message: err.message || 'Failed to initialize Supabase client',
    };
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp,
    environment: envSummary,
    supabase: supabaseStatus,
  });
}
