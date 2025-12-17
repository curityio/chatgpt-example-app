#!/bin/bash

#############################################
# Run the TypeScript SDK example OAuth client
#############################################

#
# Ensure that we are in the folder containing this script
#
cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Do some one time setup
#
if [ ! -d typescript-sdk ]; then
  
  #
  # Get the code
  #
  git clone https://github.com/modelcontextprotocol/typescript-sdk

  #
  # Install dependencies
  #
  cd typescript-sdk
  npm install
  
  #
  # Work around the example client not setting a scope during the DCR request
  #
  FROM="client_name: 'Simple OAuth MCP Client'"
  TO="client_name: 'Simple OAuth MCP Client', scope: 'portfolio'"
    if [ "$(uname -s)" == 'Darwin' ]; then
    sed -i '' "s/$FROM/$TO/" src/examples/client/simpleOAuthClient.ts
  else
    sed -i "s/$FROM/$TO/"    src/examples/client/simpleOAuthClient.ts
  fi
  cd ..
fi

#
# Run the MCP inspector client
#
export EXTERNAL_BASE_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
cd typescript-sdk
npx tsx src/examples/client/simpleOAuthClient.ts "$EXTERNAL_BASE_URL/mcp"
