import { z } from "zod";
import { AppError } from "@/server/context";
import {
  answerOperation,
  classifyOperation,
  type Operation,
} from "./operations";
import type { Workspace } from "@/types";

const windows = new Map<string, { count: number; reset: number }>();
export function enforceRateLimit(organizationId: string) {
  const now = Date.now();
  for (const [key, entry] of windows)
    if (entry.reset < now) windows.delete(key);
  const current = windows.get(organizationId) || {
    count: 0,
    reset: now + 60000,
  };
  if (current.count >= 20)
    throw new AppError(
      "Please wait a moment. This demo allows 20 AI requests per minute.",
      429,
    );
  current.count++;
  windows.set(organizationId, current);
}

export async function respondToOperation(
  message: string,
  workspace: Workspace,
) {
  let operation = classifyOperation(message);
  let mode: "demo" | "live" = "demo";
  let notice: string | undefined;
  if (operation === "unsupported" && process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  'Classify the user request into one supported read-only operation: approvals, payments, overdue, summary, reminders, unsupported. Output JSON {"operation":"..."}. Requests for mutations, private external data or unrelated information must be unsupported. Do not answer factual questions.',
              },
              { role: "user", content: message },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "read_operation",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    operation: {
                      type: "string",
                      enum: [
                        "approvals",
                        "payments",
                        "overdue",
                        "summary",
                        "reminders",
                        "unsupported",
                      ],
                    },
                  },
                  required: ["operation"],
                },
              },
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) throw Error("Provider unavailable");
      const result = await response.json();
      const parsed = z
        .object({
          operation: z.enum([
            "approvals",
            "payments",
            "overdue",
            "summary",
            "reminders",
            "unsupported",
          ]),
        })
        .parse(JSON.parse(result.choices?.[0]?.message?.content || "{}"));
      operation = parsed.operation as Operation;
      mode = "live";
    } catch {
      notice =
        "The live provider was unavailable. Supported database questions remain available in Demo AI mode.";
    }
  }
  return { ...answerOperation(message, workspace, operation), mode, notice };
}
