import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('🌱 Starting seed...');

  // Insert sample clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .insert([
      {
        first_name: 'Alice',
        last_name: 'Dupont',
        email: 'alice.dupont@example.com',
        phone: '+33612345678',
        type_client: 'Particulier',
        address_line1: '123 Rue de la Paix',
        postal_code: '75001',
        city: 'Paris',
        country: 'France',
      },
      {
        first_name: 'Bob',
        last_name: 'Martin',
        email: 'bob.martin@ecole.fr',
        phone: '+33698765432',
        type_client: 'École',
        organisation: 'École Primaire Victor Hugo',
        address_line1: '45 Avenue des Écoles',
        postal_code: '69001',
        city: 'Lyon',
        country: 'France',
      },
      {
        first_name: 'Claire',
        last_name: 'Bernard',
        email: 'claire.bernard@example.com',
        type_client: 'Particulier',
        city: 'Marseille',
      },
    ])
    .select();

  if (clientsError) {
    console.error('Error inserting clients:', clientsError);
    return;
  }

  console.log(`✅ Inserted ${clients.length} clients`);

  // Get procedure types
  const { data: procedureTypes } = await supabase.from('procedure_types').select('*').limit(2);

  if (procedureTypes && procedureTypes.length > 0 && clients.length > 0) {
    // Insert sample procedures
    const { data: procedures, error: proceduresError } = await supabase
      .from('procedures')
      .insert([
        {
          client_id: clients[0].id,
          procedure_type_id: procedureTypes[0].id,
          status: 'DRAFT',
          owner: 'Admin',
        },
        {
          client_id: clients[1].id,
          procedure_type_id: procedureTypes[1].id,
          status: 'SIGN_REQUESTED',
          deadline_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          owner: 'Admin',
        },
      ])
      .select();

    if (proceduresError) {
      console.error('Error inserting procedures:', proceduresError);
      return;
    }

    console.log(`✅ Inserted ${procedures.length} procedures`);

    // Insert sample documents
    if (procedures && procedures.length > 0) {
      const { error: documentsError } = await supabase.from('documents').insert([
        {
          procedure_id: procedures[0].id,
          kind: 'CONTRACT',
          title: 'Contract Draft.pdf',
          uploaded_by: 'ADMIN',
        },
      ]);

      if (documentsError) {
        console.error('Error inserting documents:', documentsError);
      } else {
        console.log('✅ Inserted sample documents');
      }
    }
  }

  console.log('🎉 Seed complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Sign up a user via Supabase Auth (email/magic link)');
  console.log('2. Insert a row in profiles table with that user ID and role=admin');
  console.log('3. Run: pnpm dev');
}

seed().catch(console.error);
