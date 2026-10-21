const {
    createRole,
    getRoles,
    addPermissionsToRole
} = require("../services/roleService");

const create = async (req, res) => {
    try {
        const role = await createRole(req.body);

        res.status(201).json({
            message: "Role created successfully",
            role
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const roles = await getRoles();

        res.status(200).json({
            roles
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve roles"
        });
    }
};

const addPermissions = async (req, res) => {
    try {
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
            return res.status(400).json({
                message: "permissionIds must be a non-empty array"
            });
        }

        const role = await addPermissionsToRole(
            req.params.id,
            permissionIds
        );

        res.status(200).json({
            message: "Permissions added to role successfully",
            role
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

module.exports = {
    create,
    getAll,
    addPermissions
};