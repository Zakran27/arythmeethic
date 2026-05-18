import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const showAll = request.nextUrl.searchParams.get('all') === '1';
    const query = supabase
      .from('formations')
      .select('*')
      .order('display_order', { ascending: false })
      .order('annee', { ascending: false });

    const { data, error } = showAll ? await query : await query.eq('is_published', true);
    if (error) throw error;
    return NextResponse.json({ success: true, formations: data ?? [] });
  } catch (error) {
    console.error('Error fetching formations:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('formations')
      .insert({
        titre: body.titre,
        contenu: body.contenu,
        annee: body.annee,
        duree: body.duree?.trim() ? body.duree.trim() : null,
        display_order: body.display_order ?? 0,
        is_published: body.is_published ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, formation: data });
  } catch (error) {
    console.error('Error creating formation:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...patch } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 });
    }
    if ('duree' in patch) {
      patch.duree =
        typeof patch.duree === 'string' && patch.duree.trim() ? patch.duree.trim() : null;
    }
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('formations')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, formation: data });
  } catch (error) {
    console.error('Error updating formation:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id requis' }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('formations').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting formation:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
