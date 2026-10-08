import type Stripe from "stripe";
import { isSponsorshipPlacement, SPONSORSHIP_PLACEMENTS, type SponsorshipPlacement } from "./sponsorship-config";

/** Verified live monthly prices; never accept a price or amount from the browser. */
export const SPONSORSHIP_PRICE_IDS: Record<SponsorshipPlacement, string> = {
  codebase: "price_1UOAVYIBG5KwEK8aXuhe3p5n",
  website: "price_1UOAVcIBG5KwEK8aEDvsKyed",
  readme: "price_1UOAVjIBG5KwEK8aFizajkv5",
  bundle: "price_1UOAVfIBG5KwEK8aAkie7wkd",
};

export type SponsorshipInput = { placement: SponsorshipPlacement; website: string; email: string; adCopy: string; requestId: string };
export function parseSponsorshipInput(body: unknown): SponsorshipInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Enter your sponsorship details.");
  const raw = body as Record<string, unknown>;
  if (!isSponsorshipPlacement(raw.placement)) throw new Error("Choose a sponsorship placement.");
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const inputUrl = typeof raw.website === "string" ? raw.website.trim() : "";
  if (!inputUrl || inputUrl.length > 450) throw new Error("Enter a valid website URL (up to 450 characters).");
  let website: string;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(inputUrl) ? inputUrl : `https://${inputUrl}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) throw new Error();
    website = url.toString();
    if (website.length > 500) throw new Error();
  } catch { throw new Error("Enter a valid HTTP or HTTPS website URL without login details."); }
  const adCopy = typeof raw.adCopy === "string" ? raw.adCopy.trim() : "";
  if (adCopy.length < 5 || adCopy.length > 120 || /[\u0000-\u001f\u007f]/.test(adCopy)) throw new Error("Use 5–120 characters of single-line ad copy.");
  const requestId = typeof raw.requestId === "string" ? raw.requestId : "";
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw new Error("Refresh the page and try again.");
  return { placement: raw.placement, website, email, adCopy, requestId };
}

export function validSponsorshipPrice(price: Stripe.Price, placement: SponsorshipPlacement): boolean {
  return price.id === SPONSORSHIP_PRICE_IDS[placement] && price.active && price.livemode &&
    price.currency === "usd" && price.unit_amount === SPONSORSHIP_PLACEMENTS[placement].amount &&
    price.type === "recurring" && price.recurring?.interval === "month" && price.recurring.interval_count === 1 &&
    price.recurring.usage_type === "licensed";
}

export function sponsorshipSessionParams(input: SponsorshipInput): Stripe.Checkout.SessionCreateParams {
  const metadata = { app: "gitreverse", type: "sponsorship", placement: input.placement,
    partner_website: input.website, partner_email: input.email, ad_copy: input.adCopy };
  return {
    mode: "subscription",
    line_items: [{ price: SPONSORSHIP_PRICE_IDS[input.placement], quantity: 1 }],
    // Fixed trusted origin. A user-controlled Origin header must never set redirect targets.
    success_url: "https://gitreverse.com/partner?checkout=success",
    cancel_url: "https://gitreverse.com/partner?checkout=cancelled",
    customer_email: input.email,
    metadata,
    subscription_data: { metadata },
    custom_text: { submit: { message: "Monthly sponsorship. Filiksyos manually places your ad after payment. Contact contact@gitmvp.com for placement or cancellation." } },
  };
}
