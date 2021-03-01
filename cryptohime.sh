#!/bin/bash

set -eux

mkdir -p www
mkdir -p www/img

bundle exec ruby tools/generate_image.rb
node tools/obfuscate.js ./www/hime.js
cp ./hime/readme.txt www
cp -R ./hime/img www
