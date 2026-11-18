import { createServer } from "node:http";
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { closePool } from "./db/pool.js";

const env = getEnv();
const server = createServer(createApp());

server.listen(env.PORT, () => {
  console.info(JSON.stringify({ level: "info", event: "server.started", port: env.PORT, environment: env.NODE_ENV }));
});

async function shutdown(signal: string): Promise<void> {
  console.info(JSON.stringify({ level: "info", event: "server.stopping", signal }));
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
