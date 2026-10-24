import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { addNote } from "@/server/services";
export const POST = api(async (r, c) => {
  const body = await jsonBody(r);
  return NextResponse.json(await addNote((await c.params).id, body.note), {
    status: 201,
  });
});
