const jwt = require("jsonwebtoken");

const getAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");
    return secret;
};

const getMfaSecret = () => {
    // Use a different secret for MFA challenge tokens to prevent misuse
    const secret = process.env.JWT_MFA_SECRET || process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_MFA_SECRET is not configured");
    return secret;
};

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

const generateAccessToken = (userId, extra = {}) => {
    return jwt.sign(
        { userId, ...extra },
        getAccessSecret(),
        { expiresIn: ACCESS_TOKEN_TTL }
    );
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, getAccessSecret());
};

const generateMfaChallengeToken = (userId, deviceId) => {
    return jwt.sign(
        {
            userId,
            deviceId,
            purpose: "MFA_CHALLENGE"
        },
        getMfaSecret(),
        { expiresIn: "5m" }
    );
};

const verifyMfaChallengeToken = (token) => {
    const decoded = jwt.verify(token, getMfaSecret());

    if (decoded.purpose !== "MFA_CHALLENGE") {
        throw new Error("Invalid MFA challenge token");
    }

    return decoded;
};

module.exports = {
    generateAccessToken,
    verifyAccessToken,
    generateMfaChallengeToken,
    verifyMfaChallengeToken
};