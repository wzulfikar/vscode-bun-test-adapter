

const RGX_INDEX =  /(0|[1-9]\d*)/.source;

const RGX_INT = /(0|(-?[1-9]\d*))/.source;
const REG_NUM_NAMES = 'NaN|-?Infinity';
const RGX_FRAC = /(\.\d+)/.source;
const RGX_EXP = /(e[+-]\d+)/.source;
const RGX_NUM = `-?${RGX_INT}${RGX_FRAC}?${RGX_EXP}?`;

const RGX_ANYTHING = '.*';

// RFC 4627: https://tools.ietf.org/html/rfc4627
// Loose JSON Regex, should match all valid JSON **produced by converting parameters to JSON**
// - We expect no whitespace outside of strings
// - We only validate that it is made up of legitimate JSON tokens, no brace-matching
// Some non-valid JSON is also matched, but we can accept that
const REGEX_JSON_LOOSE = '(' + [
  // structural characters
  /[\[\]{},:]/.source,
  // The allowed literal names (plus undefined)
  'true|false|null|undefined',
  // Numeric literals
  RGX_NUM,
  REG_NUM_NAMES,
  // Strings
  /"([^"]|\\")*"/.source,
  // Circular references
  /\[Circular\]/.source
].join('|') + ')+';

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replacePrintfPatterns(testId: string): string {
  return testId.replace(/%./g, (printfPattern: string) => {
    switch (printfPattern[1]) {
        case '#': // %# - Index of the test case.
          return `(${RGX_INDEX}|${printfPattern})`;
        case 'i': // %i - Integer.
          return `(${RGX_INT}|${REG_NUM_NAMES}|${printfPattern})`;
        case 'd': // %d - Number.
        case 'f': // %f - Floating point value.
          return `(${RGX_NUM}|${REG_NUM_NAMES}|${printfPattern})`;
        case 'j': // %j - JSON.
          return `(${REGEX_JSON_LOOSE}|${printfPattern})`;
        case 'p': // %p - pretty-format.
        case 's': // %s- String.
        case 'o': // %o - Object.
          return RGX_ANYTHING;
        case '%': // %% - single percent sign ('%'). This does not consume an argument.
        default:  // Leave everything else alone
          return printfPattern;
    }
  });
}
