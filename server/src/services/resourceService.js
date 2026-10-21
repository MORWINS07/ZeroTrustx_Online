const Resource = require("../models/Resource");
const Policy = require("../models/Policy");

const createResource = async ({
    name,
    description,
    type,
    sensitivity,
    requiredPermissions = [],
    policyIds = []
}) => {
    const existingResource = await Resource.findOne({ name });

    if (existingResource) {
        throw new Error("Resource already exists");
    }

    const resource = await Resource.create({
        name,
        description,
        type,
        sensitivity,
        requiredPermissions,
        policyIds,
        isActive: true
    });

    return resource;
};

const getResources = async () => {
    return Resource.find()
        .populate("requiredPermissions")
        .populate("policyIds")
        .sort({ createdAt: -1 });
};

const getResourceById = async (resourceId) => {
    const resource = await Resource.findById(resourceId)
        .populate("requiredPermissions")
        .populate("policyIds");

    if (!resource) {
        throw new Error("Resource not found");
    }

    return resource;
};

const updateResource = async (resourceId, updates) => {
    const resource = await Resource.findById(resourceId);

    if (!resource) {
        throw new Error("Resource not found");
    }

    const allowedFields = [
        "name",
        "description",
        "type",
        "sensitivity",
        "requiredPermissions",
        "policyIds",
        "isActive"
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            resource[field] = updates[field];
        }
    }

    await resource.save();

    return resource;
};

const deleteResource = async (resourceId) => {
    const resource = await Resource.findById(resourceId);

    if (!resource) {
        throw new Error("Resource not found");
    }

    resource.isActive = false;
    await resource.save();

    return resource;
};

module.exports = {
    createResource,
    getResources,
    getResourceById,
    updateResource,
    deleteResource
};