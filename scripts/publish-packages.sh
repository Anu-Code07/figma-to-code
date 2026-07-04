#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${NPM_TOKEN:-}" && -z "${NODE_AUTH_TOKEN:-}" ]]; then
  echo "NPM_TOKEN or NODE_AUTH_TOKEN is not set. Add NPM_TOKEN to Cursor secrets or GitHub Actions secrets."
  exit 1
fi

export NODE_AUTH_TOKEN="${NODE_AUTH_TOKEN:-$NPM_TOKEN}"
npm config set "//registry.npmjs.org/:_authToken" "$NODE_AUTH_TOKEN"

cd "$(dirname "$0")/.."

echo "Checking npm auth..."
npm whoami

echo "Building packages..."
pnpm build

echo "Publishing @design2code/* packages..."
pnpm publish -r --access public --no-git-checks

echo "Done. Verify: npm view @design2code/cli version"
