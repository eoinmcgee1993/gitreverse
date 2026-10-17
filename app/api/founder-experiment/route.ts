import { FOUNDER_EXPERIMENT, founderDestinationsReady, founderExperimentActive } from "@/lib/founder-experiment";

export const dynamic = "force-dynamic";

export async function GET() {
  const serverNow = Date.now();
  return Response.json({
    ...FOUNDER_EXPERIMENT,
    serverNow,
    active: founderDestinationsReady() && founderExperimentActive(serverNow),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
