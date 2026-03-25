import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    const result: Record<string, string> = {};
    for (const row of data ?? []) {
      result[row.key] = row.value;
    }
    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body as { key: string; value: string };

    if (!key || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'key et value requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
