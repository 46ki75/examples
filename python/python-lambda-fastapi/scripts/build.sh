#!/bin/bash

set -o pipefail -ue

if [ -d "./dist" ];
    rm -rf ./dist
then
    mkdir -p ./dist
fi

uv export --frozen --no-dev --no-editable -o ./dist/requirements.txt

uv pip install \
   --no-installer-metadata \
   --no-compile-bytecode \
   --python-platform x86_64-manylinux2014 \
   --python 3.13 \
   --prefix ./dist/packages \
   -r ./dist/requirements.txt

cp -r src ./dist/lambda

cp -r ./dist/packages/lib/python3.13/site-packages/* ./dist/lambda/

cd ./dist/lambda

zip -r ../lambda.zip . 
