import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDirectory = path.resolve(__dirname, "../../docs/screenshots");
const targetDirectory = path.resolve(
  __dirname,
  "../public/studyos-screenshots"
);

const screenshots = [
  "dashboard.png",
  "tasks.png",
  "subjects.png",
  "notes.png",
  "calendar.png",
  "focus.png",
  "progress.png",
  "leaderboard.png",
  "settings.png",
];

const githubRef = process.env.VERCEL_GIT_COMMIT_SHA || "main";
const githubBase = `https://raw.githubusercontent.com/Vaibh37/Studyos/${githubRef}/docs/screenshots`;

await mkdir(targetDirectory, { recursive: true });

const syncScreenshot = async (fileName) => {
  const sourcePath = path.join(sourceDirectory, fileName);
  const targetPath = path.join(targetDirectory, fileName);

  try {
    await copyFile(sourcePath, targetPath);
    return "local";
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const response = await fetch(`${githubBase}/${fileName}`);

  if (!response.ok) {
    throw new Error(
      `Unable to sync ${fileName}: GitHub returned ${response.status}.`
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const { writeFile } = await import("node:fs/promises");
  await writeFile(targetPath, bytes);

  return "github";
};

const sources = await Promise.all(screenshots.map(syncScreenshot));
const fetchedCount = sources.filter((source) => source === "github").length;

console.log(
  `StudyOS marketing screenshots synced (${screenshots.length} files${
    fetchedCount ? `, ${fetchedCount} fetched from the pinned GitHub revision` : ""
  }).`
);
