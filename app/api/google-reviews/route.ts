import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const showAll = request.nextUrl.searchParams.get('all') === '1';
    const query = supabase
      .from('google_reviews')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    const { data, error } = showAll ? await query : await query.eq('is_published', true);
    if (error) throw error;
    return NextResponse.json({ success: true, reviews: data ?? [] });
  } catch (error) {
    console.error('Error fetching google reviews:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('google_reviews')
      .insert({
        author_name: body.author_name,
        author_avatar_url: body.author_avatar_url || null,
        rating: body.rating,
        comment: body.comment,
        visited_at: body.visited_at || null,
        relative_time: body.relative_time || null,
        google_review_id: body.google_review_id || null,
        display_order: body.display_order ?? 0,
        is_published: body.is_published ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('Error creating review:', error);
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
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('google_reviews')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, review: data });
  } catch (error) {
    console.error('Error updating review:', error);
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
    const { error } = await supabase.from('google_reviews').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
