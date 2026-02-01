#!/bin/bash

# 1. Add all changes
git add .

# 2. Commit with a timestamp
NOW=$(date +"%Y-%m-%d %H:%M")
git commit -m "Auto-save on $NOW"

# 3. Detect Current Branch (Dynamic!)
CURRENT_BRANCH=$(git branch --show-current)

# 4. Push to the CURRENT branch
echo "Pushing to branch: $CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"

echo "✅ BOOM. Code saved to GitHub branch: $CURRENT_BRANCH!"