const {
    getAuditEvents,
    getAuditEventById
} = require("../services/auditService");

const getAll = async (req, res) => {
    try {
        const events = await getAuditEvents();

        res.status(200).json({
            message: "Audit events retrieved successfully",
            count: events.length,
            events
        });
    } catch (error) {
        console.error("Get audit events error:", error);

        res.status(500).json({
            message: error.message
        });
    }
};

const getById = async (req, res) => {
    try {
        const { auditEventId } = req.params;

        const event = await getAuditEventById(auditEventId);

        res.status(200).json({
            message: "Audit event retrieved successfully",
            event
        });
    } catch (error) {
        console.error("Get audit event error:", error);

        res.status(404).json({
            message: error.message
        });
    }
};

module.exports = {
    getAll,
    getById
};