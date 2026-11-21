import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const supabase = createAdminClient();

    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, status, created_at, scheduled_for')
      .order('created_at', { ascending: false })
      .limit(100);

    const headers = [
      'Post ID',
      'Title',
      'Status',
      'Publish Date',
      'Estimated Impressions',
      'Estimated Reach',
      'Engagement Rate',
    ];

    const rows = (posts || []).map((p: any) => [
      `"${p.id}"`,
      `"${(p.title || 'Untitled Post').replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.scheduled_for || p.created_at}"`,
      `"${p.impressions || 0}"`,
      `"${p.reach || 0}"`,
      `"${p.engagementRate || '0.0%'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="socialsync-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to export analytics' },
      { status: 500 }
    );
  }
}
