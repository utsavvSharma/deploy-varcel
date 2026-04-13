import fs from "fs";
import path from "path";

// In production (Vercel), the filesystem is read-only. Use /tmp for writes.
const readonlyDir = path.join(process.cwd(), "data");
const writableDir = process.env.NODE_ENV === "production" ? path.join("/tmp", "data") : readonlyDir;

function ensureWritableFile(fileName: string) {
  if (!fs.existsSync(writableDir)) {
    fs.mkdirSync(writableDir, { recursive: true });
  }
  const srcPath = path.join(readonlyDir, fileName);
  const dstPath = path.join(writableDir, fileName);
  if (!fs.existsSync(dstPath) && fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
  }
}

export function readJSON<T>(fileName: string): T {
  // Ensure a writable copy exists in prod, but always prefer writable if present
  if (process.env.NODE_ENV === "production") {
    ensureWritableFile(fileName);
    const tmpPath = path.join(writableDir, fileName);
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, "utf-8");
      return JSON.parse(raw) as T;
    }
  }
  const srcPath = path.join(readonlyDir, fileName);
  if (!fs.existsSync(srcPath)) return JSON.parse("null");
  const raw = fs.readFileSync(srcPath, "utf-8");
  return JSON.parse(raw) as T;
}

export function writeJSON<T>(fileName: string, data: T) {
  if (process.env.NODE_ENV === "production") {
    ensureWritableFile(fileName);
    const tmpPath = path.join(writableDir, fileName);
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    return;
  }
  const srcPath = path.join(readonlyDir, fileName);
  fs.writeFileSync(srcPath, JSON.stringify(data, null, 2), "utf-8");
}
