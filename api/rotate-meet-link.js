import { stripe } from './_lib/stripe.js';
import { sendEmail, getCalendar, COACH_EMAIL, CLASS_CALENDAR } from './_lib/google.js';
import { newMeetLinkEmail } from './_lib/emails.js';

// Runs on the 1st of every month at 9am ET via Vercel Cron
// Also callable manually by Gnani via GET /api/rotate-meet-link?secret=CRON_SECRET
export default async function handler(req, res) {
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isManual     = req.query.secret === process.env.CRON_SECRET;

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const month = new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });

  try {
    // 1. Create a new Google Meet event for this month's classes
    const calendar = getCalendar();
    const newEvent = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary:     `Strong and Free — ${month} Classes`,
        description: 'Monthly class link rotation — this event generates the Meet link.',
        start: { dateTime: new Date().toISOString(), timeZone: 'America/Toronto' },
        end:   { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), timeZone: 'America/Toronto' },
        conferenceData: {
          createRequest: {
            requestId: `rotate-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
      conferenceDataVersion: 1,
    });

    const meetLink = newEvent.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri;
    if (!meetLink) throw new Error('Could not generate Meet link');

    // 2. Get all active Stripe subscribers
    const subscribers = [];
    let hasMore = true;
    let startingAfter;

    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        expand: ['data.customer'],
      });
      subscribers.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length) startingAfter = page.data[page.data.length - 1].id;
    }

    // 3. Email each active subscriber with the new link
    let sent = 0;
    for (const sub of subscribers) {
      const customer = sub.customer;
      const name     = customer.name  || 'there';
      const email    = customer.email;
      if (!email) continue;

      const { subject, html } = newMeetLinkEmail({ name, meetLink, month });
      await sendEmail({ to: email, subject, html });
      sent++;
    }

    // 4. Update the environment variable (stored in process.env for webhook use)
    //    In practice, update CURRENT_MEET_LINK in Vercel env vars via API
    try {
      await updateVercelEnvVar('CURRENT_MEET_LINK', meetLink);
    } catch (e) {
      console.error('Could not update CURRENT_MEET_LINK env var:', e.message);
    }

    // 5. Notify Gnani
    await sendEmail({
      to: COACH_EMAIL,
      subject: `✅ ${month} class link rotated — ${sent} subscribers notified`,
      html: `<p>The monthly class link has been rotated for <strong>${month}</strong>.</p><p><strong>New Meet link:</strong> <a href="${meetLink}">${meetLink}</a></p><p><strong>Subscribers notified:</strong> ${sent}</p>`,
    });

    return res.status(200).json({ ok: true, month, meetLink, subscribersNotified: sent });

  } catch (err) {
    console.error('rotate-meet-link error:', err);
    await sendEmail({
      to: COACH_EMAIL,
      subject: '⚠️ Monthly link rotation FAILED',
      html: `<p>The automated class link rotation failed for <strong>${month}</strong>. Please rotate the link manually and email your subscribers.</p><p>Error: ${err.message}</p>`,
    }).catch(() => {});
    return res.status(500).json({ error: err.message });
  }
}

async function updateVercelEnvVar(key, value) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId    = process.env.VERCEL_TEAM_ID;
  const token     = process.env.VERCEL_API_TOKEN;
  if (!projectId || !token) return;

  const url = `https://api.vercel.com/v9/projects/${projectId}/env${teamId ? `?teamId=${teamId}` : ''}`;
  const existing = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const { envs } = await existing.json();
  const envVar = envs?.find(e => e.key === key);

  if (envVar) {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envVar.id}${teamId ? `?teamId=${teamId}` : ''}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, target: ['production'] }),
    });
  } else {
    await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, target: ['production'], type: 'plain' }),
    });
  }
}
