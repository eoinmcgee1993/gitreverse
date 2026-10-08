import { STRIPE_PRICE_IDS } from "./billing-config";

const PREMIUM_PRICES = new Set<string>([
  STRIPE_PRICE_IDS.legacyUnlimited,
  STRIPE_PRICE_IDS.starter,
  STRIPE_PRICE_IDS.pro,
  STRIPE_PRICE_IDS.unlimited,
]);

/** Never cancel sponsorships or a mixed subscription from the Premium account action. */
export function isPremiumOnlySubscription(subscription: {
  metadata?: Record<string, string>;
  items: { data: { price: { id: string } }[]; has_more?: boolean };
}): boolean {
  if (subscription.metadata?.type === "sponsorship" || subscription.metadata?.type === "partner") return false;
  const items = subscription.items;
  return !items.has_more && items.data.length > 0 && items.data.every((item) => PREMIUM_PRICES.has(item.price.id));
}
