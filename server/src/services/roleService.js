const Role = require("../models/Role");

const createRole = async ({
    name,
    description,
    permissions = [],
    isSystemRole = false
}) => {
    const existingRole = await Role.findOne({ name });

    if (existingRole) {
        throw new Error("Role already exists");
    }

    const role = await Role.create({
        name,
        description,
        permissions,
        isSystemRole
    });

    return role;
};

const getRoles = async () => {
    return Role.find()
        .populate("permissions")
        .sort({ name: 1 });
};

const addPermissionsToRole = async (roleId, permissionIds) => {
    const role = await Role.findById(roleId);

    if (!role) {
        throw new Error("Role not found");
    }

    for (const permissionId of permissionIds) {
        if (!role.permissions.some(
            existingId => existingId.toString() === permissionId.toString()
        )) {
            role.permissions.push(permissionId);
        }
    }

    await role.save();

    return Role.findById(roleId)
        .populate("permissions");
};

module.exports = {
    createRole,
    getRoles,
    addPermissionsToRole
};