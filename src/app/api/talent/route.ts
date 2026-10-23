import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { createTalent } from "@/server/services";
export const POST = api(async (r) =>
  NextResponse.json(await createTalent(await jsonBody(r)), { status: 201 }),
);
