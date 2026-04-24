import { stripe, PRICES, BASE_URL } from './_lib/stripe.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, isGift, recipientName, recipientEmail, discountCode } = req.body;

  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

  // Who receives class access — the subscriber or the gift recipient
  const memberName  = isGift && recipientName  ? recipientName  : name;
  const memberEmail = isGift && recipientEmail ? recipientEmail : email;

  try {
    // Find or create Stripe customer
    const existing = await stripe.customers.list({ email: memberEmail, limit: 1 });
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          name: memberName,
          email: memberEmail,
          metadata: {
            purchaser_name:  name,
            purchaser_email: email,
            is_gift:         isGift ? 'true' : 'false',
            casl_consent:    'true',
            waiver_consent:  'true',
          },
        });

    const sessionParams = {
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: PRICES.subscription, quantity: 1 }],
      success_url: `${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${BASE_URL}/cancel.html`,
      subscription_data: {
        metadata: {
          member_name:  memberName,
          member_email: memberEmail,
        },
      },
      customer_update: { address: 'auto' },
    };

    // Apply discount code if provided
    if (discountCode) {
      const promotionCodes = await stripe.promotionCodes.list({ code: discountCode, active: true, limit: 1 });
      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('create-subscription error:', err);
    return res.status(500).json({ error: 'Could not create checkout session.' });
  }
}
