#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

docker compose down
kill -9 $(pgrep ngrok) 2>/dev/null
