"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { track } from "@vercel/analytics";
import { FOUNDER_EXPERIMENT, FOUNDER_SOCIALS, estimatedServerTime, founderExperimentActive, validFounderWindow, type FounderPlatform } from "@/lib/founder-experiment";

type ClockSync = { serverNow: number; monotonic: number; wall: number };

function SocialIcon({ platform }: { platform: FounderPlatform }) {
  if (platform === "beehiiv") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (platform === "telegram") return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-5 w-5">
      <path d="M21.4 3.7 18.2 20c-.2 1.2-.9 1.5-1.8.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L5.8 13.8 1 12.3c-1-.3-1-1 .2-1.4L20 3.6c.9-.3 1.6.2 1.4 1.1Z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-5 w-5">
      <path d="M20.5 11.7a8.6 8.6 0 0 1-12.8 7.5L3 20.5l1.3-4.6a8.6 8.6 0 1 1 16.2-4.2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m8 7.5 1.5-.2 1 2.4-.9 1a7.1 7.1 0 0 0 2.8 2.8l1-.9 2.4 1-.2 1.5c-.1.9-1.1 1.5-2 1.2a10.6 10.6 0 0 1-6.8-6.8c-.3-.9.3-1.9 1.2-2Z" strokeLinejoin="round" />
    </svg>
  );
}

export function FounderExperimentSlot({ fallback, className }: { fallback: ReactNode; className?: string }) {
  const [active, setActive] = useState(false);
  const sync = useRef<ClockSync | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const impressionSent = useRef(false);

  const isLive = useCallback(() => {
    const clock = sync.current;
    return clock !== null && founderExperimentActive(estimatedServerTime(
      clock.serverNow, performance.now() - clock.monotonic, Date.now() - clock.wall,
    ));
  }, []);

  const trackFounder = useCallback((name: "Founder Card Impression" | "Founder Social Click", platform?: FounderPlatform) => {
    if (!isLive()) return;
    // The existing privacy-preserving Vercel drain supplies its normal identifiers.
    // No emails, phone numbers, custom visitor IDs, or extra storage are collected.
    track(name, {
      experiment: FOUNDER_EXPERIMENT.id,
      placement: "repo-card",
      qa: new URLSearchParams(window.location.search).get("founder_qa") === "1",
      ...(platform ? { platform } : {}),
    });
  }, [isLive]);

  useEffect(() => {
    let disposed = false;
    let lastClock: ClockSync | null = null;
    let request: AbortController | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let cutoffTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      request?.abort();
      request = new AbortController();
      const thisRequest = request;
      clearTimeout(refreshTimer);
      const monotonic = performance.now();
      const wall = Date.now();
      try {
        const response = await fetch("/api/founder-experiment", { cache: "no-store", signal: thisRequest.signal });
        if (!response.ok) throw new Error("Experiment status unavailable");
        const status = await response.json();
        if (disposed || thisRequest.signal.aborted) return;
        if (status.id !== FOUNDER_EXPERIMENT.id || status.startsAt !== FOUNDER_EXPERIMENT.startsAt ||
          status.endsAt !== FOUNDER_EXPERIMENT.endsAt || !Number.isFinite(status.serverNow)) throw new Error("Invalid experiment status");
        lastClock = { serverNow: status.serverNow, monotonic, wall };
        sync.current = lastClock;
        const now = estimatedServerTime(status.serverNow, performance.now() - monotonic, Date.now() - wall);
        const live = status.active === true && founderExperimentActive(now);
        setActive(live);
        clearTimeout(cutoffTimer);
        const untilEnd = Date.parse(FOUNDER_EXPERIMENT.endsAt) - now;
        if (live) cutoffTimer = setTimeout(() => setActive(false), Math.max(0, untilEnd));
        // Stop polling permanently after the absolute deadline, including in open tabs.
        if (untilEnd > 0) {
          const untilStart = Date.parse(FOUNDER_EXPERIMENT.startsAt) - now;
          refreshTimer = setTimeout(refresh, Math.max(100, Math.min(60_000, untilStart > 0 ? untilStart : untilEnd)));
        }
      } catch {
        if (disposed || thisRequest.signal.aborted) return;
        sync.current = null;
        setActive(false); // Fail closed; the original CodeRabbit slot remains available.
        const now = lastClock
          ? estimatedServerTime(lastClock.serverNow, performance.now() - lastClock.monotonic, Date.now() - lastClock.wall)
          : Date.now();
        if (validFounderWindow(FOUNDER_EXPERIMENT) && now < Date.parse(FOUNDER_EXPERIMENT.endsAt)) {
          refreshTimer = setTimeout(refresh, 30_000);
        }
      }
    };
    const resume = () => {
      if (document.visibilityState === "visible") {
        setActive(false); // Never redisplay stale creative after a suspended tab resumes.
        void refresh();
      }
    };
    void refresh();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      disposed = true;
      request?.abort();
      clearTimeout(refreshTimer);
      clearTimeout(cutoffTimer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, []);

  useEffect(() => {
    if (!active || !card.current || impressionSent.current) return;
    let visible = false;
    let dwell: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(dwell);
      if (visible && document.visibilityState === "visible") {
        dwell = setTimeout(() => {
          if (!impressionSent.current && isLive()) {
            impressionSent.current = true;
            trackFounder("Founder Card Impression");
          }
        }, 1000);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      update();
    }, { threshold: [0, 0.5] });
    observer.observe(card.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      clearTimeout(dwell);
      document.removeEventListener("visibilitychange", update);
    };
  }, [active, isLive, trackFounder]);

  const handleSocialClick = (event: MouseEvent<HTMLAnchorElement>, platform: FounderPlatform) => {
    if (!isLive()) { event.preventDefault(); setActive(false); return; }
    trackFounder("Founder Social Click", platform);
  };

  if (!active) return fallback;
  return (
    <div ref={card} data-founder-card={FOUNDER_EXPERIMENT.id} className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-zinc-900/15 bg-white/80 px-3 py-3 ${className ?? ""}`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-[#fff1d6]">
        {/* Original portfolio portrait, cropped with CSS to the face and shoulders. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/founder/filiksyos.png" alt="Filiksyos, founder of GitReverse" width={440} height={440} className="absolute left-1/2 top-[-7px] h-[140px] w-[140px] max-w-none -translate-x-[53%] object-contain" />
      </div>
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-xs font-semibold leading-5 text-zinc-900">hey, I am the founder of gitreverse,</p>
        <p className="text-[11px] leading-5 text-zinc-600">catch me up on my other socials.</p>
      </div>
      <div className="flex items-center gap-2" aria-label="Follow Filiksyos">
        {FOUNDER_SOCIALS.map(({ platform, label, href }) => (
          <a key={platform} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} title={label}
            onClick={(event) => handleSocialClick(event, platform)}
            onAuxClick={(event) => { if (event.button === 1) handleSocialClick(event, platform); }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${platform === "beehiiv" ? "text-[#d64b26]" : platform === "telegram" ? "text-[#1687b9]" : "text-[#168943]"}`}
          ><SocialIcon platform={platform} /></a>
        ))}
      </div>
    </div>
  );
}
