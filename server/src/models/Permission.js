const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        resource: {
            type: String,
            required: true,
            trim: true
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        isSystemPermission: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

permissionSchema.index(
    { resource: 1, action: 1 },
    { unique: true }
);

module.exports = mongoose.model("Permission", permissionSchema);