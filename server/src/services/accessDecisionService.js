const User = require("../models/User");
const Resource = require("../models/Resource");
const Device = require("../models/Device");
const Session = require("../models/Session");
const MfaConfig = require("../models/MfaConfig");
const AccessRequest = require("../models/AccessRequest");

const {
    checkDeviceAccess
} = require("./deviceAuthorizationService");

const {
    createAuditEvent
} = require("./auditService");

const evaluatePolicyRule = ({
    rule,
    mfaCheck,
    device,
    session,
    sessionCheck,
    userRoles,
    userPermissions,
    resource
}) => {
    let passed = false;
    let reason = "";

    switch (rule.type) {
        case "MFA":
            if (rule.operator === "REQUIRED") {
                passed = mfaCheck === rule.value;

                reason = passed
                    ? "MFA requirement satisfied"
                    : "MFA requirement failed";
            }
            break;

        case "DEVICE_STATUS":
            if (rule.operator === "EQUALS") {
                passed = device.status === rule.value;

                reason = passed
                    ? `Device status is ${device.status}`
                    : `Device status is ${device.status}, required ${rule.value}`;
            }
            break;

        case "SESSION_STATUS":
            if (rule.operator === "EQUALS") {
                const actualStatus = sessionCheck
                    ? "ACTIVE"
                    : session.status;

                passed = actualStatus === rule.value;

                reason = passed
                    ? `Session status is ${actualStatus}`
                    : `Session status is ${actualStatus}, required ${rule.value}`;
            }
            break;

        case "ROLE":
            if (rule.operator === "EQUALS") {
                passed = userRoles.some(
                    role => role.name === rule.value
                );

                reason = passed
                    ? `User has required role: ${rule.value}`
                    : `Required role not found: ${rule.value}`;
            }

            if (rule.operator === "IN") {
                passed = userRoles.some(
                    role =>
                        Array.isArray(rule.value) &&
                        rule.value.includes(role.name)
                );

                reason = passed
                    ? "User has an allowed role"
                    : "User does not have an allowed role";
            }
            break;

        case "PERMISSION":
            if (rule.operator === "REQUIRED") {
                passed = userPermissions.some(
                    permission =>
                        permission._id.toString() ===
                        rule.value.toString()
                );

                reason = passed
                    ? "Required permission is granted"
                    : "Required permission is not granted";
            }
            break;

        case "RESOURCE_SENSITIVITY":
            if (rule.operator === "EQUALS") {
                passed =
                    resource.sensitivity === rule.value;

                reason = passed
                    ? `Resource sensitivity is ${resource.sensitivity}`
                    : `Resource sensitivity is ${resource.sensitivity}, required ${rule.value}`;
            }
            break;

        default:
            passed = false;
            reason = `Unsupported policy rule type: ${rule.type}`;
    }

    return {
        passed,
        reason
    };
};

const evaluateAccess = async ({
    userId,
    resourceId,
    deviceId,
    sessionId,
    requestedAction,
    ipAddress = null,
    userAgent = null
}) => {
    if (
        !userId ||
        !resourceId ||
        !deviceId ||
        !sessionId ||
        !requestedAction
    ) {
        throw new Error(
            "userId, resourceId, deviceId, sessionId and requestedAction are required"
        );
    }

    // 1. USER + ROLES + PERMISSIONS
    const user = await User.findById(userId).populate({
        path: "roles",
        populate: {
            path: "permissions"
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    // 2. AUTHENTICATION
    const authenticationCheck =
        user.accountStatus === "ACTIVE";

    const authenticationReason = authenticationCheck
        ? "User account is active"
        : `User account is ${user.accountStatus}`;

    // 3. MFA
    const mfaConfig = await MfaConfig.findOne({ userId });

    const mfaCheck =
        !!mfaConfig &&
        mfaConfig.enabled === true &&
        mfaConfig.verifiedAt !== null;

    const mfaReason = mfaCheck
        ? "MFA is enabled and verified"
        : "MFA is not enabled or not verified";

    // 4. RESOURCE + POLICIES
    const resource = await Resource.findById(resourceId)
        .populate("requiredPermissions")
        .populate("policyIds");

    if (!resource) {
        throw new Error("Resource not found");
    }

    if (!resource.isActive) {
        throw new Error("Resource is inactive");
    }

    // 5. DEVICE
    const device = await Device.findOne({
        _id: deviceId,
        userId
    });

    if (!device) {
        throw new Error("Device not found");
    }

    // 6. DEVICE CHECK
    const deviceResult = await checkDeviceAccess(
        device.deviceIdentifier,
        userId
    );

    const deviceCheck = deviceResult.allowed;
    const deviceReason = deviceResult.reason;

    // 7. SESSION
    const session = await Session.findOne({
        _id: sessionId,
        userId
    });

    if (!session) {
        throw new Error("Session not found");
    }

    // 8. SESSION CHECK
    const sessionExpired =
        session.expiresAt <= new Date();

    const sessionCheck =
        session.status === "ACTIVE" &&
        !sessionExpired;

    let sessionReason;

    if (session.status !== "ACTIVE") {
        sessionReason =
            `Session is ${session.status.toLowerCase()}`;
    } else if (sessionExpired) {
        sessionReason = "Session has expired";
    } else {
        sessionReason = "Session is active";
    }

    // 9. RBAC
    const userRoles = user.roles || [];

    const rbacCheck =
        userRoles.length > 0;

    const roleNames =
        userRoles.map(role => role.name);

    const rbacReason = rbacCheck
        ? `User has assigned role(s): ${roleNames.join(", ")}`
        : "User has no assigned roles";

    // 10. USER PERMISSIONS
    const userPermissions = [];

    for (const role of userRoles) {
        for (const permission of role.permissions || []) {
            const alreadyExists =
                userPermissions.some(
                    existingPermission =>
                        existingPermission._id.toString() ===
                        permission._id.toString()
                );

            if (!alreadyExists) {
                userPermissions.push(permission);
            }
        }
    }

    // 11. PERMISSION
    const requiredPermissions =
        resource.requiredPermissions || [];

    const matchingPermission =
        requiredPermissions.find(
            requiredPermission =>
                userPermissions.some(
                    userPermission =>
                        userPermission._id.toString() ===
                            requiredPermission._id.toString() &&
                        userPermission.action ===
                            requestedAction
                )
        );

    const permissionCheck =
        requiredPermissions.length > 0 &&
        !!matchingPermission;

    let permissionReason;

    if (requiredPermissions.length === 0) {
        permissionReason =
            "Resource has no required permissions";
    } else if (permissionCheck) {
        permissionReason =
            `Permission '${matchingPermission.name}' granted`;
    } else {
        permissionReason =
            `Required permission for action '${requestedAction}' not granted`;
    }

    // 12. POLICY
    const policies =
        (resource.policyIds || [])
            .filter(policy => policy.isActive)
            .sort((a, b) => a.priority - b.priority);

    const policyResults = [];

    for (const policy of policies) {
        const ruleResults = [];

        for (const rule of policy.rules || []) {
            const result = evaluatePolicyRule({
                rule,
                mfaCheck,
                device,
                session,
                sessionCheck,
                userRoles,
                userPermissions,
                resource
            });

            ruleResults.push({
                type: rule.type,
                operator: rule.operator,
                expectedValue: rule.value,
                passed: result.passed,
                reason: result.reason
            });
        }

        const policyPassed =
            ruleResults.length === 0 ||
            ruleResults.every(rule => rule.passed);

        policyResults.push({
            policyId: policy._id,
            policyName: policy.name,
            priority: policy.priority,
            passed: policyPassed,
            rules: ruleResults
        });
    }

    const policyCheck =
        policies.length === 0 ||
        policyResults.every(policy => policy.passed);

    const policyReason =
        policies.length === 0
            ? "No active policies attached to resource"
            : policyCheck
                ? "All active resource policies passed"
                : "One or more resource policies failed";

    // 13. FINAL CHECKS
    const checks = {
        authentication: authenticationCheck,
        mfa: mfaCheck,
        device: deviceCheck,
        session: sessionCheck,
        rbac: rbacCheck,
        permission: permissionCheck,
        policy: policyCheck
    };

    // 14. FINAL DECISION
    const allChecksPassed =
        Object.values(checks).every(Boolean);

    const decision =
        allChecksPassed
            ? "ALLOW"
            : "DENY";

    // 15. DECISION REASON
    const failedChecks = [];

    if (!authenticationCheck) {
        failedChecks.push(
            `Authentication: ${authenticationReason}`
        );
    }

    if (!mfaCheck) {
        failedChecks.push(
            `MFA: ${mfaReason}`
        );
    }

    if (!deviceCheck) {
        failedChecks.push(
            `Device: ${deviceReason}`
        );
    }

    if (!sessionCheck) {
        failedChecks.push(
            `Session: ${sessionReason}`
        );
    }

    if (!rbacCheck) {
        failedChecks.push(
            `RBAC: ${rbacReason}`
        );
    }

    if (!permissionCheck) {
        failedChecks.push(
            `Permission: ${permissionReason}`
        );
    }

    if (!policyCheck) {
        failedChecks.push(
            `Policy: ${policyReason}`
        );
    }

    const decisionReason =
        decision === "ALLOW"
            ? "All Zero Trust access checks passed"
            : failedChecks.join("; ");

    // 16. PERSIST ACCESS REQUEST
    const accessRequest = await AccessRequest.create({
        userId,
        resourceId,
        deviceId,
        sessionId,
        requestedAction,

        checks: {
            authentication:
                authenticationCheck ? "PASS" : "FAIL",

            mfa:
                mfaCheck ? "PASS" : "FAIL",

            device:
                deviceCheck ? "PASS" : "FAIL",

            session:
                sessionCheck ? "PASS" : "FAIL",

            rbac:
                rbacCheck ? "PASS" : "FAIL",

            permission:
                permissionCheck ? "PASS" : "FAIL",

            policy:
                policyCheck ? "PASS" : "FAIL"
        },

        decision,
        decisionReason,
        evaluatedAt: new Date()
    });

    // 17. CREATE AUDIT EVENT
    const auditEvent = await createAuditEvent({
        actorUserId: userId,

        eventType:
            decision === "ALLOW"
                ? "ACCESS_ALLOWED"
                : "ACCESS_DENIED",

        targetType: "ACCESS_REQUEST",

        targetId: accessRequest._id,

        action: requestedAction,

        result:
            decision === "ALLOW"
                ? "SUCCESS"
                : "FAILURE",

        metadata: {
            resourceId,
            deviceId,
            sessionId,
            decision,
            decisionReason,
            checks
        },

        ipAddress,
        userAgent
    });

    // 18. RETURN COMPLETE RESULT
    return {
        accessRequestId: accessRequest._id,

        auditEventId: auditEvent._id,

        decision,
        decisionReason,

        checks: {
            authentication: {
                status:
                    authenticationCheck
                        ? "PASS"
                        : "FAIL",
                reason: authenticationReason
            },

            mfa: {
                status:
                    mfaCheck
                        ? "PASS"
                        : "FAIL",
                reason: mfaReason
            },

            device: {
                status:
                    deviceCheck
                        ? "PASS"
                        : "FAIL",
                reason: deviceReason
            },

            session: {
                status:
                    sessionCheck
                        ? "PASS"
                        : "FAIL",
                reason: sessionReason
            },

            rbac: {
                status:
                    rbacCheck
                        ? "PASS"
                        : "FAIL",
                reason: rbacReason,
                roles: roleNames
            },

            permission: {
                status:
                    permissionCheck
                        ? "PASS"
                        : "FAIL",
                reason: permissionReason
            },

            policy: {
                status:
                    policyCheck
                        ? "PASS"
                        : "FAIL",
                reason: policyReason,
                policies: policyResults
            }
        },

        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            accountStatus: user.accountStatus
        },

        resource: {
            id: resource._id,
            name: resource.name,
            type: resource.type,
            sensitivity: resource.sensitivity,
            isActive: resource.isActive
        },

        device: {
            id: device._id,
            name: device.name,
            type: device.type,
            status: device.status,
            deviceIdentifier: device.deviceIdentifier
        },

        session: {
            id: session._id,
            status: session.status,
            lastActivityAt: session.lastActivityAt,
            expiresAt: session.expiresAt
        }
    };
};

module.exports = {
    evaluateAccess
};