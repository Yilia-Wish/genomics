#!/bin/bash

# Reference: http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# Get the directory of this script
DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

CLOSURE_BASE=~/dev/www/lib/closure

python2 $CLOSURE_BASE/library/closure/bin/build/closurebuilder.py \
    --root $CLOSURE_BASE \
    --root .. \
    --root ../../polyfill \
    --namespace MsaViewApp \
    --output_mode compiled \
    --compiler_jar $CLOSURE_BASE/compiler/compiler.jar \
    --compiler_flag="--compilation_level=ADVANCED_OPTIMIZATIONS" \
    --compiler_flag="--summary_detail_level=3" \
    > MsaViewApp-compiled.js

    # --compiler_flag="--formatting=PRETTY_PRINT" \
    # --compiler_flag="--debug" \
    # --compiler_flags="--warning_level=VERBOSE" \
