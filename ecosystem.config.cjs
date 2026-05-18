const path = require("path");
const { root, suffix, bePort, fePort } = require("./dev-ports.cjs");
const db = path.join(root, "data/app.db");

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
