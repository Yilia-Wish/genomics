#!/bin/sh

../../closure/library/closure/bin/build/depswriter.py \
	--root_with_prefix=". .." \
    --root_with_prefix="../../polyfill/src ../../../polyfill/src" \
	> deps.js
