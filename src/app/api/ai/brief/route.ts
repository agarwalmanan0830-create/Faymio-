import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext, jsonBody, handleError } from "@/server/context";
import { db } from "@/lib/db";
import { extractBrief } from "@/lib/ai/brief";
import { enforceRateLimit } from "@/lib/ai/server";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { organizationId } = await getContext();
    const { text } = z
      .object({
        text: z
          .string()
          .trim()
          .min(30, "Please provide at least 30 characters of campaign context.")
          .max(12000),
      })
      .parse(await jsonBody(request));
    enforceRateLimit(organizationId);
    const result = await extractBrief(text);
    await db.aIRequestLog.create({
      data: {
        organizationId,
        operation: "brief_extraction",
        mode: result.mode,
        status: result.notice ? "FALLBACK" : "SUCCESS",
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
