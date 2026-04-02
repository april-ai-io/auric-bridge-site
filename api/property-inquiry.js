export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, email, phone, property_address, situation, details } = req.body;

  if (!first_name || !last_name || !email || !property_address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  try {
    // Create or update contact in GHL
    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName: first_name,
        lastName: last_name,
        email: email,
        phone: phone || '',
        address1: property_address,
        tags: ['website-property-lead', `situation-${situation || 'unknown'}`],
        source: 'Auric Bridge Website'
      })
    });

    if (!contactRes.ok) {
      const errBody = await contactRes.text();
      console.error('GHL contact error:', contactRes.status, errBody);
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    const contactData = await contactRes.json();
    const contactId = contactData?.contact?.id;

    // Add a note with the full submission details
    if (contactId) {
      const noteBody = [
        `Property Inquiry from Website`,
        `Property: ${property_address}`,
        `Situation: ${situation || 'Not specified'}`,
        `Details: ${details || 'None provided'}`
      ].join('\n');

      await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({ body: noteBody })
      });
    }

    return res.redirect(302, '/?submitted=property');
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
