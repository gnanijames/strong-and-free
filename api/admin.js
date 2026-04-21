import { stripe } from './_lib/stripe.js';

export default async function handler(req, res) {
  // Simple password protection
  const auth = req.headers['x-admin-password'] || req.query.password;
  if (auth !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now         = Math.floor(Date.now() / 1000);
    const monthStart  = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
    const lastMonth   = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getTime() / 1000);

    // Active subscribers
    const activeSubs = [];
    let hasMore = true;
    let startingAfter;
    while (hasMore) {
      const page = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
        expand: ['data.customer'],
      });
      activeSubs.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length) startingAfter = page.data[page.data.length - 1].id;
    }

    // Failed payments (past due)
    const pastDue = await stripe.subscriptions.list({ status: 'past_due', limit: 100, expand: ['data.customer'] });

    // Revenue this month
    const invoicesThisMonth = await stripe.invoices.list({
      created: { gte: monthStart },
      status: 'paid',
      limit: 100,
    });
    const revenueThisMonth = invoicesThisMonth.data.reduce((sum, i) => sum + i.amount_paid, 0) / 100;

    // Revenue last month
    const invoicesLastMonth = await stripe.invoices.list({
      created: { gte: lastMonth, lt: monthStart },
      status: 'paid',
      limit: 100,
    });
    const revenueLastMonth = invoicesLastMonth.data.reduce((sum, i) => sum + i.amount_paid, 0) / 100;

    // Recent consultations (one-time payments in last 60 days)
    const consultPayments = await stripe.paymentIntents.list({
      created: { gte: now - 60 * 24 * 60 * 60 },
      limit: 50,
    });
    const consultations = consultPayments.data
      .filter(p => p.status === 'succeeded' && p.metadata?.consult_type)
      .map(p => ({
        id:    p.id,
        name:  p.metadata.client_name,
        email: p.metadata.client_email,
        type:  p.metadata.consult_type,
        date:  p.metadata.consult_date,
        time:  p.metadata.consult_time,
        amount: p.amount / 100,
        created: new Date(p.created * 1000).toLocaleDateString('en-CA'),
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Cancellations this month
    const cancelledThisMonth = await stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: monthStart },
      limit: 100,
      expand: ['data.customer'],
    });

    return res.status(200).json({
      summary: {
        activeSubscribers:    activeSubs.length,
        revenueThisMonth:     revenueThisMonth.toFixed(2),
        revenueLastMonth:     revenueLastMonth.toFixed(2),
        failedPayments:       pastDue.data.length,
        cancellationsThisMonth: cancelledThisMonth.data.length,
      },
      subscribers: activeSubs.map(s => ({
        id:          s.id,
        name:        s.customer?.name,
        email:       s.customer?.email,
        startDate:   new Date(s.start_date * 1000).toLocaleDateString('en-CA'),
        renewalDate: new Date(s.current_period_end * 1000).toLocaleDateString('en-CA'),
        amount:      s.items.data[0]?.price?.unit_amount / 100,
      })),
      failedPayments: pastDue.data.map(s => ({
        name:  s.customer?.name,
        email: s.customer?.email,
        since: new Date(s.current_period_end * 1000).toLocaleDateString('en-CA'),
      })),
      recentConsultations: consultations,
      cancellations: cancelledThisMonth.data.map(s => ({
        name:  s.customer?.name,
        email: s.customer?.email,
      })),
    });

  } catch (err) {
    console.error('admin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
