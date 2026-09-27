const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "";
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

app.disable("x-powered-by");
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN } : undefined));
app.use(express.json({ limit: "32kb" }));

function configured() {
    return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function supabaseHeaders() {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
    };
}

async function supabaseRequest(path, options = {}) {
    if (!configured()) throw new Error("Supabase is not configured");

    const response = await fetch(`${SUPABASE_URL}${path}`, {
        ...options,
        headers: { ...supabaseHeaders(), ...(options.headers || {}) }
    });
    const text = await response.text();
    let data;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    return { response, data };
}

function createSession(user) {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_TTL_MS });
    return token;
}

function requireAuth(req, res, next) {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const session = sessions.get(token);

    if (!session || session.expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return res.status(401).json({ success: false, message: "نشست کاربری معتبر نیست" });
    }

    req.session = session;
    next();
}

if (!configured()) {
    console.warn("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

app.get("/", (req, res) => {
    res.json({ success: true, message: "School Finance API is running" });
});

app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "API connection successful" });
});

app.get("/api/test-db", async (req, res) => {
    if (!configured()) {
        return res.status(503).json({ success: false, message: "Supabase configuration is missing" });
    }

    try {
        const result = await supabaseRequest("/rest/v1/schools?select=id,name,code,active&order=id.asc");
        if (!result.response.ok) {
            console.error("DATABASE ERROR:", result.response.status, result.data);
            return res.status(502).json({ success: false, message: "Supabase connection failed" });
        }

        return res.json({
            success: true,
            message: "Supabase connection successful",
            count: Array.isArray(result.data) ? result.data.length : 0,
            schools: result.data
        });
    } catch (error) {
        console.error("DATABASE ERROR:", error.message);
        return res.status(500).json({ success: false, message: "Database error" });
    }
});

app.post("/api/login", async (req, res) => {
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!username || !password || username.length > 120 || password.length > 200) {
        return res.status(400).json({ success: false, message: "نام کاربری و رمز عبور معتبر الزامی است" });
    }

    if (!configured()) {
        return res.status(503).json({ success: false, message: "سرویس احراز هویت تنظیم نشده است" });
    }

    try {
        const result = await supabaseRequest(
            `/rest/v1/profiles?select=id,username,name,role,school_id,active,password_hash&username=eq.${encodeURIComponent(username)}&limit=1`
        );

        if (!result.response.ok) {
            console.error("LOGIN DATABASE ERROR:", result.response.status, result.data);
            return res.status(502).json({ success: false, message: "خطا در ارتباط با پایگاه داده" });
        }

        const user = Array.isArray(result.data) ? result.data[0] : null;
        if (!user || !user.password_hash) {
            return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
        }

        if (!(user.active === true || user.active === 1)) {
            return res.status(403).json({ success: false, message: "این حساب کاربری غیرفعال است" });
        }

        const passwordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!passwordCorrect) {
            return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
        }

        let school = null;
        if (user.role !== "admin" && user.school_id) {
            const schoolResult = await supabaseRequest(
                `/rest/v1/schools?select=id,name,code,active&id=eq.${encodeURIComponent(user.school_id)}&limit=1`
            );
            if (schoolResult.response.ok && Array.isArray(schoolResult.data)) {
                school = schoolResult.data[0] || null;
            }
        }

        return res.json({
            success: true,
            message: "ورود با موفقیت انجام شد",
            token: createSession(user),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                school_id: user.school_id,
                school_name: school ? school.name : null,
                school_code: school ? school.code : null
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error.message);
        return res.status(500).json({ success: false, message: "خطای داخلی سرور" });
    }
});

app.post("/api/logout", requireAuth, (req, res) => {
    const token = (req.get("authorization") || "").slice(7).trim();
    sessions.delete(token);
    res.json({ success: true, message: "خروج با موفقیت انجام شد" });
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({ success: false, message: "بدنه درخواست JSON معتبر نیست" });
    }
    console.error("UNHANDLED ERROR:", error);
    return res.status(500).json({ success: false, message: "خطای داخلی سرور" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`School Finance API running on port ${PORT}`);
});
