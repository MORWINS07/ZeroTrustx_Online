require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/database");

// ── Routes ────────────────────────────────────────────────────────────────
const authRoutes = require("./src/routes/authRoutes");
const deviceRoutes = require("./src/routes/deviceRoutes");
const mfaRoutes = require("./src/routes/mfaRoutes");
const refreshRoutes = require("./src/routes/refreshRoutes");
const logoutRoutes = require("./src/routes/logoutRoutes");
const permissionRoutes = require("./src/routes/permissionRoutes");
const roleRoutes = require("./src/routes/roleRoutes");
const userRoleRoutes = require("./src/routes/userRoleRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const policyRoutes = require("./src/routes/policyRoutes");
const accessDecisionRoutes = require("./src/routes/accessDecisionRoutes");
const auditRoutes = require("./src/routes/auditRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const testRoutes = require("./src/routes/testRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Id"]
}));

// ── Global Rate Limiting ───────────────────────────────────────────────────
const isDevOrTest = NODE_ENV === "development" || NODE_ENV === "test";

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevOrTest ? 10000 : 500,
    message: { success: false, message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevOrTest ? 2000 : 20,
    message: { success: false, message: "Too many authentication attempts, please try again later." }
});

app.use(globalLimiter);

// ── Body Parsing ───────────────────────────────────────────────────────────
// IMPORTANT: body parsing MUST come before routes
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

// ── Database ───────────────────────────────────────────────────────────────
connectDB();

// ── Health Check ───────────────────────────────────────────────────────────
const healthResponse = (req, res) => {
    res.json({
        success: true,
        message: "ZeroTrustX API is running",
        version: "1.0.0",
        environment: NODE_ENV
    });
};
app.get("/", healthResponse);
app.get("/health", healthResponse);
app.get("/api/v1/health", healthResponse);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/auth/refresh", authLimiter, refreshRoutes);
app.use("/api/v1/auth/logout", logoutRoutes);
app.use("/api/v1/mfa", mfaRoutes);
app.use("/api/v1/devices", deviceRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/user-roles", userRoleRoutes);
app.use("/api/v1/resources", resourceRoutes);
app.use("/api/v1/policies", policyRoutes);
app.use("/api/v1/access-requests", accessDecisionRoutes);
app.use("/api/v1/audit-events", auditRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/admin", adminRoutes);

if (NODE_ENV !== "production") {
    app.use("/api/v1/test", testRoutes);
}

// ── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
    const isDev = NODE_ENV === "development";

    // Never leak stack traces in production
    console.error("Unhandled error:", isDev ? err : err.message);

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Internal server error",
        ...(isDev && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`ZeroTrustX server running on http://localhost:${PORT} [${NODE_ENV}]`);
});