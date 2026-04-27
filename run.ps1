param(
    [string]$Scenario = "happy"
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

Write-Host "--- Compiling Evora ---" -ForegroundColor Cyan
& $mvnPath compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "--- Running Evora Scenario: $Scenario ---" -ForegroundColor Green
& $mvnPath exec:java "-Dexec.mainClass=com.evora.EvoraApplication" "-Dexec.args=$Scenario"
exit $LASTEXITCODE
