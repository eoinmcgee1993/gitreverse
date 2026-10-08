"use client";

import { useRef, useState } from "react";
import { formatSponsorPrice, SPONSORSHIP_PLACEMENTS, type SponsorshipPlacement } from "@/lib/sponsorship-config";

const inputClass = "mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60";

export function PartnerCheckoutForm() {
  const [placement, setPlacement] = useState<SponsorshipPlacement>("codebase");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const attempt = useRef<{ payload: string; requestId: string } | null>(null);
  const selected = SPONSORSHIP_PLACEMENTS[placement];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const payload = JSON.stringify({ placement, website: data.get("website"), email: data.get("email"), adCopy: data.get("adCopy") });
    if (attempt.current?.payload !== payload) attempt.current = { payload, requestId: crypto.randomUUID() };
    try {
      const res = await fetch("/api/create-partner-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), requestId: attempt.current.requestId }),
      });
      const result = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !result.url) throw new Error(result.message || "Could not start checkout. Please try again.");
      const checkoutUrl = new URL(result.url);
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") throw new Error("Could not open secure checkout.");
      window.location.assign(checkoutUrl.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <fieldset disabled={loading}>
        <legend className="mb-3 text-sm font-semibold">Choose your placement</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(SPONSORSHIP_PLACEMENTS) as [SponsorshipPlacement, typeof selected][]).map(([id, option]) => (
            <label key={id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 ${placement === id ? "border-zinc-900 bg-[#fff4da]" : "border-zinc-200 bg-white hover:border-zinc-400"}`}>
              <input type="radio" name="placement" value={id} checked={placement === id} onChange={() => setPlacement(id)} className="mt-1 accent-zinc-900" />
              <span><span className="block text-sm font-semibold">{option.name}</span><span className="mt-1 block text-xl font-bold">{formatSponsorPrice(option.amount)} <span className="text-xs font-normal text-zinc-500">USD / month</span></span><span className="mt-2 block text-xs leading-relaxed text-zinc-600">{option.description}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="sponsor-website">Your website<input id="sponsor-website" name="website" type="text" inputMode="url" autoComplete="url" placeholder="yourcompany.com" maxLength={450} required disabled={loading} className={inputClass} /></label>
        <label className="text-sm font-medium" htmlFor="sponsor-email">Contact email<input id="sponsor-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required disabled={loading} className={inputClass} /></label>
      </div>
      <label className="block text-sm font-medium" htmlFor="sponsor-copy">One-line ad copy<input id="sponsor-copy" name="adCopy" type="text" placeholder="What does your product help builders do?" minLength={5} maxLength={120} required disabled={loading} className={inputClass} /><span className="mt-1.5 block text-xs font-normal text-zinc-500">Up to 120 characters. We’ll arrange the final creative with you.</span></label>
      <p className="text-sm leading-relaxed text-zinc-600">Billed monthly in USD until cancelled. Pay securely with Stripe. After payment is verified, we’ll arrange your placement manually.</p>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60">{loading ? "Opening Stripe…" : `Buy sponsorship · ${formatSponsorPrice(selected.amount)}/month`}</button>
    </form>
  );
}
