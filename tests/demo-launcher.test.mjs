import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import {
  requireSupportedNode,
  parsePort,
  ensureEnvironmentFile,
  dependenciesMissing,
  assertPortAvailable,
  waitForWorkspace,
  browserCommand,
} from "../scripts/demo.mjs";

test("requires the supported Node runtime before doing any setup", () => {
  for (const version of ["18.20.0", "20.19.0", "22.11.0"]) {
    assert.throws(() => requireSupportedNode(version), /22\.12 or later/);
  }
  for (const version of ["22.12.0", "22.20.0", "24.0.0"]) {
    assert.doesNotThrow(() => requireSupportedNode(version));
  }
});

test("validates the selected port without accepting shell syntax", () => {
  assert.equal(parsePort(undefined), 3000);
  assert.equal(parsePort("3010"), 3010);
  for (const value of [
    "",
    "0",
    "65536",
    "-1",
    "3010.5",
    " 3010",
    "3010;echo unexpected",
  ]) {
    assert.throws(() => parsePort(value), /whole number/);
  }
});

test("copies .env once and never overwrites local configuration", () => {
  const directory = mkdtempSync(join(tmpdir(), "faymio-launch-env-"));
  try {
    writeFileSync(join(directory, ".env.example"), "DEMO_MODE=true\n");
    assert.equal(ensureEnvironmentFile(directory), "created");
    assert.equal(
      readFileSync(join(directory, ".env"), "utf8"),
      "DEMO_MODE=true\n",
    );
    writeFileSync(
      join(directory, ".env"),
      "EXISTING_LOCAL_CONFIGURATION=preserved\n",
    );
    assert.equal(ensureEnvironmentFile(directory), "existing");
    assert.equal(
      readFileSync(join(directory, ".env"), "utf8"),
      "EXISTING_LOCAL_CONFIGURATION=preserved\n",
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("detects missing direct dependencies before attempting setup", () => {
  const directory = mkdtempSync(join(tmpdir(), "faymio-launch-deps-"));
  try {
    writeFileSync(
      join(directory, "package.json"),
      JSON.stringify({
        dependencies: { next: "15.5.9" },
        devDependencies: { "@prisma/client": "6.19.0" },
      }),
    );
    assert.equal(dependenciesMissing(directory), true);
    for (const name of ["next", "@prisma/client"]) {
      const destination = join(directory, "node_modules", ...name.split("/"));
      mkdirSync(destination, { recursive: true });
      writeFileSync(join(destination, "package.json"), "{}");
    }
    assert.equal(dependenciesMissing(directory), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("refuses a busy port without stopping its existing server", async () => {
  const server = createServer((_, response) => response.end("existing app"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await assert.rejects(assertPortAvailable(port), /already in use/);
    assert.equal((await fetch(`http://127.0.0.1:${port}`)).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("waits for the workspace API to return 200 rather than merely accepting a connection", async () => {
  let requests = 0;
  const server = createServer((request, response) => {
    assert.equal(request.url, "/api/workspace");
    requests += 1;
    response.writeHead(requests === 1 ? 503 : 200, {
      "Content-Type": "application/json",
    });
    response.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await waitForWorkspace(
      `http://127.0.0.1:${server.address().port}/api/workspace`,
      { pollIntervalMs: 5, timeoutMs: 1000 },
    );
    assert.equal(requests, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("readiness reports HTTP failures and supports cancellation", async () => {
  const server = createServer((_, response) => {
    response.writeHead(403);
    response.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/workspace`;
  try {
    await assert.rejects(
      waitForWorkspace(url, { pollIntervalMs: 5, timeoutMs: 30 }),
      /HTTP 403/,
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      waitForWorkspace(url, { signal: controller.signal }),
      /cancelled/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("uses the native browser opener for each supported desktop platform", () => {
  const url = "http://127.0.0.1:3010/dashboard";
  assert.deepEqual(browserCommand("darwin", url), {
    command: "open",
    args: [url],
  });
  assert.deepEqual(browserCommand("win32", url), {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", `start "" "${url}"`],
  });
  assert.deepEqual(browserCommand("linux", url), {
    command: "xdg-open",
    args: [url],
  });
});
