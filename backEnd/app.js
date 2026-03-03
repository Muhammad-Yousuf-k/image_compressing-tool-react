import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import imageRouter from "./routes/imagesRoutes.js";
import { globalLimiter } from "./utils/rateLimiters.js";
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(globalLimiter);

// Test route
app.get("/", (req, res) => {
    res.send("Server is running 🚀");
});

// route
app.use("/images", imageRouter);

// Global error handler
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;

    console.error("🔥 Error caught:", {
        message: err.message,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method
    });

    res.status(statusCode).json({
        success: false,
        message: err.message || "Something went wrong",
        statusCode,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
});

//Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
