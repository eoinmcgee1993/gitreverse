import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { parseSponsorshipInput, sponsorshipSessionParams, SPONSORSHIP_PRICE_IDS, validSponsorshipPrice } from "@/lib/sponsorship-checkout";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let input;
  try {
    const text = await req.text();
    if (text.length > 4096) return NextResponse.json({ message: "Request is too large." }, { status: 413 });
    input = parseSponsorshipInput(JSON.parse(text));
  } catch (error) {
    return NextResponse.json({ message: error instanceof SyntaxError ? "Invalid request." : error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return NextResponse.json({ message: "Checkout is temporarily unavailable. Email contact@gitmvp.com." }, { status: 503 });
  // Match the existing Stripe sync integration's API version; upgrade both together.
  const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  try {
    const price = await stripe.prices.retrieve(SPONSORSHIP_PRICE_IDS[input.placement]);
    if (!validSponsorshipPrice(price, input.placement)) {
      return NextResponse.json({ message: "This sponsorship is temporarily unavailable. Email contact@gitmvp.com." }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create(sponsorshipSessionParams(input), {
      idempotencyKey: `gitreverse-sponsor-${input.requestId}`,
    });
    if (!session.url) throw new Error("Missing checkout URL");
    return NextResponse.json({ url: session.url });
  } catch {
    // Never expose Stripe error objects, credentials, or customer details in logs/responses.
    return NextResponse.json({ message: "Could not start checkout. Try again or email contact@gitmvp.com." }, { status: 502 });
  }
}
