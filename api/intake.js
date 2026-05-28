import { sendEmail, COACH_EMAIL } from './_lib/google.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { first, last, phone, email, reason } = req.body;
  if (!first || !email) return res.status(400).json({ error: 'Name and email are required.' });

  const name = `${first} ${last || ''}`.trim();

  try {
    await sendEmail({
      to: COACH_EMAIL,
      subject: `New inquiry: ${name}`,
      html: `
        <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 20px;">New inquiry from movestrongandfree.com</h2>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          <tr><td style="padding:8px 0;color:#6b6b6b;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b6b6b;">Email</td><td style="padding:8px 0;">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#6b6b6b;">Phone</td><td style="padding:8px 0;">${phone || '—'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b6b6b;">Message</td><td style="padding:8px 0;">${reason || '—'}</td></tr>
        </table>
      `,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('intake error:', err);
    return res.status(500).json({ error: 'Could not send message.' });
  }
}
