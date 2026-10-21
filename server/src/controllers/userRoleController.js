const { assignRoleToUser } = require("../services/userRoleService");

const assignRole = async (req, res) => {
    try {
        const { userId, roleId } = req.body;

        const user = await assignRoleToUser(userId, roleId);

        res.status(200).json({
            message: "Role assigned successfully",
            user
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

module.exports = {
    assignRole
};