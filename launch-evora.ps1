param(
    [string]$Scenario = "mixed"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# Try to find Maven
$mvnPath = "mvn"
if (!(Get-Command $mvnPath -ErrorAction SilentlyContinue)) {
    # Fallback to the discovered wrapper path
    $mvnPath = "C:\Users\family\.m2\wrapper\dists\apache-maven-3.9.6\0f95e7798d182e3371f3fee6d8202d3a56e6d71dfd3a2402139882ef2fbe7476\bin\mvn.cmd"
    if (!(Test-Path $mvnPath)) {
        Write-Host "Maven not found. Please ensure Maven is installed or in your path." -ForegroundColor Red
        exit 1
    }
}

Write-Host "--- Building Evora OMS with NioFlow ---" -ForegroundColor Cyan
& $mvnPath clean compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "--- Launching Evora Dashboard ---" -ForegroundColor Green
Write-Host "Access it at: http://localhost:8080" -ForegroundColor Yellow

# Use Maven to run to handle all transitive dependencies (Jackson, JJWT, etc.) correctly
# We use quotes around for each -D parameter to prevent PowerShell from misparsing them
& $mvnPath exec:java "-Dexec.mainClass=com.evora.EvoraApplication" "-Dexec.args=$Scenario"
exit $LASTEXITCODE
