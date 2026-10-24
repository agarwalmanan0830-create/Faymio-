import { NextResponse } from "next/server";
import { api } from "@/server/context";
import { getWorkspace } from "@/server/workspace";
export const GET = api(async () => NextResponse.json(await getWorkspace()));
export const dynamic = "force-dynamic";
