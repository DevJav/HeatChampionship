/**
 * Backs up the database and the uploaded photos into one dated archive,
 * backups/heat-YYYY-MM-DD_HHMM.tar.gz, and uploads it with rclone when
 * BACKUP_REMOTE is set. Archives older than BACKUP_KEEP_DAYS are deleted
 * here and on the remote. Safe to run while the site is up.
 *
 *   npm run backup
 *
 * pm2 runs it every night (see ecosystem.config.cjs). Restoring is described
 * in docs/setup.md#back-ups.
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
// Installed with @prisma/adapter-better-sqlite3, the driver the site itself uses
import Database from "better-sqlite3";

try {
  process.loadEnvFile();
} catch {
  // No .env: use the defaults below
}

const root = process.cwd();
const databaseFile = path.resolve(root, (process.env.DATABASE_URL ?? "file:./data/heat.db").replace(/^file:/, ""));
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR ?? "data/uploads");
const backupDir = path.resolve(root, process.env.BACKUP_DIR ?? "backups");
const keepDays = Number(process.env.BACKUP_KEEP_DAYS ?? 14);
const remote = process.env.BACKUP_REMOTE;

function run(command, args) {
  const { status, error } = spawnSync(command, args, { stdio: "inherit" });
  if (error) throw new Error(`${command}: ${error.message}`);
  if (status !== 0) throw new Error(`${command} ${args[0]} exited with ${status}`);
}

/** 2026-10-25_0430, in local time so it matches the server's clock */
function stamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** Online copy of the database (consistent even mid-write), checked before it's archived. */
async function copyDatabase(target) {
  const source = new Database(databaseFile, { readonly: true, fileMustExist: true });
  try {
    await source.backup(target);
  } finally {
    source.close();
  }
  const copy = new Database(target, { readonly: true });
  try {
    const check = copy.pragma("integrity_check", { simple: true });
    if (check !== "ok") throw new Error(`Backup copy failed the integrity check: ${check}`);
  } finally {
    copy.close();
  }
}

async function pruneLocal() {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  for (const name of await readdir(backupDir)) {
    if (!/^heat-.*\.tar\.gz$/.test(name)) continue;
    const file = path.join(backupDir, name);
    if ((await stat(file)).mtimeMs < cutoff) {
      await rm(file);
      console.log(`Deleted ${name}`);
    }
  }
}

const archive = path.join(backupDir, `heat-${stamp(new Date())}.tar.gz`);
await mkdir(backupDir, { recursive: true });
const work = await mkdtemp(path.join(backupDir, ".tmp-"));
try {
  await copyDatabase(path.join(work, "heat.db"));
  // heat.db and uploads/ at the top of the archive, whatever their paths here
  const photos = await stat(uploadDir).then(
    () => ["-C", path.dirname(uploadDir), `--transform=s,^${path.basename(uploadDir)},uploads,`, path.basename(uploadDir)],
    () => [],
  );
  run("tar", ["-czf", archive, "-C", work, "heat.db", ...photos]);
} finally {
  await rm(work, { recursive: true, force: true });
}
console.log(`Saved ${path.relative(root, archive)} (${((await stat(archive)).size / 1024 / 1024).toFixed(1)} MB)`);

await pruneLocal();

if (remote) {
  run("rclone", ["copy", archive, remote]);
  run("rclone", ["delete", remote, "--min-age", `${keepDays}d`, "--include", "heat-*.tar.gz"]);
  console.log(`Uploaded to ${remote}`);
}
