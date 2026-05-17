const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname);
const mainRepo = "/Users/ruben/work/private/souldb";
const isWorktree = root !== mainRepo;

let suffix = "";
let bePort = 9060;
let fePort = 5173;
let tauriPort = 1420;

if (isWorktree) {
  suffix = `-${path.basename(root)}`;
  const hash = crypto.createHash("md5").update(root).digest();
  const offset = (hash.readUInt16BE(0) % 900) + 100; // 100–999
  bePort = 9000 + offset;
  fePort = 5100 + offset;
  tauriPort = 1400 + offset;
}

module.exports = { root, suffix, bePort, fePort, tauriPort, isWorktree };
