import { permanentRedirect } from "next/navigation";

/** Keep old bookmarks and in-flight Stripe returns working. */
export default async function LegacyPartnerRoute({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  permanentRedirect(`/sponsor${query.size ? `?${query.toString()}` : ""}`);
}
