#!/bin/bash

echo "í´§ Setting up docs folder for GitHub Pages..."

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
pkg.scripts.build = 'react-scripts build && rm -rf docs && mv build docs';
pkg.scripts['deploy-docs'] = 'npm run build && git add -f docs && git commit -m \"Update docs\" && git push';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('âœ… Updated package.json');
"

# Create .nojekyll in public folder
mkdir -p public
echo "" > public/.nojekyll
echo "âœ… Created public/.nojekyll"

# Build the app
echo "í¿—ï¸ Building app..."
npm run build

# Check docs folder
if [ -d "docs" ]; then
    echo "âœ… docs folder created with:"
    ls -la docs/
else
    echo "âŒ docs folder not created!"
    exit 1
fi

# Force add docs folder
git add -f docs/
git commit -m "Add docs folder for GitHub Pages"
git push origin main

echo ""
echo "âœ… Setup complete!"
echo "í³± Now configure GitHub Pages:"
echo "   1. Go to: https://github.com/Willie-Conway/dw-master-app/settings/pages"
echo "   2. Set Branch: 'main' â†’ '/docs'"
echo "   3. Click Save"
echo ""
echo "í¼ Your site will be at: https://willie-conway.github.io/dw-master-app"
