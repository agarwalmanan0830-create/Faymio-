import { NextResponse } from "next/server";
import { api, jsonBody, assertSameOrigin } from "@/server/context";
import { updateTalent, deleteTalent } from "@/server/services";
export const PATCH = api(async (r, c) =>
  NextResponse.json(await updateTalent((await c.params).id, await jsonBody(r))),
);
export const DELETE = api(async (r, c) => {
  assertSameOrigin(r);
  return NextResponse.json(await deleteTalent((await c.params).id));
});
