import { stripe } from '../_lib/stripe.js';
import { sendEmail } from '../_lib/google.js';
import { classReminderEmail } from '../_lib/emails.js';
import { sendWhatsApp } from '../_lib/twilio.js';
import { waClassReminderMorning } from '../_lib/whatsapp-messages.js';

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const meetLink = process.env.CURRENT_MEET_LINK || 'https://meet.google.com/awb-zjcz-cmx';

  const dayName = new Date().toLocaleDateString('en-CA', { weekday: 'long', timeZone: 'America/Toronto' });
  const dayTime = `${dayName} at 10:00 AM Eastern Time`;

  let sent = 0;
  let cursor;

  do {
    const params = { status: 'active', limit: 100 };
    if (cursor) params.starting_after = cursor;

    const subs = await stripe.subscriptions.list(params);

    for (const sub of subs.data) {
      try {
        const customer = await stripe.customers.retrieve(sub.customer);
        if (!customer.email || customer.deleted) continue;
        const name = customer.name || 'there';
        const { subject, html } = classReminderEmail({ name, meetLink, dayTime, timing: '1hr' });
        await sendEmail({ to: customer.email, subject, html });

        const phone = customer.metadata?.whatsapp_phone;
        if (phone) {
          await sendWhatsApp(phone, waClassReminderMorning({ name, dayTime, meetLink }));
        }

        sent++;
      } catch (err) {
        console.error(`Failed to send morning reminder to ${sub.customer}:`, err.message);
      }
    }

    cursor = subs.has_more ? subs.data[subs.data.length - 1].id : null;
  } while (cursor);

  console.log(`Morning class reminders sent: ${sent}`);
  return res.status(200).json({ sent });
}
