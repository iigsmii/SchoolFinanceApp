const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL:", SUPABASE_URL);
console.log(
    "SUPABASE_KEY_EXISTS:",
    !!SUPABASE_KEY
);

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(
        SUPABASE_URL,
        SUPABASE_KEY,
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
        message: "School Finance API is running"
    });
});

app.get("/api/test-db", async (req, res) => {

    if (!SUPABASE_URL) {
        return res.status(500).json({
            success: false,
            error: "SUPABASE_URL missing"
        });
    }

    if (!SUPABASE_KEY) {
        return res.status(500).json({
            success: false,
            error: "SUPABASE_SERVICE_ROLE_KEY missing"
        });
    }

    try {

        const { data, error } = await supabase
            .from("schools")
            .select("*");

        if (error) {
            console.error("SUPABASE ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Supabase connection failed",
                error: error.message,
                url: SUPABASE_URL
            });
        }

        return res.json({
            success: true,
            message: "Supabase connection successful",
            url: SUPABASE_URL,
            count: data.length,
            schools: data
        });

    } catch (err) {

        console.error("SERVER ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        "School Finance API running on port " + PORT
    );
});
