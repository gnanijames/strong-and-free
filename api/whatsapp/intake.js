import { kget, kset } from '../_lib/upstash.js';
import { sendEmail, COACH_EMAIL } from '../_lib/google.js';

const SUBSCRIBE_URL = 'https://www.movestrongandfree.com/subscribe.html';

function twiml(msg) {
  const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const from = (req.body?.From || '').replace('whatsapp:', '').trim();
  const text = (req.body?.Body || '').trim();

  if (!from) return res.status(400).end();

  const key = `wa_intake_${from.replace(/\D/g, '')}`;
  const state = await kget(key) || { step: 0 };

  let reply;
  let next = { ...state };

  if (state.step === 0) {
    reply = `Welcome to Strong and Free! 👋\n\nWe help adults 55+ build strength, balance, and confidence — from home, once a week on Google Meet.\n\nWhat's your first name?`;
    next.step = 1;

  } else if (state.step === 1) {
    next.name = text;
    next.step = 2;
    reply = `Great to meet you, ${text}! 🙌\n\nWhat brings you here — are you looking to build strength, improve your balance, or just stay active and healthy as you age?`;

  } else if (state.step === 2) {
    next.goal = text;
    next.step = 3;
    reply = `That's exactly what our program is built for.\n\nDo you have any injuries or health conditions we should know about? (Type "none" if not)`;

  } else if (state.step === 3) {
    next.health = text;
    next.step = 4;

    reply = [
      `Thank you, ${state.name}! Here's everything you need to get started:\n`,
      `📅 Classes: Mon, Wed, or Fri at 10:00 AM Eastern Time`,
      `💻 Via Google Meet — opens in any browser, no app to download`,
      `💳 $89/month — cancel anytime\n`,
      `👉 Join here: ${SUBSCRIBE_URL}\n`,
      `Any questions? Just reply here. See you in class! 💪`,
    ].join('\n');

    // Notify Gnani of a completed lead
    try {
      await sendEmail({
        to: COACH_EMAIL,
        subject: `New WhatsApp lead: ${state.name}`,
        html: `
          <h2>New intake completed via WhatsApp</h2>
          <table style="font-size:15px;border-collapse:collapse;">
            <tr><td style="padding:6px 16px 6px 0;color:#666;">Name</td><td><strong>${state.name}</strong></td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;">Phone</td><td>${from}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;">Goal</td><td>${state.goal}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;">Health</td><td>${text}</td></tr>
          </table>
          <p style="margin-top:16px;">They've been sent the checkout link automatically.</p>
        `,
      });
    } catch (err) {
      console.error('Lead notification email failed:', err.message);
    }

  } else {
    // Already completed — friendly catch-all
    reply = `Hi ${state.name || 'there'}! 👋 If you have questions about joining Strong and Free, just ask. Or head straight to ${SUBSCRIBE_URL} to get started.`;
  }

  await kset(key, next, 7 * 24 * 60 * 60); // keep for 7 days

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml(reply));
}
