const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");
const Role = require("../models/Role");

const bootstrapAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne({
            email: "roletest@zerotrustx.local"
        });

        if (!user) {
            throw new Error("Target user not found");
        }

        const adminRole = await Role.findOne({
            name: "Admin"
        });

        if (!adminRole) {
            throw new Error("Admin role not found");
        }

        const alreadyAssigned = user.roles.some(
            (roleId) => roleId.toString() === adminRole._id.toString()
        );

        if (alreadyAssigned) {
            console.log("Admin role already assigned");
        } else {
            user.roles.push(adminRole._id);
            await user.save();

            console.log("Admin role assigned successfully");
        }

        const updatedUser = await User.findById(user._id)
            .populate("roles");

        console.log(
            "User roles:",
            updatedUser.roles.map((role) => role.name)
        );

    } catch (error) {
        console.error("Bootstrap failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

bootstrapAdmin();