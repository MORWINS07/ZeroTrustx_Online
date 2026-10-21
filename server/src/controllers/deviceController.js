const {
    registerDevice,
    getUserDevices,
    trustDevice,
    revokeDevice,
    blockDevice,
    bootstrapFirstDevice
} = require("../services/deviceService");


const register = async (req, res) => {
    try {
        const {
            deviceIdentifier,
            name,
            type,
            metadata
        } = req.body;

        const device = await registerDevice({
            userId: req.user.userId,
            deviceIdentifier,
            name,
            type,
            metadata
        });

        res.status(201).json({
            message: "Device registered successfully",
            device
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const getMine = async (req, res) => {
    try {
        const devices = await getUserDevices(req.user.userId);

        res.status(200).json({
            devices
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve devices"
        });
    }
};

const trust = async (req, res) => {
    try {
        const device = await trustDevice(
            req.params.deviceId,
            req.user.userId
        );

        res.status(200).json({
            message: "Device trusted successfully",
            device
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const revoke = async (req, res) => {
    try {
        const device = await revokeDevice(
            req.params.deviceId,
            req.user.userId
        );

        res.status(200).json({
            message: "Device revoked successfully",
            device
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const block = async (req, res) => {
    try {
        const device = await blockDevice(
            req.params.deviceId,
            req.user.userId
        );

        res.status(200).json({
            message: "Device blocked successfully",
            device
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const bootstrap = async (req, res) => {
    try {
        const {
            deviceIdentifier,
            name,
            type,
            metadata
        } = req.body;

        const device = await bootstrapFirstDevice({
            userId: req.user.userId,
            deviceIdentifier,
            name,
            type,
            metadata
        });

        res.status(201).json({
            message: "First device registered and trusted successfully",
            device
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

module.exports = {
    register,
    getMine,
    trust,
    revoke,
    block,
    bootstrap
};