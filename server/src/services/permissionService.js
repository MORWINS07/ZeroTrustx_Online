const Permission = require("../models/Permission");

const createPermission = async ({
    name,
    resource,
    action,
    description
}) => {
    const existingPermission = await Permission.findOne({
        resource,
        action
    });

    if (existingPermission) {
        throw new Error("Permission already exists");
    }

    const permission = await Permission.create({
        name,
        resource,
        action,
        description
    });

    return permission;
};

const getPermissions = async () => {
    return Permission.find().sort({
        resource: 1,
        action: 1
    });
};

module.exports = {
    createPermission,
    getPermissions
};