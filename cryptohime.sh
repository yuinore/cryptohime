#!/bin/bash

set -eux

mkdir -p www
mkdir -p www/img
ruby tools/generate_image.rb
node tools/obfuscate.js ./hime/hime.js > ./www/hime.js
cp ./hime/index.html www
cp ./hime/readme.txt www
cp -R ./hime/img www
