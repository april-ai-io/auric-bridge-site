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
        source: 'Auric Bridge Website',
        customFields: [
          { key: 'property_address', value: property_address },
          { key: 'situation', value: situation || '' },
          { key: 'details', value: details || '' }
        ]
      })
    });

    if (!contactRes.ok) {
      const errBody = await contactRes.text();
      console.error('GHL API error:', contactRes.status, errBody);
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    const contact = await contactRes.json();
    console.log('Contact created/updated:', contact?.contact?.id);

    // Redirect to thank you
    return res.redirect(302, '/?submitted=property');
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
