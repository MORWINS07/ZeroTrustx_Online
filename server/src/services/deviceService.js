const Device = require("../models/Device");
const { createAuditEvent } = require("./auditService");
const registerDevice = async ({
    userId,
    deviceIdentifier,
    name,
    type,
    metadata = {}
}) => {
    const existingDevice = await Device.findOne({
        deviceIdentifier
    });

    if (existingDevice) {
        throw new Error("Device already registered");
    }

    const device = await Device.create({
        userId,
        deviceIdentifier,
        name,
        type,
        status: "PENDING",
        metadata
    });

    await createAuditEvent({
    actorUserId: userId,
    eventType: "DEVICE_REGISTERED",
    targetType: "DEVICE",
    targetId: device._id,
    action: "register",
    result: "SUCCESS",
    metadata: {
        deviceIdentifier,
        name,
        type,
        status: device.status
    }
});

    return device;
};

const getUserDevices = async (userId) => {
    return Device.find({ userId })
        .sort({ createdAt: -1 });
};

const trustDevice = async (deviceId, userId) => {
    const device = await Device.findOne({
        _id: deviceId,
        userId
    });

    if (!device) {
        throw new Error("Device not found");
    }

    if (device.status === "REVOKED") {
        throw new Error("Revoked device cannot be trusted");
    }

    if (device.status === "BLOCKED") {
        throw new Error("Blocked device cannot be trusted");
    }

    device.status = "TRUSTED";
    device.lastSeenAt = new Date();

   await device.save();

await createAuditEvent({
    actorUserId: userId,
    eventType: "DEVICE_TRUSTED",
    targetType: "DEVICE",
    targetId: device._id,
    action: "trust",
    result: "SUCCESS",
    metadata: {
        deviceIdentifier: device.deviceIdentifier,
        name: device.name,
        status: device.status
    }
});

return device;
};

const revokeDevice = async (deviceId, userId) => {
    const device = await Device.findOne({
        _id: deviceId,
        userId
    });

    if (!device) {
        throw new Error("Device not found");
    }

    if (device.status === "REVOKED") {
        throw new Error("Device already revoked");
    }

    device.status = "REVOKED";
    device.revokedAt = new Date();

    await device.save();
    await createAuditEvent({
    actorUserId: userId,
    eventType: "DEVICE_REVOKED",
    targetType: "DEVICE",
    targetId: device._id,
    action: "revoke",
    result: "SUCCESS",
    metadata: {
        deviceIdentifier: device.deviceIdentifier,
        name: device.name,
        status: device.status
    }
});

    return device;
};

const blockDevice = async (deviceId, userId) => {
    const device = await Device.findOne({
        _id: deviceId,
        userId
    });

    if (!device) {
        throw new Error("Device not found");
    }

    if (device.status === "REVOKED") {
        throw new Error("Revoked device cannot be blocked");
    }

    if (device.status === "BLOCKED") {
        throw new Error("Device already blocked");
    }

    device.status = "BLOCKED";

await device.save();

await createAuditEvent({
    actorUserId: userId,
    eventType: "DEVICE_BLOCKED",
    targetType: "DEVICE",
    targetId: device._id,
    action: "block",
    result: "SUCCESS",
    metadata: {
        deviceIdentifier: device.deviceIdentifier,
        name: device.name,
        status: device.status
    }
});

return device;
};

const getTrustedDevice = async (userId, deviceIdentifier) => {
    const device = await Device.findOne({
        userId,
        deviceIdentifier,
        status: "TRUSTED"
    });

    if (!device) {
        throw new Error("Trusted device not found");
    }

    device.lastSeenAt = new Date();

    await device.save();

    return device;
};


/**
 * bootstrapFirstDevice — registers AND immediately trusts a device for a user.
 *
 * Handles 4 scenarios:
 *  1. Brand-new device identifier → create + trust
 *  2. Device already TRUSTED for this user → idempotent, return as-is
 *  3. Device REVOKED or BLOCKED for this user → re-activate to TRUSTED (re-enrollment)
 *  4. Device belongs to different user → hard reject
 */
const bootstrapFirstDevice = async ({
    userId,
    deviceIdentifier,
    name,
    type,
    metadata = {}
}) => {
    // Check if this identifier already exists in the system
    const existingByIdentifier = await Device.findOne({ deviceIdentifier });

    if (existingByIdentifier) {
        const isSameUser = existingByIdentifier.userId.toString() === userId.toString();

        if (!isSameUser) {
            // Belongs to a different account — hard reject
            throw new Error("Device identifier is already registered to another account.");
        }

        // Already TRUSTED for this user — idempotent success
        if (existingByIdentifier.status === "TRUSTED") {
            existingByIdentifier.lastSeenAt = new Date();
            if (name) existingByIdentifier.name = name;
            await existingByIdentifier.save();
            return existingByIdentifier;
        }

        // REVOKED or BLOCKED — re-enrollment after admin action. Reactivate it.
        const prevStatus = existingByIdentifier.status;
        existingByIdentifier.status = "TRUSTED";
        existingByIdentifier.name = name || existingByIdentifier.name;
        existingByIdentifier.type = type || existingByIdentifier.type;
        existingByIdentifier.lastSeenAt = new Date();
        existingByIdentifier.revokedAt = null;
        await existingByIdentifier.save();

        await createAuditEvent({
            actorUserId: userId,
            eventType: "DEVICE_TRUSTED",
            targetType: "DEVICE",
            targetId: existingByIdentifier._id,
            action: "bootstrap_reenroll",
            result: "SUCCESS",
            metadata: {
                deviceIdentifier,
                name,
                previousStatus: prevStatus,
                note: "Device re-enrolled via bootstrap after revocation/block"
            }
        });

        return existingByIdentifier;
    }

    // Brand new device — create and immediately trust it
    const device = await Device.create({
        userId,
        deviceIdentifier,
        name,
        type,
        status: "TRUSTED",
        lastSeenAt: new Date(),
        metadata
    });

    await createAuditEvent({
        actorUserId: userId,
        eventType: "DEVICE_REGISTERED",
        targetType: "DEVICE",
        targetId: device._id,
        action: "register",
        result: "SUCCESS",
        metadata: {
            deviceIdentifier,
            name,
            type,
            status: "PENDING→TRUSTED (bootstrap)"
        }
    });

    await createAuditEvent({
        actorUserId: userId,
        eventType: "DEVICE_TRUSTED",
        targetType: "DEVICE",
        targetId: device._id,
        action: "trust",
        result: "SUCCESS",
        metadata: {
            deviceIdentifier,
            name,
            status: device.status,
            note: "First-device bootstrap"
        }
    });

    return device;
};

module.exports = {
    registerDevice,
    getUserDevices,
    trustDevice,
    revokeDevice,
    blockDevice,
    getTrustedDevice,
    bootstrapFirstDevice
};