#!/usr/bin/env bash
set -euo pipefail

SCENARIO="${1:-happy}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p target/tmp-classes

javac -cp src/main/java -d target/tmp-classes src/main/java/com/evora/EvoraApplication.java
java -cp target/tmp-classes com.evora.EvoraApplication "$SCENARIO"
