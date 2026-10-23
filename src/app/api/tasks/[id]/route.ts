import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { updateTask } from "@/server/services";
export const PATCH = api(async (r, c) => {
  const body = await jsonBody(r);
  return NextResponse.json(await updateTask((await c.params).id, body.status));
});
