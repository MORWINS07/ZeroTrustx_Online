const User = require("../models/User");

const requirePermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    message: "Authentication required"
                });
            }

            const user = await User.findById(req.user.userId).populate({
                path: "roles",
                populate: {
                    path: "permissions"
                }
            });

            if (!user) {
                return res.status(401).json({
                    message: "User not found"
                });
            }

            const permissions = [];

            for (const role of user.roles || []) {
                for (const permission of role.permissions || []) {
                    const exists = permissions.some(
                        existing =>
                            existing._id.toString() ===
                            permission._id.toString()
                    );

                    if (!exists) {
                        permissions.push(permission);
                    }
                }
            }

            const hasPermission = permissions.some(
                permission => {
                    const resourceMatches =
                        permission.resource === resource ||
                        (resource === "audit_events" && permission.resource === "audit") ||
                        (resource === "audit" && permission.resource === "audit_events");
                    return resourceMatches && permission.action === action;
                }
            );

            if (!hasPermission) {
                return res.status(403).json({
                    message: "Permission denied"
                });
            }

            req.userPermissions = permissions;

            next();
        } catch (error) {
            console.error("Permission middleware error:", error);

            return res.status(500).json({
                message: "Authorization check failed"
            });
        }
    };
};

module.exports = requirePermission;