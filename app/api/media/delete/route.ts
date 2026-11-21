import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();
    const { mediaId, storagePath } = body;

    if (!mediaId && !storagePath) {
      return NextResponse.json(
        { success: false, error: 'mediaId or storagePath is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (storagePath) {
      await supabase.storage.from('post_media').remove([storagePath]);
    }

    if (mediaId) {
      await supabase.from('media').delete().eq('id', mediaId);
    }

    return NextResponse.json({
      success: true,
      message: 'Media asset deleted successfully',
      mediaId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to delete media asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  return POST(req);
}
