const mongoose = require("mongoose");

const policyRuleSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "MFA",
                "DEVICE_STATUS",
                "ROLE",
                "PERMISSION",
                "SESSION_STATUS",
                "RESOURCE_SENSITIVITY"
            ],
            required: true
        },

        operator: {
            type: String,
            enum: ["REQUIRED", "EQUALS", "IN"],
            required: true
        },

        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        description: {
            type: String,
            trim: true
        }
    },
    {
        _id: false
    }
);

const policySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        priority: {
            type: Number,
            required: true,
            default: 100
        },

        rules: {
            type: [policyRuleSchema],
            default: []
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

policySchema.index({ isActive: 1, priority: 1 });

module.exports = mongoose.model("Policy", policySchema);