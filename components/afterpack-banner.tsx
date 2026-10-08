"use client";

import { track } from "@vercel/analytics";

export function AfterpackBanner({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://afterpack.dev"
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => track("Sponsor Click", { sponsor: "afterpack", placement: "website-card" })}
      className={`group flex items-center gap-3 rounded-lg border-[2px] border-zinc-900/15 bg-white/70 px-3 py-2.5 transition-colors hover:bg-white ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/sponsors/afterpack-mark.png" alt="Afterpack" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-zinc-900">Wanna make your site irreversible?</p>
        <p className="text-[11px] text-zinc-600">Make sure you use Afterpack</p>
      </div>
      <span className="shrink-0 rounded border-[2px] border-zinc-900 bg-[#FF570A] px-2.5 py-1 text-[11px] font-semibold text-white">Try free</span>
      <span className="sr-only">Sponsored — opens Afterpack in a new tab</span>
    </a>
  );
}
