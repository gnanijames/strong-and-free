import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

export const PRICES = {
  subscription: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
  remote:       process.env.STRIPE_REMOTE_CONSULT_PRICE_ID,
  inperson:     process.env.STRIPE_INPERSON_CONSULT_PRICE_ID,
};

export const BASE_URL = process.env.BASE_URL || 'https://movestrongandfree.com';
