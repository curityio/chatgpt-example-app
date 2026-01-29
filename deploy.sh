#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Check prerequisites
#
if [ "$LICENSE_FILE_PATH" == '' ]; then
  echo '>>> Please provide a LICENSE_FILE_PATH environment variable with the path to a Curity Identity Server license file'
  exit 1
fi

export LICENSE_KEY=$(cat "$LICENSE_FILE_PATH" | jq -r .License)
if [ "$LICENSE_KEY" == '' ]; then
  echo '>>> An invalid license file was provided for the Curity Identity Server'
  exit 1
fi

base64url_decode() {
  local len=$((${#1} % 4))
  local result="$1"
  if [ $len -eq 2 ]; then result="$1"'=='
  elif [ $len -eq 3 ]; then result="$1"'='
  fi
  echo "$result" | tr '_-' '/+' | base64 --decode
}

LICENSE_PAYLOAD=$(base64url_decode $(echo $LICENSE_KEY | cut -d '.' -f 2))
FEATURE=$(echo $LICENSE_PAYLOAD | jq -r '.Features[]  | select(.feature == "haapi")')
if [ "$FEATURE" == '' ]; then
  echo 'The license.json file does not include the HAAPI feature'
  exit 1
fi

if [ -z "$NGROK_TOKEN" ]; then
  echo '>>> Please set it to your ngrok authentication token in the NGROK_TOKEN environment variable'
  exit 1
fi

#
# Handle exposing the project with ngrok and support an explicit NGROK_DOMAIN parameter
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
export EXTERNAL_BASE_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
export EXTERNAL_HOST_NAME=$(echo "$EXTERNAL_BASE_URL" | sed 's/^https:\/\///')
echo ">>> Use the external MCP Server URL to connect: $EXTERNAL_BASE_URL/mcp"

#
# Set the MCP server's default internal URL, which can be overridden for development
#
if [ "$MCP_SERVER_HOST" == '' ]; then
  export MCP_SERVER_HOST='mcp-server'
fi
if [ "$PORTFOLIO_API_HOST" == '' ]; then
  export PORTFOLIO_API_HOST='portfolio-api'
fi

#
# Since ngrok URLs are not predictable we must perform URL replacements for the deployment
#
envsubst < ./apigateway/kong-template.yml > ./apigateway/kong.yml
envsubst < ./idsvr/curity-base-config-template.xml | sed -e 's/§/$/g' > ./idsvr/curity-base-config.xml
envsubst < ./idsvr/curity-scenario-config-template.xml | sed -e 's/§/$/g' > ./idsvr/curity-scenario-config.xml
envsubst < ./idsvr/pre-processing-procedures/mcp-client-registration-policy-template.js > ./idsvr/pre-processing-procedures/mcp-client-registration-policy.js
envsubst < ./idsvr/token-procedures/mcp-token-exchange-template.js > ./idsvr/token-procedures/mcp-token-exchange.js

#
# Also update API URLs and account for local development
#
if [ "$PORTFOLIO_API_HOST" == 'host.docker.internal' ]; then
  export PORTFOLIO_API_HOST='localhost'
fi
envsubst < ./mcp-server/.env-template > ./mcp-server/.env
envsubst < ./portfolio-api/.env-template > ./portfolio-api/.env

#
# Deploy all components
#
docker compose down
docker compose up -d
if [ $? -ne 0 ]; then
  exit 1
fi
