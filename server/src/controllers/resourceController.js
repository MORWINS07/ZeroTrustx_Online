const {
    createResource,
    getResources,
    getResourceById,
    updateResource,
    deleteResource
} = require("../services/resourceService");

const create = async (req, res) => {
    try {
        const {
            name,
            description,
            type,
            sensitivity,
            requiredPermissions,
            policyIds
        } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Resource name is required"
            });
        }

        if (!type) {
            return res.status(400).json({
                message: "Resource type is required"
            });
        }

        if (!sensitivity) {
            return res.status(400).json({
                message: "Resource sensitivity is required"
            });
        }

        const resource = await createResource({
            name,
            description,
            type,
            sensitivity,
            requiredPermissions,
            policyIds
        });

        res.status(201).json({
            message: "Resource created successfully",
            resource
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const getAll = async (req, res) => {
    try {
        const resources = await getResources();

        res.status(200).json({
            resources
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

const getOne = async (req, res) => {
    try {
        const resource = await getResourceById(req.params.id);

        res.status(200).json({
            resource
        });
    } catch (error) {
        res.status(404).json({
            message: error.message
        });
    }
};

const update = async (req, res) => {
    try {
        const resource = await updateResource(
            req.params.id,
            req.body
        );

        res.status(200).json({
            message: "Resource updated successfully",
            resource
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const remove = async (req, res) => {
    try {
        const resource = await deleteResource(req.params.id);

        res.status(200).json({
            message: "Resource deactivated successfully",
            resource
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