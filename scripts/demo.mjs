import process from "node:process";
import { constants, copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function requireSupportedNode(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (!Number.isInteger(major) || major < 22 || (major === 22 && minor < 12)) {
    throw new Error(
      "Faymio needs Node.js 22.12 or later. Install the current Node.js LTS from https://nodejs.org, then try again.",
    );
  }
}

export function parsePort(value) {
  if (value === undefined) return 3000;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error("FAYMIO_PORT must be a whole number between 1 and 65535.");
  }
  return Number(value);
}

export function ensureEnvironmentFile(directory = projectRoot) {
  try {
    // COPYFILE_EXCL also protects an existing .env if two launches overlap.
    copyFileSync(
      join(directory, ".env.example"),
      join(directory, ".env"),
      constants.COPYFILE_EXCL,
    );
    return "created";
  } catch (error) {
    if (error.code === "EEXIST") return "existing";
    throw new Error(
      "Could not prepare .env. Keep .env.example in the project folder and make sure the folder is writable.",
    );
  }
}

export function dependenciesMissing(directory = projectRoot) {
  const manifest = JSON.parse(
    readFileSync(join(directory, "package.json"), "utf8"),
  );
  return Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  }).some(
    (name) =>
      !existsSync(
        join(directory, "node_modules", ...name.split("/"), "package.json"),
      ),
  );
}

export async function assertPortAvailable(port) {
  await new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", (error) => {
      reject(
        new Error(
          error.code === "EADDRINUSE"
            ? `Port ${port} is already in use. Close the other app, or choose another port with FAYMIO_PORT (for example 3010). Faymio did not stop any existing process.`
            : `Cannot use local port ${port}. Choose another FAYMIO_PORT and try again.`,
        ),
      );
    });
    probe.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      probe.close((error) => (error ? reject(error) : resolvePort()));
    });
  });
}

export async function waitForWorkspace(
  url,
  {
    signal,
    timeoutMs = 120_000,
    pollIntervalMs = 500,
    label = "workspace API",
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error("Startup cancelled.");
    try {
      const response = await fetch(url, {
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
          : AbortSignal.timeout(4000),
        redirect: "error",
      });
      lastStatus = response.status;
      await response.body?.cancel();
      if (response.status === 200) return;
    } catch {
      if (signal?.aborted) throw new Error("Startup cancelled.");
    }
    try {
      await delay(pollIntervalMs, undefined, { signal });
    } catch {
      throw new Error("Startup cancelled.");
    }
  }
  throw new Error(
    `Faymio did not become ready within ${Math.round(timeoutMs / 1000)} seconds.${lastStatus ? ` The ${label} returned HTTP ${lastStatus}.` : ""} Check the server output above and confirm DEMO_MODE=true in .env.`,
  );
}

export function browserCommand(platform, url) {
  if (platform === "darwin") return { command: "open", args: [url] };
  if (platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `start "" "${url}"`],
    };
  }
  return { command: "xdg-open", args: [url] };
}

function openBrowser(url) {
  if (process.env.FAYMIO_NO_OPEN === "1") return;
  const { command, args } = browserCommand(process.platform, url);
  try {
    const opener = spawn(command, args, { detached: true, stdio: "ignore" });
    let reported = false;
    const report = () => {
      if (reported) return;
      reported = true;
      console.log(
        `Could not open a browser automatically. Open ${url} in your browser.`,
      );
    };
    opener.once("error", report);
    opener.once("exit", (code) => {
      if (code !== 0) report();
    });
    opener.unref();
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
}

function npmCommand(args) {
  const runtimeDirectory = dirname(process.execPath);
  const candidates = [
    process.env.npm_execpath,
    join(runtimeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
    resolve(
      runtimeDirectory,
      "..",
      "lib",
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    ),
  ];
  const cli = candidates.find(
    (candidate) => candidate && existsSync(candidate),
  );
  if (cli) return { command: process.execPath, args: [cli, ...args] };
  // Windows .cmd files need cmd.exe. Every npm argument here is a fixed literal;
  // user input such as the port is passed directly to Node, never to a shell.
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", `npm ${args.join(" ")}`],
    };
  }
  return { command: "npm", args };
}

function startProcess(command, args, env = process.env) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  const completion = new Promise((resolveChild) => {
    child.once("error", (error) => resolveChild({ error }));
    child.once("exit", (code, signal) => resolveChild({ code, signal }));
  });
  return { child, completion };
}

async function endsWithin(completion, milliseconds) {
  let timer;
  const ended = await Promise.race([
    completion.then(() => true),
    new Promise((resolveTimeout) => {
      timer = setTimeout(() => resolveTimeout(false), milliseconds);
    }),
  ]);
  clearTimeout(timer);
  return ended;
}

async function stopOwnedProcess(managed) {
  if (!managed?.child.pid) return;
  const { child, completion } = managed;
  if (process.platform === "win32") {
    // Only this launcher's child PID and its descendants are targeted.
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await new Promise((resolveKill) => {
      killer.once("error", () => {
        child.kill();
        resolveKill();
      });
      killer.once("exit", resolveKill);
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
    if (!(await endsWithin(completion, 5000))) {
      process.kill(-child.pid, "SIGKILL");
      await endsWithin(completion, 2000);
    }
  } catch (error) {
    if (error.code !== "ESRCH") {
      console.error(
        "Could not stop the Faymio child process cleanly. Close this terminal if it remains active.",
      );
    }
  }
}

export async function main() {
  requireSupportedNode();
  const port = parsePort(process.env.FAYMIO_PORT);
  await assertPortAvailable(port);
  const environment = ensureEnvironmentFile();
  console.log("\nFAYMIO · The Professional World of Entertainment\n");
  if (environment === "created")
    console.log("Created your local .env from .env.example.");
  try {
    process.loadEnvFile(join(projectRoot, ".env"));
  } catch {
    throw new Error(
      "Could not load .env. Check its formatting and file permissions.",
    );
  }
  if (process.env.DEMO_MODE !== "true") {
    throw new Error(
      "Local demo access is disabled. Set DEMO_MODE=true in your .env to run this demonstration workspace.",
    );
  }

  const stop = new AbortController();
  let active;
  let shutdown;
  let signalExitCode = 0;
  const onSignal = (signal) => {
    if (shutdown) return;
    signalExitCode = signal === "SIGINT" ? 130 : 143;
    stop.abort();
    console.log("\nStopping Faymio…");
    shutdown = stopOwnedProcess(active);
  };
  const onInterrupt = () => onSignal("SIGINT");
  const onTerminate = () => onSignal("SIGTERM");
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);
  const runNpm = async (args, description) => {
    if (stop.signal.aborted) return;
    console.log(description);
    const invocation = npmCommand(args);
    active = startProcess(invocation.command, invocation.args);
    const result = await active.completion;
    active = undefined;
    if (stop.signal.aborted) return;
    if (result.error) {
      throw new Error(
        "Could not run npm. Install Node.js with npm, reopen your terminal, and try again.",
      );
    }
    if (result.code !== 0) {
      throw new Error(
        `${description} did not finish successfully. Review the error above, then run npm run demo again.`,
      );
    }
  };
  try {
    if (dependenciesMissing()) {
      await runNpm(
        ["ci", "--include=dev"],
        "Installing Faymio dependencies (the first launch can take a few minutes)…",
      );
    }
    await runNpm(
      ["run", "setup"],
      "Preparing the local database and preserving any existing demo edits…",
    );
    if (stop.signal.aborted) return;
    // A fresh port check catches conflicts that arose during installation.
    await assertPortAvailable(port);
    console.log(`Starting Faymio at http://127.0.0.1:${port}…`);
    active = startProcess(
      process.execPath,
      [
        join(projectRoot, "node_modules", "next", "dist", "bin", "next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { ...process.env, NODE_ENV: "development" },
    );
    const server = active;
    const readiness = new AbortController();
    try {
      await Promise.race([
        (async () => {
          const signal = AbortSignal.any([stop.signal, readiness.signal]);
          await waitForWorkspace(`http://127.0.0.1:${port}/api/workspace`, {
            signal,
          });
          console.log("Preparing the dashboard for your first visit…");
          await waitForWorkspace(`http://127.0.0.1:${port}/dashboard`, {
            signal,
            label: "dashboard",
          });
        })(),
        server.completion.then(() => {
          throw new Error(
            "Faymio stopped before the workspace was ready. Review the server error above and try again.",
          );
        }),
      ]);
    } finally {
      readiness.abort();
    }
    if (stop.signal.aborted) return;
    const url = `http://127.0.0.1:${port}/dashboard`;
    console.log(
      `\nFaymio is ready: ${url}\nKeep this terminal open. Press Ctrl+C to stop.\n`,
    );
    openBrowser(url);
    const result = await server.completion;
    if (!stop.signal.aborted && (result.error || result.code !== 0)) {
      throw new Error(
        "The Faymio server stopped unexpectedly. Review its output above and run npm run demo again.",
      );
    }
  } catch (error) {
    if (!stop.signal.aborted) throw error;
  } finally {
    if (shutdown) await shutdown;
    else await stopOwnedProcess(active);
    process.off("SIGINT", onInterrupt);
    process.off("SIGTERM", onTerminate);
    if (signalExitCode) process.exitCode = signalExitCode;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`\n${error.message}\n`);
    process.exitCode = 1;
  });
}
