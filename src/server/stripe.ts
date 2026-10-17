import Stripe from "stripe";
import type { Charger } from "./payments";

// Stripe test mode only. Refuses to run with a live key. Each helper share is
// one PaymentIntent confirmed with Stripe's test card token, so judges can look
// up the IDs in the test dashboard. No real money moves.

export function stripeCharger(secretKey = process.env.STRIPE_SECRET_KEY): Charger {
  if (!secretKey?.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY must be a test key (sk_test_)");
  const stripe = new Stripe(secretKey);
  return async (c) => {
    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: c.amount,
          currency: c.currency.toLowerCase(),
          payment_method: "pm_card_visa",
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          confirm: true,
          description: c.description,
          metadata: { requestId: c.requestId, memberId: c.memberId, payeeId: c.payeeId, demo: "true" },
        },
        { idempotencyKey: c.idempotencyKey },
      );
      return pi.status === "succeeded" ? { ok: true, ref: pi.id } : { ok: false, error: `payment intent ${pi.status}` };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };
}
