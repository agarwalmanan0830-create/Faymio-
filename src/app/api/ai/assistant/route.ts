import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext, jsonBody, handleError } from "@/server/context";
import { getWorkspace } from "@/server/workspace";
import { db } from "@/lib/db";
import { enforceRateLimit, respondToOperation } from "@/lib/ai/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { organizationId } = await getContext();
    const { message } = z
      .object({ message: z.string().trim().min(3).max(2000) })
      .parse(await jsonBody(request));
    enforceRateLimit(organizationId);
    const result = await respondToOperation(message, await getWorkspace());
    await db.aIRequestLog.create({
      data: {
        organizationId,
        operation: result.operation,
        mode: result.mode,
        status: result.notice ? "FALLBACK" : "SUCCESS",
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
