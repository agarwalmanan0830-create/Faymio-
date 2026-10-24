import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { createTask } from "@/server/services";
export const POST = api(async (r, c) =>
  NextResponse.json(await createTask((await c.params).id, await jsonBody(r)), {
    status: 201,
  }),
);
