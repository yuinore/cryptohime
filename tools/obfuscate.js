const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

if (process.argv.length <= 2) {
  console.error('Usage: node tools/obfuscate.js xxxx.js');
  process.exit(-1);
}

const filename = process.argv[2];
const text = fs.readFileSync(filename, 'utf8').toString();

var obfuscationResult = JavaScriptObfuscator.obfuscate(
  text,
  {
    compact: false,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    numbersToExpressions: true,
    simplify: true,
    shuffleStringArray: true,
    splitStrings: true,
    stringArrayThreshold: 1
  }
);

console.log(obfuscationResult.getObfuscatedCode());
