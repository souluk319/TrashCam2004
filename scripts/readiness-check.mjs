import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const blockers = [];
const notes = [];

function pass(message) {
  console.log(`ok - ${message}`);
}

function warn(message) {
  notes.push(message);
  console.log(`note - ${message}`);
}

function block(message) {
  blockers.push(message);
  console.log(`needs-approval - ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function commandResult(command, args = []) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function commandVersion(command, args = ["--version"]) {
  const result = commandResult(command, args);

  if (result.status !== 0) {
    return null;
  }

  return (result.stdout || result.stderr).trim();
}

const packageJson = readJson("package.json");

console.log("TrashCam 2004 readiness check\n");

if (basename(root) === "trashcam-2004") {
  pass("running from trashcam-2004 project root");
} else {
  block(`run from trashcam-2004 project root, currently ${root}`);
}

if (packageJson.scripts?.smoke === "npm run build && node scripts/smoke-check.mjs") {
  pass("smoke script is wired to build and source checks");
} else {
  block("smoke script contract changed; inspect package.json before deploying");
}

if (packageJson.scripts?.readiness === "npm run smoke && node scripts/readiness-check.mjs") {
  pass("readiness script includes smoke before external checks");
} else {
  block("readiness script contract changed; inspect package.json before deploying");
}

if (existsSync(join(root, "dist", "index.html"))) {
  pass("dist exists from latest smoke/build run");
} else {
  block("dist/index.html missing; run npm run smoke before deployment");
}

const nodeVersion = commandVersion("node");
const npmVersion = commandVersion("npm");
const vercelVersion = commandVersion("vercel");

if (nodeVersion) {
  pass(`node available: ${nodeVersion}`);
} else {
  block("node command is unavailable");
}

if (npmVersion) {
  pass(`npm available: ${npmVersion}`);
} else {
  block("npm command is unavailable");
}

if (vercelVersion) {
  pass(`vercel CLI available: ${vercelVersion}`);
} else {
  block("vercel CLI is not installed or not on PATH; install/use it only after approval");
}

warn("desktop real-camera permission test still requires explicit approval before accepting the prompt");
warn("actual PNG download/share usability still requires a real browser/device check");
warn("HTTPS deployment changes external state and still requires approval");
warn("goal completion requires at least one real phone to complete camera preview and PNG save/share");

console.log("\nSummary:");

if (blockers.length === 0) {
  console.log("- local and tooling preflight passed");
} else {
  console.log(`- ${blockers.length} item(s) need attention or approval before deployment`);
}

if (notes.length > 0) {
  console.log(`- ${notes.length} external verification note(s) remain`);
}

// Missing Vercel or manual test approval is not a code failure; keep this script useful
// as a status report after smoke has already passed.
process.exit(0);
