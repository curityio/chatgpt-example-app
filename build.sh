#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# If USE_NGROK = 1 then the script will start ngrok tunnel for port 443 (kong gateway) and will use ngrok's URL as the base URL for the Curity Identity Server and MCP server.
# You can set the NGROK_DOMAIN variable to point to your domain set with ngrok, but this not necessary.
#
# IMPORTANT! Set NGROK_TOKEN env variable to contain your ngrok authentication token.
#
# If you don't want to use ngrok then set the variable to 0. The default URLs will then be set in relevant places in configurations.
#

USE_NGROK=1
#NGROK_DOMAIN="abcdef.ngrok-free.app"


DEFAULT_MCP_DOMAIN="=mcp.demo.example"
DEFAULT_IDSVR_DOMAIN="login.demo.example"

if [ "$USE_NGROK" == "1" ]; then
  if [ -z "$NGROK_TOKEN" ]; then
    echo ">>> NGROK_TOKEN environment variable is not set. Please set it to your ngrok authentication token."
    exit 1
  fi
fi

#
# Build the Portfolio API to a Docker container
#
echo '>>> Building Portfolio API ...'
cd portfolio-api
npm install
if [ $? -ne 0 ]; then
  echo ">>> Problem installing dependencies for the API"
  exit 1
fi

npm run build
if [ $? -ne 0 ]; then
  echo ">>> Problem building the API"
  exit 1
fi

docker build --no-cache -t portfolio-api:1.0 .
if [ $? -ne 0 ]; then
  echo ">>> Problem building the API Docker image"
  exit 1
fi

cd ..

#
# Build the MCP server to a docker container
#
echo 'Building MCP server ...'
cd mcp-server

npm install
if [ $? -ne 0 ]; then
  echo ">>> Problem installing dependencies for the MCP server"
  exit 1
fi

npm run build
if [ $? -ne 0 ]; then
  echo ">>> Problem building the MCP server"
  exit 1
fi

echo ">>> Build the widget resources"
cd ../web
npm i
npm run build

if [ $? -ne 0 ]; then
  echo ">>> Problem building the chatgpt app widget"
  exit 1
fi

mkdir ../mcp-server/dist/web
cp app.css ../mcp-server/dist/web/app.css
cp dist/bundle.js ../mcp-server/dist/web/bundle.js

cd ../mcp-server

docker build --no-cache -t mcp-server:1.0 .
if [ $? -ne 0 ]; then
  echo ">>> Problem building the MCP server Docker image"
  exit 1
fi
cd ..

#
# Build the access token authenticator plugin
#
cd idsvr
echo '>>> Downloading the access token authenticator plugin'
rm -rf plugins/access-token-authenticator
mkdir -p plugins/access-token-authenticator
git clone https://github.com/curityio/access-token-authenticator plugins/access-token-authenticator
if [ $? -ne 0 ]; then
  echo ">>> Problem cloning the access token plugin"
  exit 1
fi

echo ">>> Building the plugin"
cd plugins/access-token-authenticator
mvn package
if [ $? -ne 0 ]; then
  echo ">>> Problem building the access token plugin"
  exit 1
fi

# Copy the relevant jars into a directory for an easier mount
mkdir target/plugin
cp target/*.jar target/plugin
cd ../../..

#
# Build the API gateway custom image to a Docker container
#
echo 'Building API gateway with phantom token plugin ...'
cd apigateway
docker build --no-cache -t kong-api-gateway:1.0 .
if [ $? -ne 0 ]; then
  exit 1
fi
cd ..

#
# Handle exposing the project with ngrok
#
if [ "$USE_NGROK" == "1" ]; then
  echo ">>> Using ngrok"
  echo ">>> Stop current instances of ngrok"

  NGROK_PID=$(pgrep ngrok)
  if [ ! -z "$NGROK_PID" ]; then
    echo ">>> Stopping ngrok process with PID $NGROK_PID"
    kill -15 $NGROK_PID
    sleep 2
  else
    echo ">>> No running ngrok processes found"
  fi

  echo ">>> Start new instance of ngrok"

  if [ -z "$NGROK_DOMAIN" ]; then
    ngrok http 443 --authtoken $NGROK_TOKEN --config ngrok_no_ui.yml > /dev/null &
    # Allow ngrok to start, then check the domain
    sleep 2
    NGROK_DOMAIN=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.proto == "https") | .public_url')
  else
    ngrok http 443 --authtoken $NGROK_TOKEN --config ngrok_no_ui.yml --url $NGROK_DOMAIN > /dev/null &
    # Allow ngrok to start
    sleep 2
  fi

  export BASE_MCP_DOMAIN=$(echo "$NGROK_DOMAIN" | sed 's/^https:\/\///')
  export BASE_IDSVR_DOMAIN=$(echo "$NGROK_DOMAIN" | sed 's/^https:\/\///')

else
  echo ">>> Start environment without ngrok. Use default URLs"
  export BASE_MCP_DOMAIN=$DEFAULT_MCP_DOMAIN
  export BASE_IDSVR_DOMAIN=$DEFAULT_BASE_IDSVR_DOMAIN
fi

echo ">>> Use the following MCP Server URL to connect: https://$BASE_MCP_DOMAIN"

# Echo the base domain variables to a file so it can be sourced by the deployment script

cat > .env.build << EOL
export BASE_MCP_DOMAIN=$BASE_MCP_DOMAIN
export BASE_IDSVR_DOMAIN=$BASE_IDSVR_DOMAIN
EOL

# Replace values in relevant files

envsubst < ./apigateway/kong-template.yml > ./apigateway/kong.yml
envsubst < ./idsvr/curity-config-template.xml | sed -e 's/§/$/g' > ./idsvr/curity-config.xml
envsubst < ./idsvr/pre-processing-procedures/mcp-client-registration-policy-template.js > ./idsvr/pre-processing-procedures/mcp-client-registration-policy.js
envsubst < ./idsvr/token-procedures/set-access-token-audience-template.js > ./idsvr/token-procedures/set-access-token-audience.js
envsubst < ./mcp-server/.env-template > ./mcp-server/.env

