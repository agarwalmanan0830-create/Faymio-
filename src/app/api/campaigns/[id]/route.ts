import { NextResponse } from "next/server";
import { api, jsonBody, assertSameOrigin } from "@/server/context";
import { updateCampaign, deleteCampaign } from "@/server/services";
export const PATCH = api(async (r, c) =>
  NextResponse.json(
    await updateCampaign((await c.params).id, await jsonBody(r)),
  ),
);
export const DELETE = api(async (r, c) => {
  assertSameOrigin(r);
  return NextResponse.json(await deleteCampaign((await c.params).id));
});
