#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# First check there is a valid license file for the Curity Identity Server
#
if [ "$LICENSE_FILE_PATH" == '' ]; then
  echo '*** Please provide a LICENSE_FILE_PATH environment variable with the path to a Curity Identity Server license file'
  exit 1
fi

export LICENSE_KEY=$(cat "$LICENSE_FILE_PATH" | jq -r .License)
if [ "$LICENSE_KEY" == '' ]; then
  echo '*** An invalid license file was provided for the Curity Identity Server'
  exit 1
fi

#
# The deployment requires ngrok
#
if [ -z "$NGROK_TOKEN" ]; then
  echo ">>> NGROK_TOKEN environment variable is not set. Please set it to your ngrok authentication token."
  exit 1
fi

#
# Handle exposing the project with ngrok and support an explicit NGROK domain parameter
#
NGROK_PID=$(pgrep ngrok)
if [ -z "$NGROK_PID" ]; then

  echo ">>> Start new instance of ngrok"

  if [ -z "$NGROK_DOMAIN" ]; then
    ngrok http 80 --authtoken $NGROK_TOKEN --config ngrok_no_ui.yml > /dev/null &
    sleep 2
  else
    ngrok http 80 --authtoken $NGROK_TOKEN --config ngrok_no_ui.yml --url $NGROK_DOMAIN > /dev/null &
    sleep 2
  fi
fi
NGROK_DOMAIN=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
export BASE_MCP_DOMAIN=$(echo "$NGROK_DOMAIN" | sed 's/^https:\/\///')
export BASE_IDSVR_DOMAIN=$(echo "$NGROK_DOMAIN" | sed 's/^https:\/\///')
echo ">>> Use the following MCP Server URL to connect: https://$BASE_MCP_DOMAIN/mcp"

# Replace values in relevant files
envsubst < ./apigateway/kong-template.yml > ./apigateway/kong.yml
envsubst < ./idsvr/curity-config-template.xml | sed -e 's/§/$/g' > ./idsvr/curity-config.xml
envsubst < ./idsvr/pre-processing-procedures/mcp-client-registration-policy-template.js > ./idsvr/pre-processing-procedures/mcp-client-registration-policy.js
envsubst < ./idsvr/token-procedures/set-access-token-audience-template.js > ./idsvr/token-procedures/set-access-token-audience.js
envsubst < ./idsvr/token-procedures/set-audience-during-refresh-template.js > ./idsvr/token-procedures/set-audience-during-refresh.js
envsubst < ./mcp-server/.env-template > ./mcp-server/.env

#
# Deploy all components
#
docker compose down
docker compose up -d
if [ $? -ne 0 ]; then
  exit 1
fi
