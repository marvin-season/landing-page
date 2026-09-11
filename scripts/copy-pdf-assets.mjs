import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const source = dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = require("pdfjs-dist/package.json");
const destination = new URL(`../public/pdfjs/${version}/`, import.meta.url);

mkdirSync(destination, { recursive: true });
for (const asset of ["cmaps", "standard_fonts", "wasm"]) {
  cpSync(join(source, asset), new URL(`${asset}/`, destination), {
    recursive: true,
  });
}
cpSync(
  join(source, "build/pdf.worker.min.mjs"),
  new URL("pdf.worker.min.mjs", destination),
);
