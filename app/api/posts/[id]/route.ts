import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { data: post, error } = await supabase
      .from('posts')
      .select('*, post_variants(*), post_targets(*)')
      .eq('id', params.id)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const json = await req.json();
    const { title, variants } = json;

    const supabase = createAdminClient();

    if (title) {
      await supabase
        .from('posts')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .eq('user_id', userId);
    }

    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.id) {
          await supabase
            .from('post_variants')
            .update({
              caption: v.caption,
              hashtags: v.hashtags,
              is_approved: v.is_approved,
              updated_at: new Date().toISOString(),
            })
            .eq('id', v.id)
            .eq('post_id', params.id);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Post updated' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser(req);
    const userId = user?.id || '00000000-0000-0000-0000-000000000001';

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
