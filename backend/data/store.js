import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const bundledDataFile = fileURLToPath(new URL("./blog.json", import.meta.url));
const dataFile = process.env.DATA_FILE
  ? resolve(process.env.DATA_FILE)
  : bundledDataFile;
const temporaryFile = `${dataFile}.${process.pid}.tmp`;

let writeQueue = Promise.resolve();

export const readData = async () => {
  let content;

  try {
    content = await readFile(dataFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT" || dataFile === bundledDataFile) throw error;

    await mkdir(dirname(dataFile), { recursive: true });
    const seedContent = await readFile(bundledDataFile, "utf8");
    try {
      await writeFile(dataFile, seedContent, { encoding: "utf8", flag: "wx" });
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
    }
    content = await readFile(dataFile, "utf8");
  }

  const data = JSON.parse(content);

  return {
    posts: Array.isArray(data.posts) ? data.posts : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
    raajiVideos: Array.isArray(data.raajiVideos) ? data.raajiVideos : [],
  };
};

export const updateData = (changeData) => {
  writeQueue = writeQueue.then(async () => {
    const data = await readData();
    const result = await changeData(data);

    await writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporaryFile, dataFile);

    return result;
  });

  return writeQueue;
};
