import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "./db.js";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "skyharp_session";
const SESSION_DAYS = 30;

const parseCookies = (header = "") => Object.fromEntries(
  header.split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf("=");
    return [decodeURIComponent(item.slice(0, separator)), decodeURIComponent(item.slice(separator + 1))];
  }),
);

const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

export const hashPassword = async (password) => {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (password, storedHash) => {
  const [algorithm, saltHex, hashHex] = String(storedHash).split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
};

export const createSession = async (res, userId) => {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), userId, tokenHash(token), expiresAt],
  );
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`);
};

export const clearSession = async (req, res) => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    req.user = null;
    if (token) {
      const result = await pool.query(
        `SELECT u.id, u.email, u.username, u.avatar_url AS "avatarUrl"
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash(token)],
      );
      req.user = result.rows[0] || null;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
};
