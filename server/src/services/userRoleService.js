const User = require("../models/User");
const Role = require("../models/Role");

const assignRoleToUser = async (userId, roleId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    const role = await Role.findById(roleId);

    if (!role) {
        throw new Error("Role not found");
    }

    const alreadyAssigned = user.roles.some(
        (assignedRoleId) => assignedRoleId.toString() === roleId.toString()
    );

    if (alreadyAssigned) {
        throw new Error("Role already assigned to user");
    }

    user.roles.push(role._id);
    await user.save();

    return User.findById(userId)
        .populate("roles");
};

module.exports = {
    assignRoleToUser
};