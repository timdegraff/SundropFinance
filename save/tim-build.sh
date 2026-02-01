#!/bin/bash

# 1. Safety: Save code first
# "|| exit 1" means: "If saving fails, STOP immediately."
./save/tim-save.sh || exit 1

# 2. Find Latest Tag Info
LATEST=$(git tag --sort=-creatordate | head -n 1)
CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$LATEST" ]; then
    BUILD_MSG="no previous tags"
else
    # Extract everything after the last hyphen (e.g. v1-b9 -> b9)
    LAST_BUILD="${LATEST##*-}"
    BUILD_MSG="latest one was $LAST_BUILD"
    
    echo "--------------------------------------"
    echo "✅ Last Full Release: $LATEST"
    echo "🌿 Current Branch:    $CURRENT_BRANCH"
    echo "--------------------------------------"
fi

# 3. Ask for Version Details
echo "Enter Version (e.g. v1):"
read VERSION

# 4. Ask for Build (With the reminder!)
echo "Enter Build ($BUILD_MSG):"
read BUILD

# 5. Create the Tag
TAGNAME="${VERSION}-${BUILD}"
NOW=$(date +"%Y-%m-%d %H:%M")

echo "🏷️  Tagging release: $TAGNAME on branch $CURRENT_BRANCH"
git tag -a "$TAGNAME" -m "Production Build $TAGNAME on $NOW"
git push origin "$TAGNAME"

echo "🚀 DONE. Release $TAGNAME is locked in history!"