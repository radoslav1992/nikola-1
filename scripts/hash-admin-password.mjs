import { pbkdf2Sync, randomBytes } from "node:crypto";
// Read from stdin so the password is not placed in process arguments or shell history.
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, "");
if (password.length < 14) throw new Error("Use at least 14 characters.");
const salt = randomBytes(24).toString("hex");
console.log(
  `pbkdf2:${salt}:${pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex")}`,
);
