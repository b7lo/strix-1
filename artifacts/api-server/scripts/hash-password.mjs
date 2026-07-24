#!/usr/bin/env node
/**
 * توليد هاش scrypt لكلمة مرور الأدمن (بدون مكتبات خارجية).
 *
 * الاستخدام:
 *   node scripts/hash-password.mjs 'كلمة-السر-هنا'
 *   # أو بدون وسيط، يقرأها من stdin:
 *   echo 'كلمة-السر' | node scripts/hash-password.mjs
 *
 * انسخ الناتج وضعه في متغيّر البيئة ADMIN_PASSWORD_HASH على مورد api-server،
 * واحذف ADMIN_PASSWORD القديم.
 */
import crypto from "node:crypto";

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data.trim()));
  });
}

const argPassword = process.argv[2];
const password = argPassword ?? (await readStdin());

if (!password) {
  console.error("خطأ: مرّر كلمة المرور كوسيط أو عبر stdin.");
  process.exit(1);
}

console.log(hashPassword(password));
