import { BASE_URL } from './stripe.js';

const BRAND_COLOR  = '#C47B5A';
const SAGE_COLOR   = '#7D9B76';
const BG_COLOR     = '#F5EFE6';

function layout(body) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#ede4d6;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ede4d6;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:${BG_COLOR};padding:28px 40px;border-bottom:1px solid #d4c9bc;">
            <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:600;color:#2c2c2c;">
              Strong <span style="color:${BRAND_COLOR}">&</span> Free
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;font-family:-apple-system,sans-serif;font-size:16px;line-height:1.7;color:#2c2c2c;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:${BG_COLOR};padding:24px 40px;border-top:1px solid #d4c9bc;font-family:-apple-system,sans-serif;font-size:13px;color:#6b6b6b;text-align:center;">
            <p style="margin:0 0 6px;">Strong and Free · Markham, Toronto, Ontario</p>
            <p style="margin:0;">
              <a href="${BASE_URL}/privacy.html" style="color:${BRAND_COLOR};">Privacy Policy</a> &nbsp;·&nbsp;
              <a href="${BASE_URL}/terms.html" style="color:${BRAND_COLOR};">Terms</a> &nbsp;·&nbsp;
              <a href="https://billing.stripe.com/p/login/{{STRIPE_PORTAL}}" style="color:${BRAND_COLOR};">Manage Subscription</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href, text, color = BRAND_COLOR) {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#ffffff;font-family:-apple-system,sans-serif;font-size:16px;font-weight:600;padding:14px 28px;border-radius:50px;text-decoration:none;margin:8px 0;">${text}</a>`;
}

// ── Welcome email (new subscriber) ───────────────────────────────────────────
export function welcomeSubscriberEmail({ name, classSchedule }) {
  const subject = 'Welcome to Strong and Free! 🎉 Here\'s everything you need.';
  const html = layout(`
    <h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 16px;">Welcome, ${name}!</h1>
    <p>You're officially part of the Strong and Free community. We're so glad you're here.</p>
    <p>Here's what happens next:</p>
    <ul style="padding-left:20px;color:#2c2c2c;">
      <li style="margin-bottom:8px;">You'll receive your <strong>class link by email before each session</strong> — just click it to join</li>
      <li style="margin-bottom:8px;">A reminder will arrive <strong>24 hours and 1 hour before every class</strong></li>
      <li style="margin-bottom:8px;">No app to download — Google Meet runs right in your browser</li>
    </ul>
    <div style="background:#f5efe6;border-radius:12px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 10px;font-weight:600;font-size:15px;">Upcoming class schedule</p>
      <p style="margin:0;font-size:15px;color:#2c2c2c;">${classSchedule || 'Your schedule details are coming soon — watch for a follow-up email.'}</p>
    </div>
    <h3 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 12px;">How to join your first class</h3>
    <ol style="padding-left:20px;color:#2c2c2c;">
      <li style="margin-bottom:8px;">Watch for an email from us with your class link (we'll send it the day before)</li>
      <li style="margin-bottom:8px;">At class time, click the link — it opens in your web browser</li>
      <li style="margin-bottom:8px;">Allow your camera and microphone when prompted (you can keep camera off if you prefer)</li>
      <li style="margin-bottom:8px;">You'll enter the class and see Gnani — you're in!</li>
    </ol>
    <p><strong>Need help?</strong> Reply to this email or reach us at <a href="mailto:hello@movestrongandfree.com" style="color:${BRAND_COLOR};">hello@movestrongandfree.com</a>. We're happy to walk you through it.</p>
    <p>See you in class,<br/><strong>Gnani</strong><br/>Strong and Free</p>
  `);
  return { subject, html };
}

// ── New subscriber notification to Gnani ─────────────────────────────────────
export function newSubscriberNotificationEmail({ name, email, isGift, recipientName, recipientEmail }) {
  const subject = `New subscriber: ${name}`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">New subscriber 🎉</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:8px 0;color:#6b6b6b;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b6b6b;">Email</td><td style="padding:8px 0;">${email}</td></tr>
      ${isGift ? `<tr><td style="padding:8px 0;color:#6b6b6b;">Gift for</td><td style="padding:8px 0;">${recipientName} (${recipientEmail})</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#6b6b6b;">Amount</td><td style="padding:8px 0;">$89/month</td></tr>
    </table>
    <br/>
    ${btn(`${BASE_URL}/admin`, 'View Admin Dashboard')}
  `);
  return { subject, html };
}

// ── Payment failed ────────────────────────────────────────────────────────────
export function paymentFailedEmail({ name, updateUrl }) {
  const subject = 'Action needed: Your Strong and Free payment didn\'t go through';
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Payment issue, ${name}</h2>
    <p>We weren't able to process your monthly subscription payment. This sometimes happens when a card expires or has a temporary issue.</p>
    <p>To keep your class access, please update your payment details — it only takes a minute.</p>
    ${btn(updateUrl || 'https://billing.stripe.com', 'Update Payment Details')}
    <p style="margin-top:24px;">If you don't update within <strong>3 days</strong>, your subscription will be paused and you won't receive the next class link.</p>
    <p>Questions? Reply to this email and we'll help.</p>
    <p>— Gnani</p>
  `);
  return { subject, html };
}

// ── Cancellation confirmation ─────────────────────────────────────────────────
export function cancellationEmail({ name, endDate }) {
  const subject = 'Your Strong and Free subscription has been cancelled';
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">We'll miss you, ${name}</h2>
    <p>Your subscription has been cancelled. You'll retain access to classes until <strong>${endDate}</strong>.</p>
    <p>After that date, you won't receive future class links.</p>
    <p>If you ever want to come back, we'd love to have you — just visit <a href="${BASE_URL}/subscribe.html" style="color:${BRAND_COLOR};">movestrongandfree.com</a> to rejoin.</p>
    <p>Take care of yourself,<br/><strong>Gnani</strong></p>
  `);
  return { subject, html };
}

// ── Cancellation notification to Gnani ───────────────────────────────────────
export function cancellationNotificationEmail({ name, email, endDate }) {
  const subject = `Cancellation: ${name}`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">Subscription cancelled</h2>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr><td style="padding:8px 0;color:#6b6b6b;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b6b6b;">Email</td><td style="padding:8px 0;">${email}</td></tr>
      <tr><td style="padding:8px 0;color:#6b6b6b;">Access until</td><td style="padding:8px 0;">${endDate}</td></tr>
    </table>
    <br/>
    ${btn(`${BASE_URL}/admin`, 'View Admin Dashboard')}
  `);
  return { subject, html };
}

// ── Consultation confirmation (client) ───────────────────────────────────────
export function consultationConfirmationEmail({ name, type, date, time, meetLink, address }) {
  const isRemote = type === 'remote';
  const subject  = `Booking confirmed — ${isRemote ? 'Remote' : 'In-Person'} consultation with Gnani`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">You're booked, ${name}!</h2>
    <p>Your 30-minute consultation with Gnani is confirmed.</p>
    <div style="background:#f5efe6;border-radius:12px;padding:20px 24px;margin:24px 0;">
      <table style="width:100%;font-size:15px;">
        <tr><td style="color:#6b6b6b;padding:4px 0;width:100px;">Type</td><td style="font-weight:600;">${isRemote ? 'Remote (video call)' : 'In-Person'}</td></tr>
        <tr><td style="color:#6b6b6b;padding:4px 0;">Date</td><td style="font-weight:600;">${date}</td></tr>
        <tr><td style="color:#6b6b6b;padding:4px 0;">Time</td><td style="font-weight:600;">${time} Eastern Time</td></tr>
        <tr><td style="color:#6b6b6b;padding:4px 0;">${isRemote ? 'Join link' : 'Address'}</td><td style="font-weight:600;">${isRemote ? `<a href="${meetLink}" style="color:${BRAND_COLOR};">${meetLink}</a>` : address}</td></tr>
      </table>
    </div>
    ${isRemote ? `${btn(meetLink, 'Join Google Meet Call', SAGE_COLOR)}<p style="font-size:13px;color:#6b6b6b;margin-top:8px;">Save this link — you'll also receive a reminder the morning of your session.</p>` : '<p>Please arrive a few minutes early. If you need directions or have any questions, reply to this email.</p>'}
    <p style="margin-top:24px;font-size:14px;color:#6b6b6b;">Need to cancel or reschedule? Please reply to this email at least 24 hours before your session for a full refund.</p>
    <p>Looking forward to meeting you,<br/><strong>Gnani</strong></p>
  `);
  return { subject, html };
}

// ── Consultation reminder (24hr before) ──────────────────────────────────────
export function consultationReminderEmail({ name, type, date, time, meetLink, address }) {
  const isRemote = type === 'remote';
  const subject  = `Reminder: Your consultation with Gnani is tomorrow at ${time}`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">See you tomorrow, ${name}!</h2>
    <p>Just a reminder that your consultation with Gnani is <strong>tomorrow at ${time} Eastern Time</strong>.</p>
    <div style="background:#f5efe6;border-radius:12px;padding:16px 24px;margin:20px 0;">
      <p style="margin:0;font-size:15px;"><strong>${date} · ${time} ET</strong><br/>${isRemote ? `<a href="${meetLink}" style="color:${BRAND_COLOR};">${meetLink}</a>` : address}</p>
    </div>
    ${isRemote ? btn(meetLink, 'Join Google Meet', SAGE_COLOR) : ''}
    <p style="font-size:14px;color:#6b6b6b;">Questions? Reply to this email any time.</p>
  `);
  return { subject, html };
}

// ── New Meet link (monthly rotation) ─────────────────────────────────────────
export function newMeetLinkEmail({ name, meetLink, month }) {
  const subject = `Your ${month} class link — Strong and Free`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">New month, new link 📅</h2>
    <p>Hi ${name},</p>
    <p>Here is your class access link for <strong>${month}</strong>. This link is private — please don't share it.</p>
    <div style="background:#f5efe6;border-radius:12px;padding:20px 24px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 12px;font-size:14px;color:#6b6b6b;">Your class link</p>
      <a href="${meetLink}" style="color:${BRAND_COLOR};font-size:16px;font-weight:600;word-break:break-all;">${meetLink}</a>
    </div>
    ${btn(meetLink, 'Open Class Link', SAGE_COLOR)}
    <p style="font-size:14px;color:#6b6b6b;margin-top:24px;">Save this email. You'll also receive a reminder before each class with this link included.</p>
    <p>See you in class,<br/><strong>Gnani</strong></p>
  `);
  return { subject, html };
}

// ── Class reminder (sent before each class) ──────────────────────────────────
export function classReminderEmail({ name, meetLink, dayTime, timing }) {
  const subject = `${timing === '1hr' ? '1 hour until class' : 'Class tomorrow'} — Strong and Free`;
  const html = layout(`
    <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;">${timing === '1hr' ? 'Class starts in 1 hour!' : 'Class is tomorrow'}</h2>
    <p>Hi ${name},</p>
    <p>Your Strong and Free class is ${timing === '1hr' ? 'starting in about an hour' : 'coming up tomorrow'}${dayTime ? ` — <strong>${dayTime}</strong>` : ''}.</p>
    ${btn(meetLink, 'Join Class Now', timing === '1hr' ? BRAND_COLOR : SAGE_COLOR)}
    <p style="font-size:14px;color:#6b6b6b;margin-top:16px;">Click the link above at class time. It opens directly in your browser — no app needed.</p>
  `);
  return { subject, html };
}
