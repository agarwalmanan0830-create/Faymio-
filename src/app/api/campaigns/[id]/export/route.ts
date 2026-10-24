import { api } from "@/server/context";
import { exportCampaign } from "@/server/services";
export const GET = api(
  async (_r, c) =>
    new Response(await exportCampaign((await c.params).id), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="faymio-campaign.csv"',
        "Cache-Control": "no-store",
      },
    }),
);
