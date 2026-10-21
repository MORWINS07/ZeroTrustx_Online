const mongoose = require("mongoose");

const mfaConfigSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        method: {
            type: String,
            enum: ["TOTP"],
            default: "TOTP"
        },

        enabled: {
            type: Boolean,
            default: false
        },

        secret: {
            type: String,
            default: null,
            select: false
        },

        verifiedAt: {
            type: Date,
            default: null
        },

        lastUsedAt: {
            type: Date,
            default: null
        },

        backupCodes: [
            {
                codeHash: {
                    type: String,
                    required: true
                },

                usedAt: {
                    type: Date,
                    default: null
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("MfaConfig", mfaConfigSchema);