const Policy = require("../models/Policy");

const createPolicy = async ({
    name,
    description,
    priority = 100,
    rules = []
}) => {
    const existingPolicy = await Policy.findOne({ name });

    if (existingPolicy) {
        throw new Error("Policy already exists");
    }

    const policy = await Policy.create({
        name,
        description,
        priority,
        rules,
        isActive: true
    });

    return policy;
};

const getPolicies = async () => {
    return Policy.find()
        .sort({ priority: 1, createdAt: -1 });
};

const getPolicyById = async (policyId) => {
    const policy = await Policy.findById(policyId);

    if (!policy) {
        throw new Error("Policy not found");
    }

    return policy;
};

const updatePolicy = async (policyId, updates) => {
    const policy = await Policy.findById(policyId);

    if (!policy) {
        throw new Error("Policy not found");
    }

    const allowedFields = [
        "name",
        "description",
        "priority",
        "rules",
        "isActive"
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            policy[field] = updates[field];
        }
    }

    await policy.save();

    return policy;
};

const deletePolicy = async (policyId) => {
    const policy = await Policy.findById(policyId);

    if (!policy) {
        throw new Error("Policy not found");
    }

    // Soft delete
    policy.isActive = false;

    await policy.save();

    return policy;
};

module.exports = {
    createPolicy,
    getPolicies,
    getPolicyById,
    updatePolicy,
    deletePolicy
};