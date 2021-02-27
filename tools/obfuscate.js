const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

IN_PLACE = true;

if (process.argv.length <= 2) {
  console.error('Usage: node tools/obfuscate.js xxxx.js');
  process.exit(-1);
}

const filename = process.argv[2];
const text = fs.readFileSync(filename, 'utf8').toString();

var obfuscationResult = JavaScriptObfuscator.obfuscate(
  text,
  {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false, // :-)
    debugProtectionInterval: false, // :-)
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    numbersToExpressions: true,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: true,
    shuffleStringArray: true,
    simplify: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayIndexShift: true,
    stringArrayWrappersCount: 2,
    stringArrayWrappersChainedCalls: true,
    stringArrayWrappersParametersMaxCount: 4,
    stringArrayWrappersType: 'function',
    stringArrayThreshold: 1,
    transformObjectKeys: true,
    unicodeEscapeSequence: false
  }
);

obfuscated = obfuscationResult.getObfuscatedCode();

if (IN_PLACE) {
  fs.writeFileSync(filename, obfuscated, 'utf8');
} else {
  console.log(obfuscated);
}
