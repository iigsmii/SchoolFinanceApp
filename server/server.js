const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    console.error("ERROR: SUPABASE_URL is not configured.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "ERROR: SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
}

let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "School Finance API is running",
        version: "1.0.1"
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "API connection successful"
    });
});

app.get("/api/test-db", async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({
                success: false,
                message: "Supabase environment variables are missing."
            });
        }

        const { data, error } = await supabase
            .from("schools")
            .select("id, name, code, active")
            .order("id", { ascending: true });

        if (error) {
            console.error("Supabase error:", error);

            return res.status(500).json({
                success: false,
                message: "Supabase connection failed.",
                error: error.message,

                // فقط URL، بدون Secret Key
                supabase_url: SUPABASE_URL
            });
        }

        return res.json({
            success: true,
            message: "Render is connected to Supabase.",

            // برای تشخیص پروژه متصل‌شده
            supabase_url: SUPABASE_URL,

            count: data ? data.length : 0,
            schools: data || []
        });

    } catch (error) {
        console.error("Database test error:", error);

        return res.status(500).json({
            success: false,
            message: "Unexpected server error.",
            error: error.message,

            // فقط URL، بدون Secret Key
            supabase_url: SUPABASE_URL
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `School Finance API running on port ${PORT}`
    );
});
