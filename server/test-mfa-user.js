const mongoose = require("mongoose");
const User = require("./src/models/User");
const Device = require("./src/models/Device");

const MONGODB_URI = "mongodb://127.0.0.1:27017/zerotrustx";

const run = async () => {
    await mongoose.connect(MONGODB_URI);

    const user = await User.findOne({
        email: "mfaaudit@zerotrustx.local"
    });

    if (!user) {
        throw new Error("MFA test user not found");
    }

    const existingDevice = await Device.findOne({
        deviceIdentifier: "ZT-MFA-AUDIT-001"
    });

    if (existingDevice) {
        console.log("Device already exists:", existingDevice._id);
    } else {
        const device = await Device.create({
            userId: user._id,
            deviceIdentifier: "ZT-MFA-AUDIT-001",
            name: "MFA Audit Test Device",
            type: "LAPTOP",
            status: "TRUSTED"
        });

        console.log("MFA test device created:", device._id);
    }

    console.log("User ID:", user._id);

    await mongoose.disconnect();
};

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
});