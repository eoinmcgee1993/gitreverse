import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { parseSponsorshipInput, createSponsorshipSession, safeStripeFailure } from "@/lib/sponsorship-checkout";

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
    // Exact, immutable server-owned price IDs are validated in our catalog tests.
    // Checkout validates the selected price itself; a separate Prices-read call
    // would unnecessarily require broader permissions on the existing key.
    const session = await createSponsorshipSession(stripe, input);
    if (!session.url) throw new Error("Missing checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Log only fixed classifications, never messages, credentials, or customer data.
    console.error("[sponsorship-checkout]", safeStripeFailure(error));
    return NextResponse.json({ message: "Could not start checkout. Try again or email contact@gitmvp.com." }, { status: 502 });
  }
}
