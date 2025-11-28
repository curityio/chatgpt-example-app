#!/bin/bash

cd "$(dirname "${BASH_SOURCE[0]}")"

#
# Build the Todo API to a Docker container
#
echo '>>> Building Todo API ...'
cd todo-api
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

docker build --no-cache -t todo-api:1.0 .
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
cp index.html ../mcp-server/dist/web/index.html

cd ../mcp-server

docker build --no-cache -t mcp-server:1.0 .
if [ $? -ne 0 ]; then
  echo ">>> Problem building the MCP server Docker image"
  exit 1
fi
cd ..

#
# Potentially download and build the token authentication plugin
#

cd idsvr

if [ ! -d "plugins/access-token-authenticator" ]; then
  echo '>>> Downloading the access token authenticator plugin'
  mkdir -p plugins/access-token-authenticator
  git clone git@github.com:curityio/access-token-authenticator.git plugins/access-token-authenticator
fi

echo ">>> Building the plugin"
cd plugins/access-token-authenticator

mvn package

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
