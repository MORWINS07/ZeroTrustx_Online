const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
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

        type: {
            type: String,
            enum: ["APPLICATION", "DATA", "API", "SYSTEM", "PORTAL", "OTHER"],
            required: true
        },

        sensitivity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            required: true
        },

        requiredPermissions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Permission"
            }
        ],

        policyIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Policy"
            }
        ],

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Resource", resourceSchema);