#!/bin/bash

#############################################
# Run the TypeScript SDK example OAuth client
#############################################

#
# Ensure that we are in the folder containing this script
#
cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Set this to a value like https://f3c17d625e3e.ngrok-free.app/mcp
#
if [ "$MCP_SERVER_URL" == '' ]; then
  echo 'Please set an MCP_SERVER_URL environment variable before running the TypeScript SDK client'
  exit 1
fi

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
#
#
id $EXTERNAL_BASE_URL

#
# Run the MCP inspector client
#
cd typescript-sdk
npx tsx src/examples/client/simpleOAuthClient.ts "$MCP_SERVER_URL"
