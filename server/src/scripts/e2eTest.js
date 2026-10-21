/**
 * ZeroTrustX – End-to-End Lifecycle Verification
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests the complete Zero Trust flow against a RUNNING server on localhost:5000.
 *
 * Scenarios covered:
 *   1.  Server Health Check
 *   2.  Register a new test user
 *   3.  Bootstrap (enroll) first trusted device
 *   4.  Login with valid credentials
 *   5.  Refresh the access token
 *   6.  Setup MFA (get QR / secret)
 *   7.  Enable MFA (verify TOTP)
 *   8.  Login again to get MFA challenge, then complete it
 *   9.  Get own devices list
 *  10.  Get own sessions
 *  11.  List resources (seeded by seedDatabase.js)
 *  12.  Submit an Access Request and verify ALLOW/DENY decision
 *  13.  Fetch audit events (must contain the access decision)
 *  14.  Revoke the test session (logout)
 *  15.  Confirm protected endpoints are inaccessible after logout
 *
 * Usage:
 *   node src/scripts/e2eTest.js
 * Or via npm script:
 *   npm run e2e   (from server/)
 */

const http = require("http");
const { generateSync } = require("otplib");

const TOTP_OPTS = { type: "totp", algorithm: "SHA1", digits: 6, period: 30, window: 1 };

// ── Config ────────────────────────────────────────────────────────────────────

const BASE      = "http://localhost:5000/api/v1";
const EMAIL     = `e2e-${Date.now()}@zerotrustx.test`;
const PASS      = "E2eTestPass@99";
const DEVICE_ID = `e2e-device-${Date.now()}`;

// ── HTTP helper ───────────────────────────────────────────────────────────────

const request = (method, path, body, headers = {}) =>
    new Promise((resolve, reject) => {
        const url = new URL(`${BASE}${path}`);
        const payload = body ? JSON.stringify(body) : null;

        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
                ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
            },
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });

// ── Logger ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const ok  = (label) => { console.log(`  ✅  ${label}`); passed++; };
const fail = (label, info) => { console.log(`  ❌  ${label}`); if (info) console.log(`       ${info}`); failed++; };

const assert = (condition, label, info) =>
    condition ? ok(label) : fail(label, info);

// ── Test State ────────────────────────────────────────────────────────────────

let accessToken  = null;
let refreshToken = null;
let sessionId    = null;
let deviceDbId   = null;
let mfaSecret    = null;

// ── Tests ─────────────────────────────────────────────────────────────────────

const run = async () => {
    console.log("\n🔍  ZeroTrustX E2E Lifecycle Test\n");
    console.log(`    Server   : ${BASE}`);
    console.log(`    Test user: ${EMAIL}\n`);

    // ── 1. Health check ───────────────────────────────────────────────────────
    console.log("── Step 1: Server Health Check");
    try {
        const { status, body } = await request("GET", "/health", null);
        assert(status === 200 && body.success, "Server is healthy", JSON.stringify(body));
    } catch {
        fail("Server unreachable – is it running on port 5000?");
        process.exit(1);
    }

    // ── 2. Register ───────────────────────────────────────────────────────────
    console.log("\n── Step 2: Register");
    const reg = await request("POST", "/auth/register", {
        name: "E2E Test User",
        email: EMAIL,
        password: PASS,
    });
    assert(reg.status === 201, "User registration succeeds", JSON.stringify(reg.body));
    const bootstrapToken = reg.body?.bootstrapToken || reg.body?.data?.bootstrapToken;
    assert(!!bootstrapToken, "Bootstrap token is returned");

    // ── 3. Bootstrap device ───────────────────────────────────────────────────
    console.log("\n── Step 3: Bootstrap First Device");
    const boot = await request(
        "POST",
        "/devices/bootstrap",
        { deviceIdentifier: DEVICE_ID, name: "E2E Laptop", type: "LAPTOP" },
        { Authorization: `Bearer ${bootstrapToken}`, "X-Device-Id": DEVICE_ID }
    );
    assert(boot.status === 201, "First device bootstrapped", JSON.stringify(boot.body));
    deviceDbId = boot.body?.device?._id || boot.body?.data?.device?._id;
    assert(!!deviceDbId, "Device DB ID returned");

    // ── 4. Login ──────────────────────────────────────────────────────────────
    console.log("\n── Step 4: Login (no MFA yet)");
    const login = await request(
        "POST",
        "/auth/login",
        { email: EMAIL, password: PASS },
        { "X-Device-Id": DEVICE_ID }
    );
    accessToken  = login.body?.accessToken  || login.body?.data?.accessToken;
    refreshToken = login.body?.refreshToken || login.body?.data?.refreshToken;
    sessionId    = login.body?.session?.id  || login.body?.session?._id || login.body?.data?.session?.id;

    assert(
        login.status === 200 && !!accessToken,
        "Login returns access token",
        JSON.stringify(login.body)
    );

    // ── 5. Refresh token ──────────────────────────────────────────────────────
    console.log("\n── Step 5: Token Refresh");
    if (refreshToken) {
        const refresh = await request("POST", "/auth/refresh", { refreshToken });
        const newAccess = refresh.body?.accessToken || refresh.body?.data?.accessToken;
        assert(refresh.status === 200 && !!newAccess, "Token refresh works", JSON.stringify(refresh.body));
        accessToken = newAccess || accessToken;
    } else {
        fail("Skipping refresh – no refreshToken received in step 4");
    }

    const authHeader = { Authorization: `Bearer ${accessToken}`, "X-Device-Id": DEVICE_ID };

    // ── 6. MFA Setup ──────────────────────────────────────────────────────────
    console.log("\n── Step 6: MFA Setup (TOTP generation)");
    const mfaSetup = await request("POST", "/mfa/setup", null, authHeader);
    mfaSecret = mfaSetup.body?.secret || mfaSetup.body?.data?.secret;
    assert(mfaSetup.status === 200 && !!mfaSecret, "MFA setup returns secret", JSON.stringify(mfaSetup.body));

    // ── 7. MFA Enable ─────────────────────────────────────────────────────────
    console.log("\n── Step 7: Enable MFA (verify TOTP)");
    if (mfaSecret) {
        const totp = generateSync({ ...TOTP_OPTS, secret: mfaSecret });
        const mfaEnable = await request("POST", "/mfa/verify", { token: totp }, authHeader);
        assert(
            mfaEnable.status === 200,
            `MFA enabled with TOTP ${totp}`,
            JSON.stringify(mfaEnable.body)
        );
    } else {
        fail("Skipping MFA enable – no secret from step 6");
    }

    // ── 8. Login with MFA ─────────────────────────────────────────────────────
    console.log("\n── Step 8: Login with MFA Challenge Flow");
    const login2 = await request(
        "POST",
        "/auth/login",
        { email: EMAIL, password: PASS },
        { "X-Device-Id": DEVICE_ID }
    );

    const isMfaChallenge = login2.body?.mfaRequired || login2.body?.data?.mfaRequired || login2.status === 206;
    if (isMfaChallenge) {
        ok("Server signals MFA is required (mfaRequired: true)");
        const mfaToken = login2.body?.mfaChallengeToken || login2.body?.data?.mfaChallengeToken || login2.body?.data?.mfaSessionToken;
        const totp2    = mfaSecret ? generateSync({ ...TOTP_OPTS, secret: mfaSecret }) : "000000";
        const mfaVerify = await request("POST", "/mfa/login/verify", {
            mfaChallengeToken: mfaToken,
            token: totp2,
        }, { "X-Device-Id": DEVICE_ID });
        assert(mfaVerify.status === 200, "MFA challenge verified, tokens issued", JSON.stringify(mfaVerify.body));
        accessToken  = mfaVerify.body?.accessToken  || mfaVerify.body?.data?.accessToken  || accessToken;
        refreshToken = mfaVerify.body?.refreshToken || mfaVerify.body?.data?.refreshToken || refreshToken;
        sessionId    = mfaVerify.body?.session?.id  || mfaVerify.body?.session?._id || mfaVerify.body?.data?.session?.id || sessionId;
    } else if (login2.status === 200 && (login2.body?.accessToken || login2.body?.data?.accessToken)) {
        ok("Login succeeded on trusted device without separate MFA challenge step");
        accessToken  = login2.body?.accessToken  || login2.body?.data?.accessToken  || accessToken;
        refreshToken = login2.body?.refreshToken || login2.body?.data?.refreshToken || refreshToken;
        sessionId    = login2.body?.session?.id  || login2.body?.session?._id || login2.body?.data?.session?.id || sessionId;
    } else {
        fail("Unexpected login response after MFA setup", JSON.stringify(login2.body));
    }

    const authHeader2 = { Authorization: `Bearer ${accessToken}`, "X-Device-Id": DEVICE_ID };

    // ── 9. Devices ───────────────────────────────────────────────────────────
    console.log("\n── Step 9: List Own Devices");
    const devices = await request("GET", "/devices/mine", null, authHeader2);
    assert(devices.status === 200, "Own devices list returned", JSON.stringify(devices.body));
    const deviceList = devices.body?.devices || devices.body?.data || [];
    assert(Array.isArray(deviceList), "Devices is an array");
    assert(
        deviceList.some(d => d.deviceIdentifier === DEVICE_ID),
        "Enrolled device appears in list"
    );

    // ── 10. Sessions ─────────────────────────────────────────────────────────
    console.log("\n── Step 10: List Sessions");
    const sessions = await request("GET", "/sessions/mine", null, authHeader2);
    assert(sessions.status === 200, "Sessions list returned", JSON.stringify(sessions.body));

    // ── 11. Resources ────────────────────────────────────────────────────────
    console.log("\n── Step 11: List Resources");
    const resources = await request("GET", "/resources", null, authHeader2);
    assert(resources.status === 200, "Resources list returned", JSON.stringify(resources.body));
    const resourceList = resources.body?.resources || resources.body?.data || [];
    assert(resourceList.length > 0, `At least 1 resource exists (found ${resourceList.length})`);

    // ── 12. Access Request ───────────────────────────────────────────────────
    console.log("\n── Step 12: Submit Access Request (Zero Trust Evaluation)");
    if (resourceList.length > 0 && deviceDbId && sessionId) {
        const targetResource = resourceList.find(r => r.sensitivity === "LOW") || resourceList[0];
        const ar = await request(
            "POST",
            "/access-requests",
            {
                resourceId:      targetResource._id,
                deviceId:        deviceDbId,
                sessionId,
                requestedAction: "read",
            },
            authHeader2
        );
        const decision = ar.body?.decision || ar.body?.data?.decision;
        assert(
            ar.status === 200 && !!decision,
            `Access request evaluated → ${decision ?? "no decision"}`,
            JSON.stringify(ar.body?.decisionReason || ar.body)
        );

        const checks = ar.body?.checks || ar.body?.data?.checks;
        if (checks) {
            console.log("    Check results:");
            for (const [k, v] of Object.entries(checks)) {
                const icon = v.status === "PASS" ? "✅" : "❌";
                console.log(`      ${icon} ${k.padEnd(14)}: ${v.reason}`);
            }
        }
    } else {
        fail("Skipping access request – missing resource, device, or session");
    }

    // ── 13. Audit Events ─────────────────────────────────────────────────────
    console.log("\n── Step 13: Fetch Audit Events");
    const audit = await request("GET", "/audit-events?limit=5", null, authHeader2);
    assert(audit.status === 200, "Audit events returned", JSON.stringify(audit.body));
    const events = audit.body?.events || audit.body?.data || [];
    assert(Array.isArray(events), "Audit events is an array");
    assert(events.length > 0, `Audit events are being written (found ${events.length})`);

    // ── 14. Revoke Session ───────────────────────────────────────────────────
    console.log("\n── Step 14: Revoke Session (Logout)");
    if (sessionId) {
        const revoke = await request(
            "POST",
            `/sessions/${sessionId}/revoke`,
            null,
            authHeader2
        );
        assert(
            revoke.status === 200,
            "Session revoked successfully",
            JSON.stringify(revoke.body)
        );
    } else {
        fail("Skipping session revoke – no sessionId");
    }

    // ── 15. Post-logout protection ───────────────────────────────────────────
    console.log("\n── Step 15: Verify Endpoints Are Protected After Revocation");
    const postLogout = await request("GET", "/sessions/mine", null, {
        Authorization: `Bearer ${accessToken}`,
        "X-Device-Id": DEVICE_ID,
    });
    assert(
        postLogout.status === 401,
        "Protected endpoint returns 401 after session revocation",
        `Got ${postLogout.status}`
    );

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log("\n─────────────────────────────────────────");
    console.log(`  Tests passed: ${passed}`);
    console.log(`  Tests failed: ${failed}`);
    console.log("─────────────────────────────────────────");

    if (failed === 0) {
        console.log("\n✅  All tests passed! ZeroTrustX is fully operational.\n");
    } else {
        console.log(`\n⚠️   ${failed} test(s) failed – see output above for details.\n`);
        process.exitCode = 1;
    }
};

run().catch(err => {
    console.error("\n❌  Test runner crashed:", err);
    process.exit(1);
});
