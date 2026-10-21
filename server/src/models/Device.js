const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        deviceIdentifier: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: ["DESKTOP", "LAPTOP", "MOBILE", "TABLET", "OTHER"],
            required: true
        },

        status: {
            type: String,
            enum: ["PENDING", "TRUSTED", "BLOCKED", "REVOKED"],
            default: "PENDING"
        },

        lastSeenAt: {
            type: Date,
            default: null
        },

        registeredAt: {
            type: Date,
            default: Date.now
        },

        revokedAt: {
            type: Date,
            default: null
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

deviceSchema.index({ userId: 1 });

module.exports = mongoose.model("Device", deviceSchema);