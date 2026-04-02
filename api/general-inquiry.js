export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { first_name, last_name, email, phone, inquiry_type, message } = req.body;

  if (!first_name || !last_name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const GHL_API_KEY = process.env.GHL_API_KEY;
  const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

  try {
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
        tags: ['website-general-inquiry', `inquiry-${inquiry_type || 'other'}`],
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

    if (contactId) {
      const noteBody = [
        `General Inquiry from Website`,
        `Type: ${inquiry_type || 'Not specified'}`,
        `Message: ${message || 'None provided'}`
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

    return res.redirect(302, '/?submitted=general');
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
