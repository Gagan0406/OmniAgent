import { chmod, lstat, readdir, rm, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, "..");
const nextDir = path.join(frontendRoot, ".next");
const execFileAsync = promisify(execFile);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function removeLeaf(targetPath) {
  try {
    await rm(targetPath, { force: true, recursive: false, maxRetries: 2, retryDelay: 100 });
    return;
  } catch (error) {
    if (error && (error.code === "ERR_FS_EISDIR" || error.code === "EISDIR")) {
      await rm(targetPath, { force: true, recursive: true, maxRetries: 2, retryDelay: 100 });
      return;
    }
    if (!error || !["EPERM", "EACCES", "EINVAL"].includes(error.code)) {
      throw error;
    }
  }

  try {
    await chmod(targetPath, 0o666);
  } catch {}

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await unlink(targetPath);
      return;
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return;
      }
      if (!error || !["EPERM", "EACCES"].includes(error.code) || attempt === 2) {
        throw error;
      }
      await sleep(150);
    }
  }
}

async function removeWithPowerShell(targetPath) {
  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "if (Test-Path -LiteralPath $args[0]) { Remove-Item -LiteralPath $args[0] -Recurse -Force }",
    targetPath,
  ]);
}

async function removePath(targetPath) {
  let stats;

  try {
    stats = await lstat(targetPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  // OneDrive can surface generated files as reparse points on Windows.
  // Treat those like leaf nodes instead of asking Node/Next to readlink them.
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    await removeLeaf(targetPath);
    return;
  }

  const entries = await readdir(targetPath);
  await Promise.all(entries.map((entry) => removePath(path.join(targetPath, entry))));
  await rm(targetPath, { force: true, recursive: false });
}

try {
  await removePath(nextDir);
} catch (error) {
  if (process.platform !== "win32") {
    throw error;
  }

  await removeWithPowerShell(nextDir);
}
