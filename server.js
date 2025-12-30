require("dotenv").config();

const express = require("express");
const path = require("path");
const mysql = require("mysql2/promise");

const app = express();

/* =========================
 *  MySQL Pool
 * ========================= */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  queueLimit: 0,
  charset: "utf8mb4",
});

/* =========================
 *  Middlewares
 * ========================= */
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
 *  Routes / API
 * ========================= */

// DB Health Check
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: rows[0].ok === 1 });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Services
 * - Table: Service(sNO, sName, defaultPrice)
 * - Frontend expects: [{ id, name, price, desc }]
 */
app.get("/api/services", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sNO, sName, defaultPrice
       FROM Service
       ORDER BY sNO`
    );

    const services = rows.map((r) => ({
      id: String(r.sNO),            // ✅ 用 sNO 當 id，例如 s0001
      name: r.sName,                // ✅ 用 sName
      price: Number(r.defaultPrice),// ✅ 用 defaultPrice
      desc: "",                     // 你未提供描述欄位，先留空
    }));

    return res.json({ ok: true, services });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * Login
 * - username = mId (e.g., m0001)
 * - password = Member.password
 */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ ok: false, message: "請提供帳號(mId)與密碼" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT mId, name, phone, email, address
       FROM Member
       WHERE mId = ? AND password = ?
       LIMIT 1`,
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: "帳號或密碼錯誤" });
    }

    return res.json({ ok: true, member: rows[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Pets list: GET /api/pets?mId=m0001
app.get("/api/pets", async (req, res) => {
  const { mId } = req.query;
  if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });

  try {
    const [rows] = await pool.query(
      `SELECT pId, name, breed, birth, disease
       FROM Pet
       WHERE mId = ?
       ORDER BY pId`,
      [mId]
    );
    return res.json({ ok: true, pets: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// Add pet: POST /api/pets
app.post("/api/pets", async (req, res) => {
  const { mId, name, breed, birth, disease } = req.body || {};
  if (!mId || !name || !breed || !birth) {
    return res
      .status(400)
      .json({ ok: false, message: "缺少必要欄位（mId, name, breed, birth）" });
  }

  try {
    const [maxRows] = await pool.query("SELECT MAX(pId) AS maxPid FROM Pet");
    const maxPid = maxRows?.[0]?.maxPid ? String(maxRows[0].maxPid) : null;

    let nextNum = 1;
    if (maxPid && /^p\d{4}$/.test(maxPid)) {
      nextNum = parseInt(maxPid.slice(1), 10) + 1;
    }
    const newPid = "p" + String(nextNum).padStart(4, "0");

    const finalDisease = disease && String(disease).trim() ? String(disease).trim() : "無";

    await pool.query(
      `INSERT INTO Pet (pId, mId, name, breed, birth, disease)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [newPid, mId, name, breed, birth, finalDisease]
    );

    return res.json({
      ok: true,
      pet: { pId: newPid, mId, name, breed, birth, disease: finalDisease },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// 讀取保母清單：GET /api/sitters?serviceId=s0001
// - 保母名字：Sitter.eName
// - 價格：Offers.SitterPrice
// - 專長：Sitter.specialty
app.get("/api/sitters", async (req, res) => {
  const { serviceId } = req.query; // 服務代碼：例如 s0001（對應 Service.sNO / Offers.sNo）

  if (!serviceId) {
    return res.status(400).json({ ok: false, message: "缺少 serviceId" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT
        si.sId,
        si.eName,
        si.specialty,
        si.seniority,
        si.review,
        ofr.sNo,
        ofr.SitterPrice
      FROM Offers ofr
      INNER JOIN Sitter si ON si.sId = ofr.sId
      WHERE ofr.sNo = ?
      ORDER BY si.sId
      `,
      [serviceId]
    );

    // 回傳前端好用格式
    const sitters = rows.map((r) => ({
      id: String(r.sId),
      name: r.eName,                    // ✅ Sitter.eName
      specialty: r.specialty || "",     // ✅ Sitter.specialty
      price: Number(r.SitterPrice),     // ✅ Offers.SitterPrice
      seniority: r.seniority || "",     // 額外：你表有提供，可顯示也可不顯示
      review: r.review || "",           // 額外：你表有提供，可顯示也可不顯示
      serviceId: String(r.sNo),         // 這筆報價對應的服務代碼
    }));

    return res.json({ ok: true, sitters });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/* =========================
 *  Start Server
 * ========================= */
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});