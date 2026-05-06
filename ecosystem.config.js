const path = require("path");
const crypto = require("crypto");
const root = __dirname;
const db = path.join(root, "data/app.db");

const mainRepo = "/Users/ruben/work/private/souldb";
const isWorktree = root !== mainRepo;

let suffix = "";
let bePort = 9060;
let fePort = 5173;

if (isWorktree) {
  suffix = `-${path.basename(root)}`;
  const hash = crypto.createHash("md5").update(root).digest();
  const offset = (hash.readUInt16BE(0) % 900) + 100; // 100–999
  bePort = 9000 + offset;
  fePort = 5100 + offset;
}

module.exports = {
  apps: [
    {
      name: `souldb-be${suffix}`,
      script: "go",
      args: `run ./cmd/server -dev -db ${db} -addr :${bePort} -vite http://localhost:${fePort}`,
      cwd: path.join(root, "backend"),
      interpreter: "none",
      autorestart: false,
      watch: [path.join(root, "backend"), path.join(root, "data/app.db")],
      ignore_watch: ["bin", "*.test.go"],
      watch_delay: 1000,
    },
    {
      name: `souldb-fe${suffix}`,
      script: "pnpm",
      args: `dev --port ${fePort}`,
      cwd: path.join(root, "web"),
      interpreter: "none",
      autorestart: false,
      env: { VITE_BACKEND_URL: `http://localhost:${bePort}` },
    },
  ],
};
