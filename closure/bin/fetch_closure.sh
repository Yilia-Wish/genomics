#!/bin/bash

# Reference: http://stackoverflow.com/questions/59895/can-a-bash-script-tell-what-directory-its-stored-in
# Get the directory of this script
DIR="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR/..

# Closure library
if [ ! -d library ]
  then
    git clone https://github.com/google/closure-library library
else
  cd library
  git pull
fi

# Closure compiler
# if [ ! -d compiler ]
#   then
#     mkdir compiler
#     cd compiler
#     wget http://closure-compiler.googlecode.com/files/compiler-latest.zip
#     unzip compiler-latest.zip
#     rm compiler-latest.zip
#     cd ..
# fi

# Closure templates
# if [ ! -d templates ]
#   then
#     mkdir templates
#     cd templates
#     wget http://closure-templates.googlecode.com/files/closure-templates-for-javascript-latest.zip
#     unzip closure-templates-for-javascript-latest.zip
#     rm closure-templates-for-javascript-latest.zip
#     cd ..
# fi

# Closure stylesheets
# if [ ! -d stylesheets ]
#   then
#     mkdir stylesheets
#     cd stylesheets
#     wget http://closure-stylesheets.googlecode.com/files/closure-stylesheets-20111230.jar
#     ln -s closure-stylesheets-20111230.jar closure-stylesheets.jar
#     cd ..
# fi
