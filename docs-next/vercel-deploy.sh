#!/bin/bash

echo "VERCEL_ENV: $VERCEL_ENV"
echo "VERCEL_GIT_COMMIT_REF: $VERCEL_GIT_COMMIT_REF" 

if [[ "$VERCEL_ENV" == "production" ]] ; then
  # Proceed with the build
  echo "✅ - Production build may proceed"
  exit 1;

else
  # Proceed with the build and exit with code 1 if change occured in docs-next repo (designated root repo in vercel)
  # exit with code 0 and cancel the build otherwise 
  git diff --quiet HEAD^ HEAD .
fi