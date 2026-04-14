#!/bin/bash

# Evora OMS Launch Script (POSIX)
# Default scenario to 'mixed' if not provided
SCENARIO=${1:-mixed}

echo "--- Building Evora OMS with NioFlow ---"
mvn clean compile

if [ $? -ne 0 ]; then
    echo "Error: Build failed."
    exit 1
fi

echo "--- Launching Evora Dashboard ---"
echo "Access it at: http://localhost:8080"

# Execute using Maven to correctly handle the classpath (NioFlow, Jackson, etc.)
mvn exec:java -Dexec.mainClass="com.evora.EvoraApplication" -Dexec.args="$SCENARIO"
