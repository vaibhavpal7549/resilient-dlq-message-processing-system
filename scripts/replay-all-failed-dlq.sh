#!/bin/bash

set -euo pipefail

node scripts/dlq-cli.js replay-failed
