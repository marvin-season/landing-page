import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

const novelRoot = join(process.cwd(), "data", "novels");

export function novelTxtFileName(title: string) {
  const name = title.replace(/[\\/:*?"<>|]/g, "_") || "小说";
  return `${name}.txt`;
}

export function novelPartition(id: string) {
  return id.replace(/[\\/:*?"<>|]/g, "_") || "novel";
}

export function novelTxtRelativePath(id: string, title: string) {
  return join("data", "novels", novelPartition(id), novelTxtFileName(title));
}

export async function saveNovelTxt(
  id: string,
  title: string,
  text: string,
  root = novelRoot,
) {
  const dir = join(root, novelPartition(id));
  await mkdir(dir, { recursive: true });
  const names = await readdir(dir).catch(() => [] as string[]);
  const txts = await Promise.all(
    names
      .filter((name) => name.endsWith(".txt"))
      .map(async (name) => {
        const file = join(dir, name);
        return {
          file,
          mtimeMs: (await stat(file)).mtimeMs,
          text: await readFile(file, "utf8"),
        };
      }),
  );
  txts.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const current = txts[0];
  const destination = join(dir, novelTxtFileName(title));
  if (current && current.text !== text) {
    const backup = `${current.file}.bak`;
    await writeFile(backup, current.text, "utf8");
    await Promise.all(
      names
        .filter(
          (name) => name.endsWith(".txt.bak") && join(dir, name) !== backup,
        )
        .map((name) => rm(join(dir, name), { force: true })),
    );
  }
  await writeFile(destination, text, "utf8");
  await Promise.all(
    txts
      .filter((file) => file.file !== destination)
      .map((file) => rm(file.file, { force: true })),
  );
  return { file: destination, updatedAt: (await stat(destination)).mtimeMs };
}

export async function readNovelTxt(id: string, root = novelRoot) {
  const dir = join(root, novelPartition(id));
  let names: string[];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith(".txt"));
  } catch {
    return null;
  }
  if (names.length === 0) return null;
  const files = await Promise.all(
    names.map(async (name) => {
      const file = join(dir, name);
      return { name, file, mtimeMs: (await stat(file)).mtimeMs };
    }),
  );
  files.sort((left, right) => right.mtimeMs - left.mtimeMs);
  const chosen = files[0];
  return {
    fileName: chosen.name,
    text: await readFile(chosen.file, "utf8"),
    updatedAt: chosen.mtimeMs,
  };
}
