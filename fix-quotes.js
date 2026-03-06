const fs = require('fs');
const path = require('path');

// Check if src/App.js exists
const appPath = path.join(__dirname, 'src', 'App.js');

if (!fs.existsSync(appPath)) {
    console.error('‚ùå src/App.js not found!');
    console.log('Please make sure:');
    console.log('1. You are in the correct directory');
    console.log('2. You have created src/App.js with your code');
    process.exit(1);
}

console.log('Ì≥ù Reading src/App.js...');
let content = fs.readFileSync(appPath, 'utf8');

// Count curly quotes before fixing
const openCurlyCount = (content.match(/[‚Äú]/g) || []).length;
const closeCurlyCount = (content.match(/[‚Äù]/g) || []).length;
console.log(`Found ${openCurlyCount + closeCurlyCount} curly quotes to fix`);

// Replace curly quotes with straight quotes
content = content.replace(/[‚Äú‚Äù]/g, '"');

// Write the fixed content back
fs.writeFileSync(appPath, content);
console.log('‚úÖ Fixed quotes in src/App.js');
console.log('Ìæâ Your App.js is now ready for deployment!');
