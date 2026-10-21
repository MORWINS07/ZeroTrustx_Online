const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        deviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Device",
            required: true
        },

        refreshTokenHash: {
            type: String,
            required: true,
            select: false
        },

        ipAddress: {
            type: String,
            required: true
        },

        userAgent: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["ACTIVE", "EXPIRED", "REVOKED"],
            default: "ACTIVE"
        },

        lastActivityAt: {
            type: Date,
            default: Date.now
        },

        expiresAt: {
            type: Date,
            required: true
        },

        revokedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);