// One fixed, half-open UTC window. Set both timestamps immediately before launch.
// A missing destination or invalid window fails closed to the original promotion.
export const FOUNDER_EXPERIMENT = {
  id: "founder-socials-2026-10-17",
  startsAt: "2026-10-17T04:25:00.000Z",
  endsAt: "2026-10-17T14:25:00.000Z",
} as const;

export const FOUNDER_SOCIALS = [
  { platform: "beehiiv", label: "Filiksyos newsletter on Beehiiv", href: "https://filiksyos.beehiiv.com/" },
  { platform: "telegram", label: "Filiksyos on Telegram", href: "https://t.me/filiksyos" },
  { platform: "whatsapp", label: "Filiksyos on WhatsApp", href: "https://whatsapp.com/channel/0029VbEVL3dC1FuC80tKFz1u" },
] as const;

export type FounderPlatform = (typeof FOUNDER_SOCIALS)[number]["platform"];
export type ExperimentWindow = { startsAt: string; endsAt: string };

export function validFounderWindow(window: ExperimentWindow): boolean {
  const start = Date.parse(window.startsAt);
  const end = Date.parse(window.endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && end - start === 10 * 60 * 60 * 1000;
}

export function founderExperimentActive(now: number, window: ExperimentWindow = FOUNDER_EXPERIMENT): boolean {
  return validFounderWindow(window) && now >= Date.parse(window.startsAt) && now < Date.parse(window.endsAt);
}

export function founderDestinationsReady(): boolean {
  return FOUNDER_SOCIALS.every(({ href }) => href.startsWith("https://"));
}

// Both clocks are elapsed durations since a server-time sync. Choosing the larger
// prevents a wall-clock adjustment or a sleeping device from extending the run.
export function estimatedServerTime(serverNow: number, elapsedMonotonic: number, elapsedWall: number): number {
  return serverNow + Math.max(0, elapsedMonotonic, elapsedWall);
}
