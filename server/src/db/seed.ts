import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getPool, closePool } from "./pool.js";

const seedsDirectory = fileURLToPath(new URL("./seeds", import.meta.url));

async function seed(): Promise<void> {
  const filenames = (await readdir(seedsDirectory))
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  for (const filename of filenames) {
    const sql = await readFile(`${seedsDirectory}/${filename}`, "utf8");
    await getPool().query(sql);
    console.info(`Applied seed ${filename}`);
  }
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);
