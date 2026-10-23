import { NextResponse } from "next/server";
import { z } from "zod";
import { getContext, jsonBody, handleError } from "@/server/context";
import { db } from "@/lib/db";
import { briefSchema } from "@/lib/ai/brief";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { organizationId } = await getContext();
    return NextResponse.json(
      await db.briefDraft.findMany({
        where: { organizationId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
    );
  } catch (error) {
    return handleError(error);
  }
}
export async function POST(request: Request) {
  try {
    const { organizationId } = await getContext();
    const body = z
      .object({ content: z.string().max(12000), brief: briefSchema })
      .parse(await jsonBody(request));
    const draft = await db.briefDraft.create({
      data: {
        organizationId,
        title: body.brief.campaignName || "Untitled brief",
        content: body.content,
        structuredJson: JSON.stringify(body.brief),
      },
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
