#!/usr/bin/env node
const { execSync } = require("child_process");
const os = require("os");

function getLocalIP() {
  if (process.platform === "darwin") {
    try {
      return execSync("ipconfig getifaddr en0", { encoding: "utf8" }).trim();
    } catch {
      try {
        return execSync("ipconfig getifaddr en1", { encoding: "utf8" }).trim();
      } catch {
        // fallback
      }
    }
  }
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

console.log(getLocalIP());
