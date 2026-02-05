import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientType,
      firstName,
      lastName,
      organisationName,
      email,
      phone,
      studentLevel,
      requestType,
      requestSubject,
      howDidYouHear,
      referrerName,
      message,
    } = body;

    // Map client types to database values
    const clientTypeMapping: Record<string, { type_client: string; sub_type: string | null }> = {
      student: { type_client: 'Particulier', sub_type: 'Jeune' },
      parent: { type_client: 'Particulier', sub_type: 'Parent' },
      school: { type_client: 'École', sub_type: null },
    };

    // Map client types to French labels for email
    const clientTypeLabels: Record<string, string> = {
      student: 'Jeune / Élève',
      parent: 'Parent',
      school: 'Établissement',
    };

    // Map request types to French labels
    const requestTypeLabels: Record<string, string> = {
      accompagnement_annee: "Accompagnement sur l'année",
      accompagnement_ponctuel: 'Accompagnement ponctuel',
    };

    // Map request subjects to French labels
    const requestSubjectLabels: Record<string, string> = {
      information: "Demande d'informations",
      vacation_technique: 'Vacation dans une matière technique',
      atelier_cps: 'Atelier de compétences psycho-sociales',
    };

    // Map how did you hear to French labels
    const howDidYouHearLabels: Record<string, string> = {
      linkedin: 'LinkedIn',
      recommandation: 'Recommandation',
    };

    // Create client in Supabase
    const supabase = createServiceRoleClient();
    const { type_client, sub_type } = clientTypeMapping[clientType] || { type_client: 'Particulier', sub_type: null };

    // Build the client record based on type
    const clientRecord: Record<string, unknown> = {
      type_client,
      sub_type,
      client_status: 'Prospect',
      notes: message,
    };

    if (clientType === 'student') {
      // Jeune - store in jeune fields
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.first_name_jeune = firstName;
      clientRecord.last_name_jeune = lastName;
      clientRecord.email = email;
      clientRecord.email_jeune = email;
      clientRecord.phone_jeune = phone || null;
    } else if (clientType === 'parent') {
      // Parent - store in parent1 fields
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.first_name_parent1 = firstName;
      clientRecord.last_name_parent1 = lastName;
      clientRecord.email = email;
      clientRecord.email_parent1 = email;
      clientRecord.phone_parent1 = phone || null;
      clientRecord.niveau_eleve = studentLevel || null;
      clientRecord.demande_type = requestTypeLabels[requestType] || requestType || null;
    } else if (clientType === 'school') {
      // École - store in main fields + organisation
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.email = email;
      clientRecord.phone1 = phone || null;
      clientRecord.organisation = organisationName || null;
      clientRecord.how_did_you_hear = howDidYouHearLabels[howDidYouHear] || howDidYouHear || null;
      clientRecord.referrer_name = referrerName || null;
      // Store request subject in notes along with message
      if (requestSubject) {
        clientRecord.notes = `Objet: ${requestSubjectLabels[requestSubject] || requestSubject}\n\n${message}`;
      }
    }

    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert([clientRecord])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating client:', insertError);
      // Continue anyway to send the email notification
    } else {
      console.log('Client created successfully:', newClient?.id);
    }

    // Build email content based on client type
    let emailContent = `
Nouveau message depuis A Rythme Ethic

Type de client: ${clientTypeLabels[clientType] || clientType}
`;

    if (clientType === 'school') {
      emailContent += `Établissement: ${organisationName}
`;
    }

    emailContent += `Nom: ${lastName}
Prénom: ${firstName}
Email: ${email}
Téléphone: ${phone || 'Non renseigné'}
`;

    if (clientType === 'parent') {
      emailContent += `Niveau de l'élève: ${studentLevel}
Type de demande: ${requestTypeLabels[requestType] || requestType}
`;
    }

    if (clientType === 'school') {
      emailContent += `Objet de la demande: ${requestSubjectLabels[requestSubject] || requestSubject}
Comment m'a connue: ${howDidYouHearLabels[howDidYouHear] || howDidYouHear}
`;
      if (howDidYouHear === 'recommandation' && referrerName) {
        emailContent += `Recommandé par: ${referrerName}
`;
      }
    }

    emailContent += `
Message:
${message}
    `.trim();

    console.log('Contact form submission:', {
      clientType,
      firstName,
      lastName,
      organisationName,
      email,
      phone,
      studentLevel,
      requestType,
      requestSubject,
      howDidYouHear,
      referrerName,
      message,
    });

    return NextResponse.json({
      success: true,
      message: 'Message envoyé avec succès',
      clientId: newClient?.id,
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
