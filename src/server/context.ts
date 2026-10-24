import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function getContext() {
  if (
    process.env.DEMO_MODE !== "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.ALLOW_DEMO_IN_PRODUCTION !== "true")
  )
    throw new AppError(
      "This local demo is disabled. Set DEMO_MODE=true for local use; production demo hosting requires explicit ALLOW_DEMO_IN_PRODUCTION=true.",
      403,
    );
  const org = await db.organization.findUnique({ where: { id: "demo-org" } });
  const user = await db.user.findFirst({
    where: { organizationId: "demo-org" },
  });
  if (!org?.isDemo || !user)
    throw new AppError(
      "Demo workspace is not initialized. Run npm run setup.",
      503,
    );
  return { organizationId: org.id, userId: user.id };
}
function parseOrigin(value: string): string {
  try {
    const parsed = new URL(value);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      throw new Error("Invalid origin");
    return parsed.origin;
  } catch {
    throw new AppError("Request origin is invalid.", 403);
  }
}

export function assertSameOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  // Non-browser clients may omit Origin. Browsers attach it to these mutations.
  if (originHeader === null) return;
  const origin = parseOrigin(originHeader);
  const configuredOrigin = process.env.APP_ORIGIN;
  let expectedOrigin: string;
  if (configuredOrigin) {
    // Configure this explicitly when HTTPS terminates at a reverse proxy.
    expectedOrigin = parseOrigin(configuredOrigin);
  } else {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    if (host && (/[\s/@?#\\]/.test(host) || host.includes(",")))
      throw new AppError("Request host is invalid.", 403);
    // Next may normalize request.url to its internal bind address. The incoming
    // Host is the browser-facing authority; forwarded host headers are ignored.
    expectedOrigin = parseOrigin(
      host ? `${requestUrl.protocol}//${host}` : requestUrl.origin,
    );
  }
  if (origin !== expectedOrigin)
    throw new AppError("Cross-origin requests are not permitted.", 403);
}
export async function jsonBody(request: Request) {
  assertSameOrigin(request);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 100000) throw new AppError("Request is too large.", 413);
  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new AppError("Could not read request body.");
  }
  if (text.length > 100000) throw new AppError("Request is too large.", 413);
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new AppError("Invalid JSON request.");
  }
}
export function handleError(error: unknown) {
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error && typeof error === "object" && "issues" in error)
    return NextResponse.json(
      {
        error: (error as { issues: { message: string }[] }).issues
          .map((i) => i.message)
          .join("; "),
      },
      { status: 400 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  )
    return NextResponse.json(
      { error: "This record already exists in the campaign." },
      { status: 409 },
    );
  console.error(
    "Faymio request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "Unable to complete this request. Please try again." },
    { status: 500 },
  );
}
export function api(
  handler: (request: Request, context: any) => Promise<Response>,
) {
  return async (request: Request, context: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleError(error);
    }
  };
}
