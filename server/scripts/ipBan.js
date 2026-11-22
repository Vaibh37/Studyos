// Manual security bans without exposing a public admin endpoint.
// Usage: node scripts/ipBan.js ban <ip> <hours|permanent> [reason]
//        node scripts/ipBan.js unban <ip>
//        node scripts/ipBan.js list
require("dotenv").config();

const mongoose = require("mongoose");
const BannedIp = require("../models/BannedIp");
const { normalizeIp } = require("../utils/clientIp");

const usage = () => {
  console.error("Usage:\n  node scripts/ipBan.js ban <ip> <hours|permanent> [reason]\n  node scripts/ipBan.js unban <ip>\n  node scripts/ipBan.js list");
  process.exitCode = 1;
};

async function main() {
  const [action, rawIp, duration, ...rest] = process.argv.slice(2);
  if (!["ban", "unban", "list"].includes(action)) return usage();
  const ip = action === "list" ? null : normalizeIp(rawIp);
  if (action !== "list" && !ip) return usage();

  if (action === "ban" && ["127.0.0.1", "::1", "0.0.0.0"].includes(ip)) {
    throw new Error("Refusing to ban a loopback or unspecified address");
  }

  let expiresAt = null;
  if (action === "ban" && duration !== "permanent") {
    const hours = Number(duration);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 720) return usage();
    expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  if (action === "ban" && !duration) return usage();

  if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be configured");
  await mongoose.connect(process.env.MONGO_URI);

  try {
    if (action === "ban") {
      const reason = (rest.join(" ").trim() || "Manual security ban").slice(0, 250);
      await BannedIp.findOneAndUpdate({ ip }, {
        $set: { ip, reason, expiresAt },
      }, { upsert: true, new: true, runValidators: true });
      console.log(`Ban saved: ${ip} (expires: ${expiresAt?.toISOString() || "never"})`);
    } else if (action === "unban") {
      const result = await BannedIp.deleteOne({ ip });
      console.log(result.deletedCount ? "IP unbanned" : "IP was not banned");
    } else {
      const bans = await BannedIp.find({
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      }).select("ip reason expiresAt createdAt").sort({ createdAt: -1 }).lean();
      console.table(bans.map(({ ip, reason, expiresAt, createdAt }) => ({
        ip, reason, expiresAt: expiresAt?.toISOString() || "permanent",
        createdAt: createdAt?.toISOString(),
      })));
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("IP ban command failed:", error.message);
  process.exitCode = 1;
});
