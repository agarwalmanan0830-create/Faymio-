import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { createCampaign } from "@/server/services";
export const POST = api(async (r) =>
  NextResponse.json(await createCampaign(await jsonBody(r)), { status: 201 }),
);
