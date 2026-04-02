export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const first_name = body.first_name;
  const last_name = body.last_name;
  const email = body.email;
  const phone = body.phone;
  const property_address = body.property_address;
  const situation = body.situation;
  const details = body.details;

  if (!first_name || !last_name || !email || !property_address) {
    return res.status(400).json({
      error: 'Missing required fields',
      debug: { hasBody: !!req.body, keys: Object.keys(body), contentType: req.headers['content-type'] }
    });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const payload = {
    locationId: GHL_LOCATION_ID,
    firstName: first_name,
    lastName: last_name,
    email: email,
    phone: phone || '',
    address1: property_address,
    tags: ['website-property-lead', 'situation-' + (situation || 'unknown')],
    source: 'Auric Bridge Website'
  };

  try {
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GHL_API_KEY,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(payload)
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
        'Property Inquiry from Website',
        'Property: ' + property_address,
        'Situation: ' + (situation || 'Not specified'),
        'Details: ' + (details || 'None provided')
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

    return res.redirect(302, '/?submitted=property');
  } catch (err) {
    return res.status(500).json({ error: 'Server error', message: err.message });
  }
}
