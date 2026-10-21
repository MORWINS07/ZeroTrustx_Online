const mongoose = require("mongoose");

const auditEventSchema = new mongoose.Schema(
    {
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        eventType: {
            type: String,
            enum: [
                "USER_REGISTERED",
                "LOGIN_SUCCESS",
                "LOGIN_FAILED",
                "MFA_ENABLED",
                "MFA_DISABLED",
                "MFA_FAILED",
                "MFA_SUCCESS",
                "DEVICE_REGISTERED",
                "DEVICE_TRUSTED",
                "DEVICE_BLOCKED",
                "DEVICE_REVOKED",
                "SESSION_CREATED",
                "SESSION_REVOKED",
                "SESSION_EXPIRED",
                "ACCESS_ALLOWED",
                "ACCESS_DENIED",
                "POLICY_EVALUATED",
                "POLICY_CREATED",
                "POLICY_UPDATED",
                "ROLE_CHANGED",
                "PERMISSION_CHANGED",
                "RESOURCE_CREATED",
                "RESOURCE_UPDATED",
                "LOGOUT",
                "ADMIN_ACTION"
            ],
            required: true
        },

        targetType: {
            type: String,
            enum: [
                "USER",
                "DEVICE",
                "SESSION",
                "ROLE",
                "PERMISSION",
                "RESOURCE",
                "POLICY",
                "ACCESS_REQUEST",
                "SYSTEM"
            ],
            required: true
        },

        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        result: {
            type: String,
            enum: ["SUCCESS", "FAILURE"],
            required: true
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        ipAddress: {
            type: String,
            default: null
        },

        userAgent: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ actorUserId: 1, createdAt: -1 });
auditEventSchema.index({ eventType: 1, createdAt: -1 });
auditEventSchema.index({ result: 1, createdAt: -1 });

module.exports = mongoose.model("AuditEvent", auditEventSchema);