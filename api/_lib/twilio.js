const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM_RAW    = process.env.TWILIO_WHATSAPP_FROM || '';
const FROM        = FROM_RAW.startsWith('whatsapp:') ? FROM_RAW : `whatsapp:${FROM_RAW}`;

export async function sendWhatsApp(to, body) {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_RAW) return;

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: FROM, To: toFormatted, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twilio ${err.code}: ${err.message}`);
  }
  return res.json();
}
