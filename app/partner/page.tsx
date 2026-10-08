import type { Metadata } from "next";
import { PartnerPage } from "@/components/partner-page";

export const metadata: Metadata = {
  title: "Sponsor GitReverse",
  description:
    "Sponsor GitReverse with a small placement in codebase reverse, website reverse, or the GitHub README.",
  robots: { index: false, follow: false },
};

type PartnerRouteProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function PartnerRoute({ searchParams }: PartnerRouteProps) {
  const params = await searchParams;
  const checkoutStatus =
    params.checkout === "success"
      ? "success"
      : params.checkout === "cancelled"
        ? "cancelled"
        : undefined;

  return <PartnerPage checkoutStatus={checkoutStatus} />;
}
