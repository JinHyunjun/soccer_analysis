import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// OpenNext 1.20.1 filters traced Turbopack chunks with POSIX-only paths.
// On native Windows those paths contain backslashes, leaving requireChunk()
// empty and causing every dynamic Next.js route to fail on Cloudflare.
const pluginPath = path.resolve(
  "node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/turbopack.js",
);
const anchor = '            patchCode: async ({ code, tracedFiles, filePath }) => {\n';
const normalization = '                tracedFiles = tracedFiles.map((file) => file.replaceAll("\\\\", "/"));\n';

const source = await readFile(pluginPath, "utf8");
if (source.includes(normalization)) {
  console.log("OpenNext Turbopack Windows path patch is already applied.");
  process.exit(0);
}
if (!source.includes(anchor)) {
  throw new Error("OpenNext Turbopack plugin changed; update the Windows path patch.");
}

await writeFile(pluginPath, source.replace(anchor, anchor + normalization), "utf8");
console.log("Applied OpenNext Turbopack Windows path patch.");
