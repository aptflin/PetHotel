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

// GET /api/pets?mId=xxx
app.get("/api/pets", async (req, res) => {
  try {
    const { mId } = req.query;
    if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });

    const [rows] = await pool.query(
      `SELECT pId, mId, name, breed, birth, ligation, weight, personality, disease, notice
       FROM pet
       WHERE mId = ?
       ORDER BY pId DESC`,
      [mId]
    );

    res.json({ ok: true, pets: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
});

// POST /api/pets  (pId = "p0001" 這種字串版本)
app.post("/api/pets", async (req, res) => {
  let conn;
  try {
    const headerMid = (req.headers["x-member-id"] || "").toString().trim();
    const {
      mId: bodyMid,
      name,
      breed,
      birth,
      ligation,
      weight,
      personality,
      disease,
      notice,
    } = req.body || {};

    const mId = headerMid || (bodyMid || "").toString().trim();
    if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });

    // 若 header / body 同時存在，必須一致（避免冒用）
    if (headerMid && bodyMid && headerMid !== String(bodyMid).trim()) {
      return res.status(403).json({ ok: false, message: "mId 不一致，拒絕存取" });
    }

    if (!name || !breed || !birth || !ligation) {
      return res.status(400).json({ ok: false, message: "name/breed/birth/ligation 為必填" });
    }

    // birth 日期合法性檢查（避免無效日期與未來日期）
    const birthStr = String(birth).trim();
    const birthDate = new Date(`${birthStr}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) {
      return res.status(400).json({ ok: false, message: "birth 日期格式不正確（請用 YYYY-MM-DD）" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (birthDate > today) {
      return res.status(400).json({ ok: false, message: "birth 不可晚於今天" });
    }

    const diseaseFinal =
      disease && String(disease).trim() !== "" ? String(disease).trim() : "無";

    const weightFinal =
      weight === null || weight === undefined || weight === "" ? null : Number(weight);

    if (weightFinal !== null && Number.isNaN(weightFinal)) {
      return res.status(400).json({ ok: false, message: "體重格式不正確" });
    }
    if (weightFinal !== null && weightFinal < 0) {
      return res.status(400).json({ ok: false, message: "體重不可為負數" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 取目前最大流水數字：p0001 -> 1（用 FOR UPDATE 避免併發撞號）
    const [rows] = await conn.query(
      `
      SELECT MAX(CAST(SUBSTRING(pId, 2) AS UNSIGNED)) AS maxNum
      FROM pet
      FOR UPDATE
      `
    );

    const nextNum = (rows[0]?.maxNum ? Number(rows[0].maxNum) : 0) + 1;
    const newPId = "p" + String(nextNum).padStart(4, "0");

    await conn.query(
      `
      INSERT INTO pet (pId, mId, name, breed, birth, ligation, weight, personality, disease, notice)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        newPId,
        mId,
        String(name).trim(),
        String(breed).trim(),
        birthStr,
        String(ligation).trim(),
        weightFinal,
        personality ? String(personality).trim() : null,
        diseaseFinal,
        notice ? String(notice).trim() : null,
      ]
    );

    await conn.commit();

    return res.json({
      ok: true,
      pet: {
        pId: newPId,
        mId,
        name: String(name).trim(),
        breed: String(breed).trim(),
        birth: birthStr,
        ligation: String(ligation).trim(),
        weight: weightFinal,
        personality: personality ? String(personality).trim() : null,
        disease: diseaseFinal,
        notice: notice ? String(notice).trim() : null,
      },
    });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  } finally {
    if (conn) conn.release();
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

/**
 * Create Order (新增訂單 + 明細)
 * POST /api/orders
 *
 * Body:
 * {
 *   mId: "m0001",
 *   sId: "Sitter.sId" | null,
 *   startDate: "YYYY-MM-DD" | null,
 *   endDate: "YYYY-MM-DD" | null,
 *   totalPrice: number,
 *   items: [{ sNo: "Service.sNO" | null, pId: "pet.pId", amount: number, price: number }]
 * }
 *
 * Rules:
 * - rDate：以後端收到請求當下時間寫入（等同點擊送出當下）
 * - Booking.bNo：採字串流水號 b0001/b0002...
 * - BookingDetail.bId：採字串流水號 hh0001/hh0002...
 * - 防止 startDate 早於今天（過期訂單）
 */
app.post("/api/orders", async (req, res) => {
  let conn;
  try {
    const headerMid = (req.headers["x-member-id"] || "").toString().trim();
    const body = req.body || {};
    const bodyMid = (body.mId || "").toString().trim();
    const mId = headerMid || bodyMid;

    if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });
    if (headerMid && bodyMid && headerMid !== bodyMid) {
      return res.status(403).json({ ok: false, message: "mId 不一致，拒絕存取" });
    }

    const sId = body.sId ? String(body.sId).trim() : null;
    const startDate = body.startDate ? String(body.startDate).trim() : null;
    const endDate = body.endDate ? String(body.endDate).trim() : null;
    const totalPrice = Number(body.totalPrice);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!Number.isFinite(totalPrice) || totalPrice < 0) {
      return res.status(400).json({ ok: false, message: "totalPrice 不正確" });
    }
    if (items.length === 0) {
      return res.status(400).json({ ok: false, message: "items 不可為空" });
    }
    for (const it of items) {
      const pId = (it?.pId || "").toString().trim();
      if (!pId) return res.status(400).json({ ok: false, message: "items.pId 不可為空" });
      const amount = Number(it?.amount);
      const price = Number(it?.price);
      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(400).json({ ok: false, message: "items.amount 不正確" });
      }
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ ok: false, message: "items.price 不正確" });
      }
    }

    // ===== 新增：日期合法性 + 過期訂單防呆 =====
    // 規則：只要有 startDate，就不得早於「今天」（以伺服器時間為準）
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ ok: false, message: "startDate 格式不正確（請用 YYYY-MM-DD）" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        return res.status(400).json({ ok: false, message: "入住日期已早於今天，無法成立訂單" });
      }
    }

    // 若有 endDate，同步檢查 endDate >= startDate
    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ ok: false, message: "endDate 格式不正確（請用 YYYY-MM-DD）" });
      }
      if (end < start) {
        return res.status(400).json({ ok: false, message: "退房日期不可早於入住日期" });
      }
    }
    // ===== 日期防呆結束 =====

    const rDate = new Date(); // ✅ 送出按鈕點擊當下（以後端收到請求為準）
    const rDateMySQL = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, "0")}-${String(
      rDate.getDate()
    ).padStart(2, "0")} ${String(rDate.getHours()).padStart(2, "0")}:${String(rDate.getMinutes()).padStart(
      2,
      "0"
    )}:${String(rDate.getSeconds()).padStart(2, "0")}`;

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // ===== 產生 bNo（b0001...） =====
    const [bRows] = await conn.query(
      `SELECT MAX(CAST(SUBSTRING(bNo, 2) AS UNSIGNED)) AS maxNum FROM Booking FOR UPDATE`
    );
    const nextBNum = (bRows[0]?.maxNum ? Number(bRows[0].maxNum) : 0) + 1;
    const bNo = "b" + String(nextBNum).padStart(4, "0");

    // ===== 新增 Booking =====
    await conn.query(
      `
      INSERT INTO Booking (bNo, sId, mId, startDate, endDate, rDate, totalPrice, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [bNo, sId, mId, startDate, endDate, rDateMySQL, totalPrice, "預約中"]
    );

    // ===== 新增 BookingDetail（bId: hh0001...） =====
    const [dRows] = await conn.query(
      `SELECT MAX(CAST(SUBSTRING(bId, 3) AS UNSIGNED)) AS maxNum FROM BookingDetail FOR UPDATE`
    );
    let nextDNum = (dRows[0]?.maxNum ? Number(dRows[0].maxNum) : 0) + 1;

    for (const it of items) {
      const bId = "hh" + String(nextDNum).padStart(4, "0");
      nextDNum += 1;

      const sNo = it.sNo ? String(it.sNo).trim() : null;
      const pId = String(it.pId).trim();
      const amount = Number(it.amount);
      const price = Number(it.price);

      await conn.query(
        `
        INSERT INTO BookingDetail (bId, bNo, sNo, pId, amount, price)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [bId, bNo, sNo, pId, amount, price]
      );
    }

    await conn.commit();
    return res.json({ ok: true, bNo, rDate: rDateMySQL });
  } catch (err) {
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * Orders (只顯示該會員自己的訂單)
 * GET /api/orders?mId=m0001
 * 也支援用 header: x-member-id（前端可送，避免被亂改 query）
 */
app.get("/api/orders", async (req, res) => {
  try {
    const headerMid = (req.headers["x-member-id"] || "").toString().trim();
    const queryMid  = (req.query.mId || "").toString().trim();
    const mId = headerMid || queryMid;

    if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });
    if (headerMid && queryMid && headerMid !== queryMid) {
      return res.status(403).json({ ok: false, message: "mId 不一致，拒絕存取" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        b.bNo,
        b.sId,
        b.mId,
        b.startDate,
        b.rDate,
        b.totalPrice,
        b.status,

        /* ✅ 住宿晚數：從 BookingDetail.amount 取（同一張訂單通常每筆明細 amount 相同，取 MAX 即可） */
        COALESCE(MAX(bd.amount), 0) AS nights,

        si.eName AS sitterName,

        GROUP_CONCAT(DISTINCT sv.sName ORDER BY sv.sNO SEPARATOR '、') AS serviceNames,

        /* ✅ 寵物名稱：由 BookingDetail.pId -> pet.name */
        GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR '、') AS petNames

      FROM Booking b
      LEFT JOIN Sitter si        ON si.sId = b.sId
      LEFT JOIN BookingDetail bd ON bd.bNo = b.bNo
      LEFT JOIN Service sv       ON sv.sNO = bd.sNo
      LEFT JOIN pet p            ON p.pId  = bd.pId

      WHERE b.mId = ?
      GROUP BY b.bNo, b.sId, b.mId, b.startDate, b.rDate, b.totalPrice, b.status, si.eName
      ORDER BY b.startDate DESC
      `,
      [mId]
    );

    return res.json({ ok: true, orders: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

/**
 * Order Items / Details（只允許看自己的訂單）
 * GET /api/orders/:bNo/items?mId=m0001
 */
app.get("/api/orders/:bNo/items", async (req, res) => {
  try {
    const bNo = (req.params.bNo || "").toString().trim();
    if (!bNo) return res.status(400).json({ ok: false, message: "缺少 bNo" });

    const headerMid = (req.headers["x-member-id"] || "").toString().trim();
    const queryMid = (req.query.mId || "").toString().trim();
    const mId = headerMid || queryMid;
    if (!mId) return res.status(400).json({ ok: false, message: "缺少 mId" });

    if (headerMid && queryMid && headerMid !== queryMid) {
      return res.status(403).json({ ok: false, message: "mId 不一致，拒絕存取" });
    }

    // 先確認這筆訂單屬於該會員
    const [own] = await pool.query(
      `SELECT bNo FROM Booking WHERE bNo = ? AND mId = ? LIMIT 1`,
      [bNo, mId]
    );
    if (own.length === 0) {
      return res.status(404).json({ ok: false, message: "查無此訂單或無權限" });
    }

    const [rows] = await pool.query(
      `
      SELECT
      bd.bNo,
      bd.sNo,
      sv.sName AS serviceName,
      bd.pId,
      p.name AS petName,
      bd.amount,
      bd.price
    FROM BookingDetail bd
    LEFT JOIN Service sv ON sv.sNO = bd.sNo
    LEFT JOIN pet p      ON p.pId  = bd.pId
    WHERE bd.bNo = ?
    ORDER BY bd.sNo, bd.pId;
      `,
      [bNo]
    );

    return res.json({ ok: true, items: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// 取得會員自己的照顧日誌
app.get("/api/carelogs", async (req, res) => {
  try {
    const mId = req.query.mId;
    if (!mId) {
      return res.status(400).json({ ok: false, message: "缺少 mId" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        cl.cNo,
        cl.bNo,
        cl.recordTime,
        cl.description,

        b.status AS bookingStatus,

        -- 入住第幾天
        DATEDIFF(DATE(cl.recordTime), b.startDate) + 1 AS stayDay,

        -- 幾晚住宿
        DATEDIFF(b.endDate, b.startDate) AS nights,

        -- 寵物
        p.name AS petName,

        -- 保母
        s.eName AS sitterName

      FROM CareLog cl
      JOIN Booking b ON b.bNo = cl.bNo
      LEFT JOIN pet p ON p.pId = cl.pId
      LEFT JOIN Sitter s ON s.sId = b.sId

      WHERE b.mId = ?
      ORDER BY cl.bNo, cl.recordTime
      `,
      [mId]
    );

    res.json({ ok: true, logs: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/orders/pending/summary
// Header: x-member-id: m0001
app.get("/api/orders/pending/summary", async (req, res) => {
  let conn;
  try {
    const mId = (req.headers["x-member-id"] || "").toString().trim();
    if (!mId) return res.status(400).json({ ok: false, message: "缺少 x-member-id" });

    conn = await pool.getConnection();

    const [rows] = await conn.query(
      `
      SELECT
        COUNT(*) AS pendingCount,
        COALESCE(SUM(totalPrice), 0) AS pendingTotalPrice
      FROM Booking
      WHERE status = '預約中' AND mId = ?
      `,
      [mId]
    );

    return res.json({ ok: true, ...rows[0] });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  } finally {
    if (conn) conn.release();
  }
});

/* =========================
 *  Start Server
 * ========================= */
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});