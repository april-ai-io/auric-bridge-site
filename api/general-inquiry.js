export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const first_name = body.first_name;
  const last_name = body.last_name;
  const email = body.email;
  const phone = body.phone;
  const inquiry_type = body.inquiry_type;
  const message = body.message;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_API_KEY,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName: first_name,
        lastName: last_name,
        email: email,
        phone: phone || '',
        tags: ['website-general-inquiry', 'inquiry-' + (inquiry_type || 'other')],
        source: 'Auric Bridge Website'
      })
    });

    const responseText = await contactRes.text();

    if (!contactRes.ok) {
      return res.status(500).json({
        error: 'GHL API error',
        status: contactRes.status,
        ghlResponse: responseText
      });
    }

    const contactData = JSON.parse(responseText);
    const contactId = contactData?.contact?.id;

    if (contactId) {
      const noteBody = [
        'General Inquiry from Website',
        'Type: ' + (inquiry_type || 'Not specified'),
        'Message: ' + (message || 'None provided')
      ].join('\n');

      await fetch('https://services.leadconnectorhq.com/contacts/' + contactId + '/notes', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + GHL_API_KEY,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({ body: noteBody })
      });
    }

    return res.redirect(302, '/?submitted=general');
  } catch (err) {
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
