/**
 * ZeroTrustX – Database Seeder
 * ─────────────────────────────────────────────
 * Creates / updates:
 *   • System permissions  (resource × action matrix)
 *   • System roles        (Admin, Security Analyst, Developer, User)
 *   • Admin user account  (admin@zerotrustx.local / AdminPass@123)
 *   • Sample resources    (LOW → CRITICAL)
 *   • Default ZT policies (MFA required, TRUSTED device required, etc.)
 *
 * Safe to re-run: all upserts use findOneAndUpdate with upsert:true.
 *
 * Usage:
 *   node src/scripts/seedDatabase.js
 * Or via npm script:
 *   npm run seed          (from server/)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User       = require("../models/User");
const Role       = require("../models/Role");
const Permission = require("../models/Permission");
const Device     = require("../models/Device");
const Resource   = require("../models/Resource");
const Policy     = require("../models/Policy");

// ── Helpers ──────────────────────────────────────────────────────────────────

const upsertPermission = async ({ resource, action, name, description }) => {
    return Permission.findOneAndUpdate(
        { resource, action },
        { $setOnInsert: { name, description, isSystemPermission: true } },
        { upsert: true, returnDocument: "after" }
    );
};

const upsertRole = async ({ name, description, permissions, isSystemRole = true }) => {
    return Role.findOneAndUpdate(
        { name },
        { description, permissions, isSystemRole },
        { upsert: true, returnDocument: "after" }
    );
};

const upsertResource = async (data) => {
    return Resource.findOneAndUpdate(
        { name: data.name },
        { $setOnInsert: data },
        { upsert: true, returnDocument: "after" }
    );
};

const upsertPolicy = async ({ name, ...rest }) => {
    return Policy.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, ...rest } },
        { upsert: true, returnDocument: "after" }
    );
};

// ── Permission Matrix ────────────────────────────────────────────────────────

const PERMISSIONS_DEF = [
    // users
    { resource: "users",    action: "read",   name: "Read Users",        description: "View user accounts" },
    { resource: "users",    action: "write",  name: "Write Users",       description: "Create / modify users" },
    { resource: "users",    action: "delete", name: "Delete Users",      description: "Remove user accounts" },
    // devices
    { resource: "devices",  action: "read",   name: "Read Devices",      description: "View device inventory" },
    { resource: "devices",  action: "write",  name: "Manage Devices",    description: "Trust / revoke / block devices" },
    // sessions
    { resource: "sessions", action: "read",   name: "Read Sessions",     description: "View active sessions" },
    { resource: "sessions", action: "write",  name: "Manage Sessions",   description: "Revoke sessions" },
    // audit
    { resource: "audit",    action: "read",   name: "Read Audit Logs",   description: "View security audit events" },
    // resources
    { resource: "resources", action: "read",  name: "Read Resources",    description: "View protected resources" },
    { resource: "resources", action: "write", name: "Manage Resources",  description: "Create / update resources" },
    // policies
    { resource: "policies", action: "read",   name: "Read Policies",     description: "View access policies" },
    { resource: "policies", action: "write",  name: "Manage Policies",   description: "Create / modify policies" },
    // access
    { resource: "access",   action: "request", name: "Request Access",   description: "Submit access decisions" },
    // roles
    { resource: "roles",    action: "read",   name: "Read Roles",        description: "View RBAC roles" },
    { resource: "roles",    action: "write",  name: "Manage Roles",      description: "Create / modify roles" },
    // mfa
    { resource: "mfa",      action: "manage", name: "Manage MFA",        description: "Enable / disable MFA for any user" },
    // data resources (for ZT evaluation demos)
    { resource: "finance",  action: "read",   name: "Read Finance Data", description: "View financial records" },
    { resource: "hr",       action: "read",   name: "Read HR Data",      description: "View HR & personnel records" },
    { resource: "source-code", action: "read",  name: "Read Source Code",  description: "Access code repositories" },
    { resource: "source-code", action: "write", name: "Write Source Code", description: "Push to code repositories" },
    { resource: "logs",     action: "read",   name: "Read System Logs",  description: "View system and error logs" },
    { resource: "secrets",  action: "read",   name: "Read Secrets",      description: "Access secrets vault" },
];

// ── Role Definitions ─────────────────────────────────────────────────────────

const buildRoles = (permMap) => [
    {
        name: "Admin",
        description: "Full platform administrator with unrestricted access",
        permissions: Object.values(permMap),
    },
    {
        name: "Security Analyst",
        description: "Read-only access to all security data plus session management",
        permissions: [
            permMap["users:read"],
            permMap["devices:read"],
            permMap["sessions:read"],
            permMap["sessions:write"],
            permMap["audit:read"],
            permMap["resources:read"],
            permMap["policies:read"],
            permMap["access:request"],
            permMap["roles:read"],
            permMap["logs:read"],
        ].filter(Boolean),
    },
    {
        name: "Developer",
        description: "Access to source code, logs, and own device / session management",
        permissions: [
            permMap["devices:read"],
            permMap["devices:write"],
            permMap["sessions:read"],
            permMap["sessions:write"],
            permMap["resources:read"],
            permMap["access:request"],
            permMap["source-code:read"],
            permMap["source-code:write"],
            permMap["logs:read"],
        ].filter(Boolean),
    },
    {
        name: "User",
        description: "Basic authenticated user with self-service capabilities",
        permissions: [
            permMap["devices:read"],
            permMap["devices:write"],
            permMap["sessions:read"],
            permMap["sessions:write"],
            permMap["resources:read"],
            permMap["access:request"],
            permMap["audit:read"],
        ].filter(Boolean),
    },
];

// ── Sample Resources ─────────────────────────────────────────────────────────

const buildResources = (permMap) => [
    {
        name: "Employee Self-Service Portal",
        description: "HR self-service portal for leave, payroll, and benefits",
        type: "PORTAL",
        sensitivity: "LOW",
        requiredPermissions: [],
        policyIds: [],
        isActive: true,
    },
    {
        name: "Internal Documentation Wiki",
        description: "Company knowledge base and technical documentation",
        type: "APPLICATION",
        sensitivity: "LOW",
        requiredPermissions: [],
        policyIds: [],
        isActive: true,
    },
    {
        name: "Source Code Repository",
        description: "Internal Git server hosting all product source code",
        type: "SYSTEM",
        sensitivity: "MEDIUM",
        requiredPermissions: [permMap["source-code:read"], permMap["source-code:write"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
    {
        name: "Customer Database API",
        description: "REST API exposing customer PII and transaction data",
        type: "API",
        sensitivity: "HIGH",
        requiredPermissions: [permMap["resources:read"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
    {
        name: "HR Personnel Records",
        description: "Sensitive employee performance and compensation data",
        type: "DATA",
        sensitivity: "HIGH",
        requiredPermissions: [permMap["hr:read"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
    {
        name: "Financial Ledger",
        description: "Core accounting data – SOX-controlled",
        type: "DATA",
        sensitivity: "CRITICAL",
        requiredPermissions: [permMap["finance:read"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
    {
        name: "Secrets Vault",
        description: "Encryption keys, API secrets, and service credentials",
        type: "SYSTEM",
        sensitivity: "CRITICAL",
        requiredPermissions: [permMap["secrets:read"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
    {
        name: "Security Operations Dashboard",
        description: "Real-time threat intelligence and incident response platform",
        type: "APPLICATION",
        sensitivity: "HIGH",
        requiredPermissions: [permMap["audit:read"], permMap["logs:read"]].filter(Boolean),
        policyIds: [],
        isActive: true,
    },
];

// ── Default Policies ─────────────────────────────────────────────────────────

const POLICIES_DEF = [
    {
        name: "Require Active MFA",
        description: "All access requests must be made from accounts with active, verified MFA",
        priority: 10,
        isActive: true,
        rules: [
            {
                type: "MFA",
                operator: "REQUIRED",
                value: true,
                description: "MFA must be enabled and verified",
            },
        ],
    },
    {
        name: "Require Trusted Device",
        description: "Access is only permitted from devices in TRUSTED status",
        priority: 20,
        isActive: true,
        rules: [
            {
                type: "DEVICE_STATUS",
                operator: "EQUALS",
                value: "TRUSTED",
                description: "Device must be in TRUSTED state",
            },
        ],
    },
    {
        name: "Require Active Session",
        description: "Requests must originate from a currently active, non-expired session",
        priority: 30,
        isActive: true,
        rules: [
            {
                type: "SESSION_STATUS",
                operator: "EQUALS",
                value: "ACTIVE",
                description: "Session must be ACTIVE",
            },
        ],
    },
    {
        name: "High-Sensitivity Resource Baseline",
        description: "HIGH and CRITICAL resources require MFA + TRUSTED device + ACTIVE session",
        priority: 50,
        isActive: true,
        rules: [
            {
                type: "MFA",
                operator: "REQUIRED",
                value: true,
                description: "MFA required for high-sensitivity resources",
            },
            {
                type: "DEVICE_STATUS",
                operator: "EQUALS",
                value: "TRUSTED",
                description: "TRUSTED device required for high-sensitivity resources",
            },
            {
                type: "SESSION_STATUS",
                operator: "EQUALS",
                value: "ACTIVE",
                description: "Active session required",
            },
        ],
    },
    {
        name: "Admin-Only Critical Access",
        description: "CRITICAL resources are restricted to users in the Admin or Security Analyst role",
        priority: 5,
        isActive: true,
        rules: [
            {
                type: "ROLE",
                operator: "IN",
                value: ["Admin", "Security Analyst"],
                description: "User must be Admin or Security Analyst",
            },
            {
                type: "MFA",
                operator: "REQUIRED",
                value: true,
                description: "MFA always required",
            },
            {
                type: "DEVICE_STATUS",
                operator: "EQUALS",
                value: "TRUSTED",
                description: "TRUSTED device always required",
            },
        ],
    },
];

// ── Admin user ───────────────────────────────────────────────────────────────

const ADMIN_EMAIL    = "admin@zerotrustx.local";
const ADMIN_PASSWORD = "AdminPass@123";
const ADMIN_NAME     = "ZeroTrustX Admin";

// ── Main ─────────────────────────────────────────────────────────────────────

const seed = async () => {
    console.log("\n🌱  ZeroTrustX Database Seeder\n");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✓  Connected to MongoDB");

    // 1. Permissions
    console.log("\n── Seeding Permissions ──");
    const permMap = {};
    for (const def of PERMISSIONS_DEF) {
        const perm = await upsertPermission(def);
        permMap[`${def.resource}:${def.action}`] = perm._id;
        console.log(`   ✓ ${def.resource}:${def.action}`);
    }

    // 2. Roles
    console.log("\n── Seeding Roles ──");
    const roleMap = {};
    for (const roleDef of buildRoles(permMap)) {
        const role = await upsertRole(roleDef);
        roleMap[role.name] = role;
        console.log(`   ✓ ${role.name}  (${roleDef.permissions.length} permissions)`);
    }

    // 3. Admin user
    console.log("\n── Seeding Admin User ──");
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    let adminUser = existing;
    if (existing) {
        // Ensure the Admin role is assigned
        if (!existing.roles.some(r => r.toString() === roleMap["Admin"]._id.toString())) {
            existing.roles.push(roleMap["Admin"]._id);
            await existing.save();
            console.log(`   ✓ Admin role assigned to existing user (${ADMIN_EMAIL})`);
        } else {
            console.log(`   ✓ Admin user already exists and has Admin role (${ADMIN_EMAIL})`);
        }
    } else {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
        adminUser = await User.create({
            name: ADMIN_NAME,
            email: ADMIN_EMAIL,
            passwordHash,
            roles: [roleMap["Admin"]._id],
            accountStatus: "ACTIVE",
        });
        console.log(`   ✓ Admin user created: ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
    }

    // Ensure default trusted device for Admin
    const adminDeviceId = "admin-trusted-device";
    let adminDev = await Device.findOne({ deviceIdentifier: adminDeviceId });
    if (!adminDev) {
        await Device.create({
            userId: adminUser._id,
            deviceIdentifier: adminDeviceId,
            name: "Admin Primary Workstation",
            type: "LAPTOP",
            status: "TRUSTED",
            lastSeenAt: new Date(),
        });
        console.log(`   ✓ Admin trusted device seeded: ${adminDeviceId}`);
    }

    // 4. Resources
    console.log("\n── Seeding Resources ──");
    const createdResources = [];
    for (const res of buildResources(permMap)) {
        const created = await upsertResource(res);
        createdResources.push(created);
        console.log(`   ✓ [${res.sensitivity.padEnd(8)}] ${res.name}`);
    }

    // 5. Policies
    console.log("\n── Seeding Policies ──");
    const createdPolicies = [];
    for (const pol of POLICIES_DEF) {
        const created = await upsertPolicy(pol);
        createdPolicies.push(created);
        console.log(`   ✓ Priority ${String(pol.priority).padStart(3)}: ${pol.name}`);
    }

    // 6. Attach policies to HIGH/CRITICAL resources
    console.log("\n── Attaching Policies to High-Sensitivity Resources ──");
    const mfaPolicy         = createdPolicies.find(p => p.name === "Require Active MFA");
    const devicePolicy      = createdPolicies.find(p => p.name === "Require Trusted Device");
    const sessionPolicy     = createdPolicies.find(p => p.name === "Require Active Session");
    const highBaselinePolicy = createdPolicies.find(p => p.name === "High-Sensitivity Resource Baseline");
    const criticalPolicy    = createdPolicies.find(p => p.name === "Admin-Only Critical Access");

    for (const resource of createdResources) {
        let policiesToAttach = [];

        if (resource.sensitivity === "LOW") {
            policiesToAttach = [mfaPolicy, devicePolicy, sessionPolicy];
        } else if (resource.sensitivity === "MEDIUM") {
            policiesToAttach = [mfaPolicy, devicePolicy, sessionPolicy];
        } else if (resource.sensitivity === "HIGH") {
            policiesToAttach = [highBaselinePolicy];
        } else if (resource.sensitivity === "CRITICAL") {
            policiesToAttach = [criticalPolicy, highBaselinePolicy];
        }

        const policyIds = policiesToAttach
            .filter(Boolean)
            .map(p => p._id);

        await Resource.findByIdAndUpdate(resource._id, { policyIds });
        console.log(`   ✓ [${resource.sensitivity.padEnd(8)}] ${resource.name}  →  ${policyIds.length} polic${policyIds.length === 1 ? "y" : "ies"} attached`);
    }

    console.log("\n✅  Seed complete!\n");
    console.log("   Admin login:  admin@zerotrustx.local  /  AdminPass@123");
    console.log("   (Change the admin password after first login in production.)\n");
};

seed()
    .catch(err => {
        console.error("\n❌  Seed failed:", err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
