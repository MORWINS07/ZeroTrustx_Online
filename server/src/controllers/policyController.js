const {
    createPolicy,
    getPolicies,
    getPolicyById,
    updatePolicy,
    deletePolicy
} = require("../services/policyService");

const create = async (req, res) => {
    try {
        const {
            name,
            description,
            priority,
            rules
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Policy name is required"
            });
        }

        if (priority !== undefined && typeof priority !== "number") {
            return res.status(400).json({
                message: "Policy priority must be a number"
            });
        }

        if (rules !== undefined && !Array.isArray(rules)) {
            return res.status(400).json({
                message: "Policy rules must be an array"
            });
        }

        const policy = await createPolicy({
            name,
            description,
            priority,
            rules
        });

        res.status(201).json({
            message: "Policy created successfully",
            policy
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const policies = await getPolicies();

        res.status(200).json({
            policies
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getOne = async (req, res) => {
    try {
        const policy = await getPolicyById(req.params.id);

        res.status(200).json({
            policy
        });
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
};

const update = async (req, res) => {
    try {
        const policy = await updatePolicy(
            req.params.id,
            req.body
        );

        res.status(200).json({
            message: "Policy updated successfully",
            policy
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const remove = async (req, res) => {
    try {
        const policy = await deletePolicy(req.params.id);

        res.status(200).json({
            message: "Policy deactivated successfully",
            policy
        });
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
};

module.exports = {
    create,
    getAll,
    getOne,
    update,
    remove
};