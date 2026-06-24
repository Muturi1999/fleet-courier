#!/usr/bin/env bash
# Fast path for UI-only changes (skips backend build + upload).
exec "$(dirname "$0")/deploy.sh" --frontend --fast "$@"
