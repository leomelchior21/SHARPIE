#!/usr/bin/env bash
set -uo pipefail

cp /runner/SharpieSnippet.csproj /workspace/SharpieSnippet.csproj
cat > /workspace/Program.cs

build_output="$(dotnet build /workspace/SharpieSnippet.csproj --configuration Release --nologo --verbosity quiet 2>&1)"
if [[ $? -ne 0 ]]; then
  printf '%s\n' "$build_output" >&2
  exit 20
fi

set -o pipefail
timeout --signal=KILL 2s dotnet /workspace/bin/Release/net8.0/SharpieSnippet.dll 2>&1
status=$?

if [[ $status -eq 137 ]]; then
  exit 124
fi

exit "$status"
