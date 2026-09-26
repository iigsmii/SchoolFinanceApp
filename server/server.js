const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "School Finance API is running"
    });
});

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "API connection successful"
    });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`School Finance API running on port ${PORT}`);
});
