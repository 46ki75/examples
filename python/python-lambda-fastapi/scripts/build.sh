#!/bin/bash

set -o pipefail -ue

rm -rf ./dist
mkdir -p ./dist

uv export --frozen --no-dev --no-emit-project -o ./dist/requirements.txt

uv pip install \
   --no-installer-metadata \
   --no-compile-bytecode \
   --python-platform x86_64-manylinux2014 \
   --python 3.13 \
   --prefix ./dist/packages \
   -r ./dist/requirements.txt

mkdir -p ./dist/lambda

cp -r src/python_lambda_fastapi ./dist/lambda/

cp -r ./dist/packages/lib/python3.13/site-packages/* ./dist/lambda/

cd ./dist/lambda

zip -r ../lambda.zip .
