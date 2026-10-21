const {
    createPermission,
    getPermissions
} = require("../services/permissionService");

const create = async (req, res) => {
    try {
        const permission = await createPermission(req.body);

        res.status(201).json({
            message: "Permission created successfully",
            permission
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const permissions = await getPermissions();

        res.status(200).json({
            permissions
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to retrieve permissions"
        });
    }
};

module.exports = {
    create,
    getAll
};