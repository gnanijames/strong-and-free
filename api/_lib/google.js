import { google } from 'googleapis';

const SEND_AS = process.env.COACH_EMAIL || 'hello@movestrongandfree.com';

function getAuth(subject) {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
    ],
    subject,
  });
}

export function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth(SEND_AS) });
}

export function getGmail() {
  return google.gmail({ version: 'v1', auth: getAuth(SEND_AS) });
}

export const COACH_EMAIL    = SEND_AS;
export const CALENDAR_ID    = process.env.GOOGLE_CALENDAR_ID || 'primary';
export const CLASS_CALENDAR = process.env.CLASS_CALENDAR_ID;

// Encode and send an email via Gmail API
export async function sendEmail({ to, subject, html, replyTo }) {
  const gmail = getGmail();
  const from  = `Strong and Free <${COACH_EMAIL}>`;
  const msg   = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].filter(Boolean).join('\r\n');

  const encoded = Buffer.from(msg).toString('base64url');
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  });
}
