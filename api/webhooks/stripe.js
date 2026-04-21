import { stripe } from '../_lib/stripe.js';
import { sendEmail, getCalendar, COACH_EMAIL, CLASS_CALENDAR } from '../_lib/google.js';
import {
  welcomeSubscriberEmail,
  newSubscriberNotificationEmail,
  paymentFailedEmail,
  cancellationEmail,
  cancellationNotificationEmail,
  consultationConfirmationEmail,
  consultationReminderEmail,
} from '../_lib/emails.js';

// Vercel requires raw body for Stripe webhook signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig  = req.headers['stripe-signature'];
  const body = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {

      // ── New subscription created ────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription' && session.mode !== 'payment') break;

        if (session.mode === 'subscription') {
          await handleNewSubscriber(session);
        } else if (session.mode === 'payment') {
          await handleConsultationBooked(session);
        }
        break;
      }

      // ── Payment failed (renewal) ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice  = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const name     = customer.name || 'there';
        const email    = customer.email;

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: invoice.customer,
          return_url: process.env.BASE_URL,
        });

        const { subject, html } = paymentFailedEmail({ name, updateUrl: portalSession.url });
        await sendEmail({ to: email, subject, html });
        break;
      }

      // ── Subscription cancelled ──────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub      = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const name     = customer.name || 'there';
        const email    = customer.email;
        const endDate  = new Date(sub.current_period_end * 1000).toLocaleDateString('en-CA', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

        // Email client
        const client = cancellationEmail({ name, endDate });
        await sendEmail({ to: email, subject: client.subject, html: client.html });

        // Notify Gnani
        const coach = cancellationNotificationEmail({ name, email, endDate });
        await sendEmail({ to: COACH_EMAIL, subject: coach.subject, html: coach.html });
        break;
      }

      // ── Dispute opened — alert Gnani immediately ────────────────────────────
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        await sendEmail({
          to: COACH_EMAIL,
          subject: `⚠️ Dispute opened — $${(dispute.amount / 100).toFixed(2)}`,
          html: `<p>A dispute has been opened for $${(dispute.amount / 100).toFixed(2)}. Log in to your <a href="https://dashboard.stripe.com/disputes">Stripe dashboard</a> to respond.</p><p>Charge ID: ${dispute.charge}</p>`,
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    // Still return 200 so Stripe doesn't retry indefinitely
  }

  return res.status(200).json({ received: true });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function handleNewSubscriber(session) {
  const meta      = session.metadata || {};
  const name      = meta.member_name  || session.customer_details?.name  || 'there';
  const email     = meta.member_email || session.customer_details?.email || '';
  const isGift    = session.metadata?.is_gift === 'true';
  const classSchedule = process.env.CLASS_SCHEDULE_TEXT || 'Monday, Wednesday, and Friday at 10:00 AM Eastern Time';

  // Welcome email to subscriber/recipient
  const welcome = welcomeSubscriberEmail({ name, classSchedule });
  await sendEmail({ to: email, subject: welcome.subject, html: welcome.html });

  // Notify Gnani
  const notify = newSubscriberNotificationEmail({
    name,
    email,
    isGift,
    recipientName:  meta.member_name,
    recipientEmail: meta.member_email,
  });
  await sendEmail({ to: COACH_EMAIL, subject: notify.subject, html: notify.html });

  // Add to Google Calendar recurring class event as attendee
  const currentMeetLink = process.env.CURRENT_MEET_LINK;
  if (CLASS_CALENDAR && currentMeetLink) {
    const calendar = getCalendar();
    const events = await calendar.events.list({
      calendarId: CLASS_CALENDAR,
      q: 'Strong and Free Group Class',
      maxResults: 10,
      singleEvents: false,
    });
    // Add as attendee to recurring class events
    for (const ev of (events.data.items || [])) {
      if (!ev.recurrence) continue;
      const attendees = ev.attendees || [];
      if (attendees.some(a => a.email === email)) continue;
      await calendar.events.patch({
        calendarId: CLASS_CALENDAR,
        eventId: ev.id,
        requestBody: {
          attendees: [...attendees, { email, displayName: name }],
        },
        sendUpdates: 'added',
      });
    }
  }
}

async function handleConsultationBooked(session) {
  const meta = session.metadata || {};
  const name  = meta.client_name;
  const email = meta.client_email;
  const type  = meta.consult_type;
  const date  = new Date(meta.consult_date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const time  = meta.consult_time;

  let meetLink = null;

  // Create Google Meet event for remote, or plain calendar event for in-person
  const calendar  = getCalendar();
  const startDt   = new Date(`${meta.consult_date}T${to24h(time)}:00-05:00`);
  const endDt     = new Date(startDt.getTime() + 30 * 60 * 1000);

  const eventBody = {
    summary:     `Consultation: ${name}`,
    description: meta.consult_notes || '',
    start:       { dateTime: startDt.toISOString(), timeZone: 'America/Toronto' },
    end:         { dateTime: endDt.toISOString(),   timeZone: 'America/Toronto' },
    attendees:   [
      { email: COACH_EMAIL, displayName: 'Gnani' },
      { email, displayName: name },
    ],
    sendUpdates: 'all',
  };

  if (type === 'remote') {
    eventBody.conferenceData = {
      createRequest: { requestId: session.id, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    };
  }

  const created = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
    conferenceDataVersion: type === 'remote' ? 1 : 0,
    sendUpdates: 'all',
  });

  if (type === 'remote') {
    meetLink = created.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
  }

  const address = type === 'inperson' ? process.env.INPERSON_ADDRESS : null;

  // Confirmation email to client
  const confirm = consultationConfirmationEmail({ name, type, date, time, meetLink, address });
  await sendEmail({ to: email, subject: confirm.subject, html: confirm.html });

  // Schedule 24hr reminder — store in Stripe metadata for cron to pick up
  await stripe.paymentIntents.update(session.payment_intent, {
    metadata: {
      ...meta,
      meet_link: meetLink || '',
      reminder_sent: 'false',
    },
  });
}

function to24h(timeStr) {
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
