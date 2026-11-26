import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const client = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(client, "public", "fonts");
const families = ["geist", "geist-mono"];
await mkdir(target, { recursive: true });

const styles = [];
for (const family of families) {
  const source = path.join(client, "node_modules", "@fontsource-variable", family);
  for (const stylesheet of ["index.css", "wght-italic.css"]) {
    const css = await readFile(path.join(source, stylesheet), "utf8");
    styles.push(css.replaceAll("./files/", "./"));
  }
  const files = await readdir(path.join(source, "files"));
  await Promise.all(files.filter(file => file.endsWith(".woff2")).map(file =>
    copyFile(path.join(source, "files", file), path.join(target, file))
  ));
  await copyFile(path.join(source, "LICENSE"), path.join(target, family + "-LICENSE.txt"));
}
await writeFile(path.join(target, "studyos-fonts.css"), styles.join("\n\n") + "\n");
console.log("StudyOS self-hosted Geist fonts synced.");
