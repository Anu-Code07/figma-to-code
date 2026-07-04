#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: pnpm publish:packages <version>"
  echo "Example: NPM_TOKEN=xxx pnpm publish:packages 0.1.0"
  exit 1
fi

if [[ -z "${NPM_TOKEN:-}" && -z "${NODE_AUTH_TOKEN:-}" ]]; then
  echo "NPM_TOKEN or NODE_AUTH_TOKEN is not set."
  exit 1
fi

export NODE_AUTH_TOKEN="${NODE_AUTH_TOKEN:-$NPM_TOKEN}"
npm config set "//registry.npmjs.org/:_authToken" "$NODE_AUTH_TOKEN"

cd "$(dirname "$0")/.."

echo "Checking npm auth..."
npm whoami

echo "Verifying version ${VERSION}..."
node scripts/verify-publish-version.mjs "$VERSION"

echo "Syncing package versions to ${VERSION}..."
node scripts/sync-package-versions.mjs "$VERSION"

echo "Building packages..."
pnpm build

echo "Publishing @design2code/* packages..."
pnpm publish -r --access public --no-git-checks

echo "Done. Verify: npm view @design2code/cli@${VERSION} version"
