#!/usr/bin/env node

import process from "node:process";

import { runLauncher } from "../runtime/launcher.js";

const result = await runLauncher(process.argv.slice(2));
if (result.signal) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.code;
}
