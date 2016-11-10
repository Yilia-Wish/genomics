#!/bin/bash
#
# Compiles all files to the release directory for final copying to a remote server

# Reference: http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# Get the directory of this script
DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

RELEASE_DIR=release
rm -rf $RELEASE_DIR
mkdir -p $RELEASE_DIR/{css,img,js}

# --------------------------------------------------------------------------------------------------------------------
echo "Compiling the CSS"
# Preserve the existing icon png file by moving it to the current directory (compass compile
# removes any existing img file).
mv img/icons-*.png .
compass compile -c config-compass-release.rb --force
# Restore it to its original location
mv icons-*.png img

echo "Compiling the JavaScript"
js/compile_js.sh
gzip -9 -c js/main-compiled.js > js/main-compiled.js.gz

echo "Copying the htdocs files"
cp js/main-compiled.js $RELEASE_DIR/js/main.js
cp js/main-compiled.js.gz $RELEASE_DIR/js/main.js.gz
cp img/logo24.png $RELEASE_DIR/img
cp img/cursor* $RELEASE_DIR/img
cp -r samples $RELEASE_DIR
cp index.html reflect.php $RELEASE_DIR
