"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";

export function AfterpackBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-white/70 px-3 py-2.5 text-xs ${className}`}>
      <a
        href="https://afterpack.dev"
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={() => track("Sponsor Click", { sponsor: "afterpack", placement: "website-card" })}
        className="flex min-w-0 flex-1 items-center gap-3 text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sponsors/afterpack.svg" alt="Afterpack" width={107} height={24} className="h-6 w-[107px] shrink-0 object-contain" />
        <span>Want to make your website irreversible? <span className="font-semibold text-zinc-900 underline underline-offset-2">Try Afterpack.</span></span>
        <span className="sr-only"> Sponsored, opens in a new tab</span>
      </a>
      <Link href="/sponsor" className="shrink-0 text-[10px] text-zinc-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">Sponsor this spot</Link>
    </div>
  );
}
