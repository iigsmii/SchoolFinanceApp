const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getKeyType(key) {
    if (!key) return "missing";

    if (key.startsWith("sb_secret_")) {
        return "sb_secret";
    }

    if (key.startsWith("sb_publishable_")) {
        return "sb_publishable";
    }

    if (key.startsWith("eyJ")) {
        return "jwt_like_legacy";
    }

    return "other";
}

console.log("=================================");
console.log("School Finance API starting...");
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("KEY_EXISTS:", !!SUPABASE_KEY);
console.log("KEY_TYPE:", getKeyType(SUPABASE_KEY));
console.log("KEY_LENGTH:", SUPABASE_KEY ? SUPABASE_KEY.length : 0);
console.log("=================================");


// تست اصلی API
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "School Finance API is running"
    });
});


// تست ساده API
app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "API connection successful"
    });
});


// تست مستقیم REST API سوپابیس
app.get("/api/test-db", async (req, res) => {

    if (!SUPABASE_URL) {
        return res.status(500).json({
            success: false,
            message: "SUPABASE_URL is missing"
        });
    }

    if (!SUPABASE_KEY) {
        return res.status(500).json({
            success: false,
            message: "SUPABASE_SERVICE_ROLE_KEY is missing"
        });
    }

    try {

        const url =
            SUPABASE_URL +
            "/rest/v1/schools?select=id,name,code,active&order=id.asc";

        console.log("Testing Supabase REST:");
        console.log(url);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY,
                "Content-Type": "application/json"
            }
        });

        const text = await response.text();

        console.log("SUPABASE HTTP STATUS:", response.status);
        console.log("SUPABASE RESPONSE:", text);

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }

        if (!response.ok) {

            return res.status(500).json({
                success: false,
                message: "Supabase REST request failed",
                http_status: response.status,
                error: data,
                key_type: getKeyType(SUPABASE_KEY),
                key_length: SUPABASE_KEY.length,
                url: SUPABASE_URL
            });
        }

        return res.json({
            success: true,
            message: "Supabase REST connection successful",
            http_status: response.status,
            key_type: getKeyType(SUPABASE_KEY),
            key_length: SUPABASE_KEY.length,
            count: Array.isArray(data) ? data.length : null,
            schools: data
        });

    } catch (error) {

        console.error("FETCH ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server fetch error",
            error: error.message
        });
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(
        "School Finance API running on port " + PORT
    );
});
