import { stripe, PRICES, BASE_URL } from './_lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, notes, type, price, date, time } = req.body;

  if (!name || !email || !type || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const priceId = type === 'inperson' ? PRICES.inperson : PRICES.remote;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/success.html?type=consult&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/book.html`,
      customer_email: email,
      payment_intent_data: {
        metadata: {
          client_name:   name,
          client_email:  email,
          client_phone:  phone  || '',
          consult_notes: notes  || '',
          consult_type:  type,
          consult_date:  date,
          consult_time:  time,
        },
      },
      metadata: {
        client_name:   name,
        client_email:  email,
        client_phone:  phone  || '',
        consult_notes: notes  || '',
        consult_type:  type,
        consult_date:  date,
        consult_time:  time,
      },
      automatic_tax: { enabled: true },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('create-consultation error:', err);
    return res.status(500).json({ error: 'Could not create checkout session.' });
  }
}
