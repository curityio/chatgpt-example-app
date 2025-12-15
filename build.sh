#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

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

mkdir ../mcp-server/dist/web 2>/dev/null
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
