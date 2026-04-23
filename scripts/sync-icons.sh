#!/usr/bin/env bash
set -euo pipefail

BUCKET="soulmask-icons"
ICONS_DIR="${1:-Game/Icons}"
ENDPOINT="https://fly.storage.tigris.dev"
PROFILE="${AWS_PROFILE:-tigris}"

echo "Syncing $ICONS_DIR -> s3://$BUCKET/"
aws s3 sync "$ICONS_DIR" "s3://$BUCKET/" \
  --endpoint-url "$ENDPOINT" \
  --profile "$PROFILE" \
  --content-type "image/webp" \
  --cache-control "public, max-age=31536000, immutable" \
  --size-only

echo "Done. Icons available at https://$BUCKET.fly.storage.tigris.dev/"
