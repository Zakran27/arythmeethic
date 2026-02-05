import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Yousign API configuration
const YOUSIGN_API_URL = process.env.YOUSIGN_API_URL || 'https://api-sandbox.yousign.app/v3';
const YOUSIGN_API_KEY = process.env.YOUSIGN_API_KEY;

// Signature field position (configured for example.pdf)
const SIGNATURE_FIELD = {
  page: 1,
  x: 490,
  y: 660,
};

// Format phone number to E.164 international format for Yousign
function formatPhoneNumber(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // French number starting with 0 (e.g., 0612345678 -> +33612345678)
  if (digits.startsWith('0') && digits.length === 10) {
    return '+33' + digits.substring(1);
  }

  // Already has country code 33 without + (e.g., 33612345678 -> +33612345678)
  if (digits.startsWith('33') && digits.length === 11) {
    return '+' + digits;
  }

  // Already in correct format with + (unlikely after removing non-digits, but handle it)
  if (digits.length === 11 && digits.startsWith('33')) {
    return '+' + digits;
  }

  // Return undefined if format not recognized (Yousign will work without phone)
  return undefined;
}

interface SignerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

async function createSignatureRequest(name: string): Promise<{ id: string }> {
  const response = await fetch(`${YOUSIGN_API_URL}/signature_requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Yousign create signature request error:', error);
    throw new Error(`Failed to create signature request: ${error}`);
  }

  return response.json();
}

async function uploadDocument(signatureRequestId: string, pdfBuffer: Buffer, filename: string): Promise<{ id: string }> {
  const formData = new FormData();
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(pdfBuffer);
  formData.append('file', new Blob([uint8Array], { type: 'application/pdf' }), filename);
  formData.append('nature', 'signable_document');

  const response = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Yousign upload document error:', error);
    throw new Error(`Failed to upload document: ${error}`);
  }

  return response.json();
}

async function addSigner(
  signatureRequestId: string,
  documentId: string,
  signer: SignerInfo
): Promise<{ id: string }> {
  const response = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/signers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        first_name: signer.firstName,
        last_name: signer.lastName,
        email: signer.email,
        phone_number: signer.phone || undefined,
        locale: 'fr',
      },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [
        {
          type: 'signature',
          document_id: documentId,
          page: SIGNATURE_FIELD.page,
          x: SIGNATURE_FIELD.x,
          y: SIGNATURE_FIELD.y,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Yousign add signer error:', error);
    throw new Error(`Failed to add signer: ${error}`);
  }

  return response.json();
}

async function activateSignatureRequest(signatureRequestId: string): Promise<void> {
  const response = await fetch(`${YOUSIGN_API_URL}/signature_requests/${signatureRequestId}/activate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Yousign activate error:', error);
    throw new Error(`Failed to activate signature request: ${error}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!YOUSIGN_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuration Yousign manquante' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { clientId, signerEmail, signerFirstName, signerLastName, signerPhone } = body;

    if (!clientId || !signerEmail || !signerFirstName || !signerLastName) {
      return NextResponse.json(
        { success: false, error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    // Verify it's an École client
    if (client.type_client !== 'École') {
      return NextResponse.json(
        { success: false, error: 'Cette procédure est réservée aux établissements' },
        { status: 400 }
      );
    }

    // Get procedure type for CONTRACTUALISATION
    const { data: procedureType, error: ptError } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'CONTRACTUALISATION')
      .single();

    if (ptError || !procedureType) {
      return NextResponse.json(
        { success: false, error: 'Type de procédure non trouvé' },
        { status: 500 }
      );
    }

    // Read the PDF file
    let pdfBuffer: Buffer;
    try {
      const pdfPath = join(process.cwd(), 'example.pdf');
      pdfBuffer = readFileSync(pdfPath);
    } catch (err) {
      console.error('Error reading PDF:', err);
      return NextResponse.json(
        { success: false, error: 'Document de contractualisation non trouvé' },
        { status: 500 }
      );
    }

    // Create the procedure record first (in DRAFT status)
    const { data: newProcedure, error: procError } = await supabase
      .from('procedures')
      .insert({
        client_id: clientId,
        procedure_type_id: procedureType.id,
        status: 'DRAFT',
        recipient_email: signerEmail,
      })
      .select('id')
      .single();

    if (procError || !newProcedure) {
      console.error('Error creating procedure:', procError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la création de la procédure' },
        { status: 500 }
      );
    }

    try {
      // 1. Create signature request
      const signatureName = `Contractualisation - ${client.organisation || `${client.first_name} ${client.last_name}`}`;
      const signatureRequest = await createSignatureRequest(signatureName);
      console.log('Signature request created:', signatureRequest.id);

      // 2. Upload document
      const document = await uploadDocument(
        signatureRequest.id,
        pdfBuffer,
        `contractualisation_${client.id}.pdf`
      );
      console.log('Document uploaded:', document.id);

      // 3. Add signer with signature field
      const signer = await addSigner(signatureRequest.id, document.id, {
        firstName: signerFirstName,
        lastName: signerLastName,
        email: signerEmail,
        phone: formatPhoneNumber(signerPhone),
      });
      console.log('Signer added:', signer.id);

      // 4. Activate the signature request
      await activateSignatureRequest(signatureRequest.id);
      console.log('Signature request activated');

      // Update procedure with Yousign ID and change status
      const { error: updateError } = await supabase
        .from('procedures')
        .update({
          yousign_procedure_id: signatureRequest.id,
          status: 'SIGN_REQUESTED',
        })
        .eq('id', newProcedure.id);

      if (updateError) {
        console.error('Error updating procedure:', updateError);
      }

      // Add status history entry
      await supabase.from('procedure_status_history').insert({
        procedure_id: newProcedure.id,
        status: 'SIGNATURE_DEMANDEE',
      });

      // Log to audit
      await supabase.from('audit_log').insert({
        source: 'admin',
        event: 'CONTRACTUALISATION_LAUNCHED',
        payload: {
          clientId,
          procedureId: newProcedure.id,
          yousignRequestId: signatureRequest.id,
          signerEmail,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Demande de signature envoyée avec succès',
        procedureId: newProcedure.id,
        yousignRequestId: signatureRequest.id,
      });
    } catch (yousignError) {
      // If Yousign fails, update the procedure to reflect the error
      await supabase
        .from('procedures')
        .update({ status: 'DRAFT' })
        .eq('id', newProcedure.id);

      console.error('Yousign error:', yousignError);
      return NextResponse.json(
        { success: false, error: `Erreur Yousign: ${yousignError instanceof Error ? yousignError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error launching contractualisation:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
