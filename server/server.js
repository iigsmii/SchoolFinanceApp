const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;


// =====================================================
// ابزارهای کمکی
// =====================================================

function supabaseHeaders() {
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
    };
}


async function supabaseRequest(path, options = {}) {

    const response = await fetch(
        SUPABASE_URL + path,
        {
            ...options,
            headers: {
                ...supabaseHeaders(),
                ...(options.headers || {})
            }
        }
    );

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }

    return {
        response,
        data
    };
}


// =====================================================
// بررسی تنظیمات
// =====================================================

if (!SUPABASE_URL) {
    console.error("ERROR: SUPABASE_URL is missing");
}

if (!SUPABASE_KEY) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is missing");
}


// =====================================================
// صفحه اصلی
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "School Finance API is running"
    });

});


// =====================================================
// تست API
// =====================================================

app.get("/api/test", (req, res) => {

    res.json({
        success: true,
        message: "API connection successful"
    });

});


// =====================================================
// تست اتصال دیتابیس
// =====================================================

app.get("/api/test-db", async (req, res) => {

    if (!SUPABASE_URL || !SUPABASE_KEY) {

        return res.status(500).json({
            success: false,
            message: "Supabase configuration is missing"
        });

    }

    try {

        const result = await supabaseRequest(
            "/rest/v1/schools?select=id,name,code,active&order=id.asc"
        );

        if (!result.response.ok) {

            return res.status(500).json({
                success: false,
                message: "Supabase connection failed",
                http_status: result.response.status,
                error: result.data
            });

        }

        return res.json({
            success: true,
            message: "Supabase connection successful",
            count: Array.isArray(result.data)
                ? result.data.length
                : 0,
            schools: result.data
        });

    } catch (error) {

        console.error("DATABASE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Database error",
            error: error.message
        });

    }

});


// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        // ---------------------------------------------
        // بررسی ورودی
        // ---------------------------------------------

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "نام کاربری و رمز عبور الزامی است"
            });

        }


        // ---------------------------------------------
        // پیدا کردن کاربر
        // ---------------------------------------------

        const encodedUsername =
            encodeURIComponent(username.trim());

        const result = await supabaseRequest(
            "/rest/v1/profiles" +
            "?select=id,username,name,role,school_id,active,password_hash" +
            "&username=eq." +
            encodedUsername +
            "&limit=1"
        );


        if (!result.response.ok) {

            console.error(
                "LOGIN DATABASE ERROR:",
                result.data
            );

            return res.status(500).json({
                success: false,
                message: "خطا در ارتباط با پایگاه داده"
            });

        }


        const users = result.data;


        // ---------------------------------------------
        // کاربر پیدا نشد
        // ---------------------------------------------

        if (!Array.isArray(users) || users.length === 0) {

            return res.status(401).json({
                success: false,
                message: "نام کاربری یا رمز عبور اشتباه است"
            });

        }


        const user = users[0];


        // ---------------------------------------------
        // کاربر غیرفعال
        // ---------------------------------------------

        if (user.active !== true) {

            return res.status(403).json({
                success: false,
                message: "این حساب کاربری غیرفعال است"
            });

        }


        // ---------------------------------------------
        // بررسی رمز
        // ---------------------------------------------

        if (!user.password_hash) {

            return res.status(500).json({
                success: false,
                message: "برای این کاربر رمز عبور ثبت نشده است"
            });

        }


        const passwordCorrect =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordCorrect) {

            return res.status(401).json({
                success: false,
                message: "نام کاربری یا رمز عبور اشتباه است"
            });

        }


        // ---------------------------------------------
        // ساخت Session Token
        // ---------------------------------------------

        const token = crypto.randomBytes(32).toString("hex");


        // ---------------------------------------------
        // اطلاعات مدرسه
        // ---------------------------------------------

        let school = null;


        if (
            user.role !== "admin" &&
            user.school_id
        ) {

            const schoolResult =
                await supabaseRequest(
                    "/rest/v1/schools" +
                    "?select=id,name,code,active" +
                    "&id=eq." +
                    encodeURIComponent(user.school_id) +
                    "&limit=1"
                );


            if (
                schoolResult.response.ok &&
                Array.isArray(schoolResult.data) &&
                schoolResult.data.length > 0
            ) {

                school = schoolResult.data[0];

            }

        }


        // ---------------------------------------------
        // پاسخ موفق
        // ---------------------------------------------

        return res.json({

            success: true,

            message: "ورود با موفقیت انجام شد",

            token: token,

            user: {

                id: user.id,

                username: user.username,

                name: user.name,

                role: user.role,

                school_id: user.school_id,

                school_name:
                    school ? school.name : null,

                school_code:
                    school ? school.code : null

            }

        });

    } catch (error) {

        console.error("LOGIN ERROR:", error);

        return res.status(500).json({

            success: false,

            message: "خطای داخلی سرور",

            error: error.message

        });

    }

});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        "School Finance API running on port " + PORT
    );

});
