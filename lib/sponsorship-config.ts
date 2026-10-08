/** Public display and server checkout share the same fixed monthly USD catalog. */
export const SPONSORSHIP_PLACEMENTS = {
  codebase: { name: "Codebase reverse", amount: 200000, description: "A small sponsor spot beside codebase reverse results." },
  website: { name: "Website reverse", amount: 200000, description: "A small sponsor spot beside website reverse results." },
  readme: { name: "GitHub README", amount: 20000, description: "Your product in the GitReverse repository README." },
  bundle: { name: "All three", amount: 420000, description: "Codebase reverse, website reverse, and the GitHub README." },
} as const;

export type SponsorshipPlacement = keyof typeof SPONSORSHIP_PLACEMENTS;
export const SPONSOR_CONTACT = "contact@gitmvp.com";
export function formatSponsorPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount / 100);
}
export function isSponsorshipPlacement(value: unknown): value is SponsorshipPlacement {
  return typeof value === "string" && Object.hasOwn(SPONSORSHIP_PLACEMENTS, value);
}
