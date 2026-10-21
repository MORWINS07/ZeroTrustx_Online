/**
 * MFA Service – TOTP (RFC 6238 / Google Authenticator)
 * ──────────────────────────────────────────────────────────────────────────────
 * Rewritten to use otplib v13 functional API:
 *   generateSync / verifySync / generateSecret / generateURI
 *
 * Google Authenticator settings:
 *   algorithm: SHA1  |  digits: 6  |  period: 30s  |  window: ±1 step
 */

const {
    generateSync,
    verifySync,
    generateSecret,
    generateURI
} = require("otplib");

const MfaConfig = require("../models/MfaConfig");
const { createAuditEvent } = require("./auditService");

// ── TOTP options (Google Authenticator compatible) ────────────────────────────

const TOTP_OPTS = {
    type:      "totp",
    algorithm: "SHA1",
    digits:    6,
    period:    30,
    window:    1   // allow ±1 time-step (30-second tolerance)
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const totpGenerate = (secret) =>
    generateSync({ ...TOTP_OPTS, secret });

const totpVerify = (token, secret) => {
    const result = verifySync({ ...TOTP_OPTS, token: String(token).trim(), secret });
    // verifySync returns { valid, delta } or false
    if (result && typeof result === "object") return result.valid === true;
    return result === true;
};

// ── Service functions ─────────────────────────────────────────────────────────

const setupMfa = async (userId, email) => {
    let config = await MfaConfig.findOne({ userId });

    if (config && config.enabled) {
        throw new Error("MFA is already enabled");
    }

    // Generate a cryptographically secure 160-bit Base32 secret (20 bytes)
    const secret = generateSecret(20);

    if (!config) {
        config = await MfaConfig.create({
            userId,
            method:  "TOTP",
            enabled: false,
            secret
        });
    } else {
        config.method     = "TOTP";
        config.enabled    = false;
        config.secret     = secret;
        config.verifiedAt = null;
        config.lastUsedAt = null;
        await config.save();
    }

    // Build an otpauth:// URI that Google Authenticator can scan
    const issuer     = process.env.APP_NAME || "ZeroTrustX";
    const otpauthUrl = generateURI({
        ...TOTP_OPTS,
        secret,
        label:  email,
        issuer
    });

    return {
        method: config.method,
        secret,
        otpauthUrl
    };
};

const verifyMfaSetup = async (userId, token) => {
    const config = await MfaConfig
        .findOne({ userId })
        .select("+secret");

    if (!config) {
        throw new Error("MFA setup not found. Call POST /api/v1/mfa/setup first.");
    }

    if (config.enabled) {
        throw new Error("MFA is already enabled");
    }

    if (!config.secret) {
        throw new Error("MFA secret missing. Please restart setup.");
    }

    let verified = false;
    try {
        verified = totpVerify(token, config.secret);
    } catch {
        throw new Error("Invalid MFA code format");
    }

    if (!verified) {
        throw new Error(
            "Invalid MFA code. Please ensure your device clock is accurate and try the current code."
        );
    }

    config.enabled    = true;
    config.verifiedAt = new Date();
    config.lastUsedAt = new Date();
    await config.save();

    await createAuditEvent({
        actorUserId: userId,
        eventType:   "MFA_ENABLED",
        targetType:  "USER",
        targetId:    userId,
        action:      "mfa_setup",
        result:      "SUCCESS",
        metadata:    { method: "TOTP" }
    });

    return {
        enabled:    config.enabled,
        method:     config.method,
        verifiedAt: config.verifiedAt
    };
};

const verifyMfaLogin = async (userId, token) => {
    const config = await MfaConfig
        .findOne({ userId })
        .select("+secret");

    if (!config) {
        throw new Error("MFA is not configured");
    }

    if (!config.enabled) {
        throw new Error("MFA is not enabled");
    }

    if (!config.secret) {
        throw new Error("MFA secret missing. Please contact support.");
    }

    let verified = false;
    try {
        verified = totpVerify(token, config.secret);
    } catch {
        throw new Error("Invalid MFA code format");
    }

    if (!verified) {
        throw new Error("Invalid MFA code. Please check your authenticator app and try again.");
    }

    config.lastUsedAt = new Date();
    await config.save();

    return {
        verified:    true,
        lastUsedAt:  config.lastUsedAt
    };
};

const getMfaStatus = async (userId) => {
    const config = await MfaConfig.findOne({ userId });

    return {
        enabled:    !!(config && config.enabled),
        method:     config ? config.method    : null,
        verifiedAt: config ? config.verifiedAt : null,
        lastUsedAt: config ? config.lastUsedAt : null
    };
};

const disableMfa = async (userId, token) => {
    const config = await MfaConfig
        .findOne({ userId })
        .select("+secret");

    if (!config || !config.enabled) {
        throw new Error("MFA is not enabled");
    }

    let verified = false;
    try {
        verified = totpVerify(token, config.secret);
    } catch {
        throw new Error("Invalid MFA code format");
    }

    if (!verified) {
        throw new Error("Invalid MFA code. Cannot disable MFA.");
    }

    config.enabled    = false;
    config.secret     = null;
    config.verifiedAt = null;
    config.lastUsedAt = null;
    await config.save();

    await createAuditEvent({
        actorUserId: userId,
        eventType:   "MFA_DISABLED",
        targetType:  "USER",
        targetId:    userId,
        action:      "mfa_disable",
        result:      "SUCCESS",
        metadata:    { method: "TOTP" }
    });

    return { disabled: true };
};

module.exports = {
    setupMfa,
    verifyMfaSetup,
    verifyMfaLogin,
    getMfaStatus,
    disableMfa,
    // Expose for testing/admin tooling
    totpGenerate,
    totpVerify
};