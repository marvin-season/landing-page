import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEV_USER_ID } from "@/lib/dev-session";

const novelRoot = join(process.cwd(), "data", "novels");

export function novelTxtFileName(title: string) {
  const name = title.replace(/[\\/:*?"<>|]/g, "_") || "小说";
  return `${name}.txt`;
}

export function novelTxtRelativePath(title: string) {
  return join("data", "novels", DEV_USER_ID, novelTxtFileName(title));
}

export async function saveNovelTxt(
  title: string,
  text: string,
  root = novelRoot,
) {
  const file = join(root, DEV_USER_ID, novelTxtFileName(title));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text, "utf8");
  return file;
}
