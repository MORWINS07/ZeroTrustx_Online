# ============================================================
# ZeroTrustX – Local API Testing Helper
# Usage: . .\scripts\auth-test.ps1
#
# DO NOT commit real tokens. This file contains NO secrets.
# Tokens are populated at runtime in your shell session only.
# ============================================================

# --------------- Step 1: Login (no MFA) ---------------------
# Uncomment and fill in your credentials, then run once.
#
# $loginBody = @{
#     email    = "your@email.com"
#     password = "YourPassword"
# } | ConvertTo-Json
#
# $login = Invoke-RestMethod `
#     -Uri    "http://localhost:5000/api/v1/auth/login" `
#     -Method POST `
#     -ContentType "application/json" `
#     -Body   $loginBody
#
# $login   # inspect the response

# --------------- Step 2: Complete MFA -----------------------
# After Step 1 you receive a session token. Use it here.
#
# $mfaBody = @{
#     sessionToken = $login.sessionToken   # adjust field name if needed
#     totpCode     = "123456"              # code from your authenticator app
# } | ConvertTo-Json
#
# $mfa = Invoke-RestMethod `
#     -Uri    "http://localhost:5000/api/v1/auth/mfa/verify" `
#     -Method POST `
#     -ContentType "application/json" `
#     -Body   $mfaBody
#
# $mfa   # inspect the response

# --------------- Step 3: Save tokens into variables ---------
# Run these lines after $mfa is populated:
#
# $token        = $mfa.accessToken
# $refreshToken = $mfa.refreshToken
# $sessionId    = $mfa.session.id

# --------------- Step 4: Build headers ----------------------
# Run this any time you need fresh headers:
#
# $headers = @{ Authorization = "Bearer $token" }

# --------------- Step 5: Test a protected endpoint ----------
# Example:
#
# Invoke-RestMethod `
#     -Uri     "http://localhost:5000/api/v1/audit-events" `
#     -Method  GET `
#     -Headers $headers

# ============================================================
# Helper functions (available after dot-sourcing this file)
#   Set-AuthHeaders   – rebuild $headers from current $token
#   Show-AuthState    – print current token / session state
# ============================================================

function Set-AuthHeaders {
    if (-not $token) {
        Write-Warning "No `$token set. Complete MFA login first, then: `$token = `$mfa.accessToken"
        return
    }
    $global:headers = @{ Authorization = "Bearer $token" }
    $tail = if ($token.Length -gt 12) { $token.Substring($token.Length - 12) } else { $token }
    Write-Host "OK  `$headers refreshed  (...$tail)" -ForegroundColor Green
}

function Show-AuthState {
    $fmt = {
        param($val, $label)
        if ($val) { "OK  set (length: $($val.Length))" } else { "!! not set" }
    }
    Write-Host ""
    Write-Host "--- ZeroTrustX Auth State ---" -ForegroundColor Cyan
    Write-Host "  `$token        : $(if ($token)        { "OK  length=$($token.Length)" }        else { "!! not set" })"
    Write-Host "  `$refreshToken : $(if ($refreshToken) { "OK  length=$($refreshToken.Length)" } else { "!! not set" })"
    Write-Host "  `$sessionId    : $(if ($sessionId)    { "OK  $sessionId" }                    else { "!! not set" })"
    Write-Host "  `$headers      : $(if ($headers)      { "OK  set" }                           else { "!! not set" })"
    Write-Host "-----------------------------" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "auth-test.ps1 loaded. Helper functions:" -ForegroundColor Green
Write-Host "  Set-AuthHeaders   rebuild `$headers from current `$token"
Write-Host "  Show-AuthState    print current token / session state"
Write-Host ""
Write-Host "Quick start after MFA login:"
Write-Host '  $token   = $mfa.accessToken'
Write-Host '  $headers = @{ Authorization = "Bearer $token" }'
Write-Host ""
