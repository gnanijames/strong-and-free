import { stripe } from '../_lib/stripe.js';
import { sendEmail, COACH_EMAIL } from '../_lib/google.js';
import { classReminderEmail } from '../_lib/emails.js';
import { sendWhatsApp } from '../_lib/twilio.js';
import { waClassReminder24hr } from '../_lib/whatsapp-messages.js';

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const meetLink = process.env.CURRENT_MEET_LINK || 'https://meet.google.com/awb-zjcz-cmx';

  // Figure out which day tomorrow's class falls on
  const now   = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const dayName = tomorrow.toLocaleDateString('en-CA', { weekday: 'long', timeZone: 'America/Toronto' });
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
        const { subject, html } = classReminderEmail({ name, meetLink, dayTime, timing: '24hr' });
        await sendEmail({ to: customer.email, subject, html });

        const phone = customer.metadata?.whatsapp_phone;
        if (phone) {
          await sendWhatsApp(phone, waClassReminder24hr({ name, dayTime, meetLink }));
        }

        sent++;
      } catch (err) {
        console.error(`Failed to send 24hr reminder to ${sub.customer}:`, err.message);
      }
    }

    cursor = subs.has_more ? subs.data[subs.data.length - 1].id : null;
  } while (cursor);

  console.log(`24hr class reminders sent: ${sent}`);
  return res.status(200).json({ sent });
}
