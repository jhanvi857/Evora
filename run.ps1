param(
    [string]$Scenario = "happy"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

New-Item -ItemType Directory -Path "target/tmp-classes" -Force | Out-Null

javac -cp "src/main/java" -d "target/tmp-classes" "src/main/java/com/evora/EvoraApplication.java"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

java -cp "target/tmp-classes" com.evora.EvoraApplication $Scenario
exit $LASTEXITCODE
