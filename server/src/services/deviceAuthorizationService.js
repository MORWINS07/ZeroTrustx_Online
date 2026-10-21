const Device = require("../models/Device");

const checkDeviceAccess = async (deviceIdentifier, userId) => {
    const device = await Device.findOne({
        deviceIdentifier,
        userId
    });

    if (!device) {
        return {
            allowed: false,
            reason: "Device not registered"
        };
    }

    if (device.status !== "TRUSTED") {
        return {
            allowed: false,
            reason: `Device is ${device.status.toLowerCase()}`
        };
    }

    device.lastSeenAt = new Date();
    await device.save();

    return {
        allowed: true,
        reason: "Device is trusted",
        device
    };
};

module.exports = {
    checkDeviceAccess
};