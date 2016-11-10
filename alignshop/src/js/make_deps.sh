#!/bin/bash

# Reference: http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# Get the directory of this script
DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

python ../../../lib/closure/library/closure/bin/build/depswriter.py \
    --root_with_prefix=". .." \
    --root_with_prefix="ag ../ag" \
    --root_with_prefix="bootstrap ../bootstrap" \
    --root_with_prefix="polyfill ../polyfill" \
	> deps.js
