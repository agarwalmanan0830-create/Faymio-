import { NextResponse } from "next/server";
import { api, jsonBody } from "@/server/context";
import { updateAssignment } from "@/server/services";
export const PATCH = api(async (r, c) =>
  NextResponse.json(
    await updateAssignment((await c.params).id, await jsonBody(r)),
  ),
);
