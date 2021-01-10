import { replacePrintfPatterns } from '../escapeRegExp';

const POSITIVE_WHOLE_NUMBERS = [
  '1',
  '123908124'
];
const NEGATIVE_WHOLE_NUMBERS = [
  '-1',
  '-123908124'
];
const SPECIAL_NUMBERS = [
  'NaN',
  'Infinity',
  '-Infinity'
];
const DECIMALS = [
  '0.123',
  '1123.1',
  '-0.0',
  '-1.1241',
  '-123.1412'
];
const ZERO = '0';
const NEGATIVE_ZERO = '-0';
const NOTHING = '';
const JSON_OBJECTS = [
  {"key":"value"},
  {"key":{"subKey":"value"}},
  {"key":[0,1]},
  {"key":[{"subKey":"value"}]}
].map(obj => JSON.stringify(obj));
const JSON_ARRAYS = [
  [1,2,3],
  ["a","b","c"],
  [{"key":"value"}],
  [{"key":{"subKey":"value"}}],
  [{"key":[0,1]}]
].map(ary => JSON.stringify(ary));
const JSON_STRINGS = [
  'someString',
  'some"escaped'
].map(str => JSON.stringify(str));
const OBVIOUS_INVALID_JSON_STRINGS = [
  'stringWithoutQuotes',
  'string without quotes',
  '"unclosed string',
  "'string in single-quotes'"
];
const NON_NUMERICS = [
  ...JSON_OBJECTS,
  ...JSON_ARRAYS,
  ...JSON_STRINGS,
  ...OBVIOUS_INVALID_JSON_STRINGS
];
const PRINTF_PATTERNS = [
  '%#',
  '%i',
  '%d',
  '%f',
  '%j',
  '%p',
  '%s',
  '%o',
  '%%',
  '%c'
];

describe('replacePrintfPatterns', () => {
  describe('replaces %#', () => {
    const placeholder = '%#';
    const pattern = replacePrintfPatterns(placeholder);
    const regex = new RegExp(`^${pattern}$`);
    
    it('matches itself', () => {
      expect(regex.test(placeholder)).toBeTrue();
    });

    it.each(PRINTF_PATTERNS.filter(otherPlaceholder => otherPlaceholder !== placeholder))('does NOT match other printf patterns (%s)', (otherPlaceholder) => {
      expect(regex.test(otherPlaceholder)).toBeFalse();
    });

    it.each(POSITIVE_WHOLE_NUMBERS)('matches positive whole numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NEGATIVE_WHOLE_NUMBERS)('does NOT match negative numbers (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it('matches zero', () => {
      expect(regex.test(ZERO)).toBeTrue();
    });

    it('does NOT match negative zero', () => {
      expect(regex.test(NEGATIVE_ZERO)).toBeFalse();
    });

    it.each(SPECIAL_NUMBERS)('does NOT match special numbers (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it.each(DECIMALS)('does NOT match decimals (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it.each(NON_NUMERICS)('does NOT match non-numerics (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it('does NOT match nothing (%s)', () => {
      expect(regex.test(NOTHING)).toBeFalse();
    });
  });

  describe('replaces %i', () => {
    const placeholder = '%i';
    const pattern = replacePrintfPatterns(placeholder);
    const regex = new RegExp(`^${pattern}$`);
    
    it('matches itself', () => {
      expect(regex.test(placeholder)).toBeTrue();
    });

    it.each(PRINTF_PATTERNS.filter(otherPlaceholder => otherPlaceholder !== placeholder))('does NOT match other printf patterns (%s)', (otherPlaceholder) => {
      expect(regex.test(otherPlaceholder)).toBeFalse();
    });

    it.each(POSITIVE_WHOLE_NUMBERS)('matches positive whole numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NEGATIVE_WHOLE_NUMBERS)('matches negative numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it('matches zero', () => {
      expect(regex.test(ZERO)).toBeTrue();
    });

    it('does NOT match negative zero', () => {
      expect(regex.test(NEGATIVE_ZERO)).toBeFalse();
    });

    it.each(SPECIAL_NUMBERS)('matches special numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(DECIMALS)('does NOT match decimals (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it.each(NON_NUMERICS)('does NOT match non-numerics (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it('does NOT match nothing (%s)', () => {
      expect(regex.test(NOTHING)).toBeFalse();
    });
  });

  ['%d', '%f'].forEach(placeholder => describe(`replaces ${placeholder}`, () => {
    const pattern = replacePrintfPatterns(placeholder);
    const regex = new RegExp(`^${pattern}$`);
    
    it('matches itself', () => {
      expect(regex.test(placeholder)).toBeTrue();
    });

    it.each(PRINTF_PATTERNS.filter(otherPlaceholder => otherPlaceholder !== placeholder))('does NOT match other printf patterns (%s)', (otherPlaceholder) => {
      expect(regex.test(otherPlaceholder)).toBeFalse();
    });

    it.each(POSITIVE_WHOLE_NUMBERS)('matches positive whole numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NEGATIVE_WHOLE_NUMBERS)('matches negative numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it('matches zero', () => {
      expect(regex.test(ZERO)).toBeTrue();
    });

    it('matches negative zero', () => {
      expect(regex.test(NEGATIVE_ZERO)).toBeTrue();
    });

    it.each(SPECIAL_NUMBERS)('matches special numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(DECIMALS)('matches decimals (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NON_NUMERICS)('does NOT match non-numerics (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it('does NOT match nothing (%s)', () => {
      expect(regex.test(NOTHING)).toBeFalse();
    });
  }));

  ['%p', '%s', '%o'].forEach(placeholder => describe(`replaces ${placeholder}`, () => {
    const pattern = replacePrintfPatterns(placeholder);
    const regex = new RegExp(`^${pattern}$`);
    
    it('matches itself', () => {
      expect(regex.test(placeholder)).toBeTrue();
    });

    it.each(PRINTF_PATTERNS.filter(otherPlaceholder => otherPlaceholder !== placeholder))('matches other printf patterns (%s)', (otherPlaceholder) => {
      expect(regex.test(otherPlaceholder)).toBeTrue();
    });

    it.each(POSITIVE_WHOLE_NUMBERS)('matches positive whole numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NEGATIVE_WHOLE_NUMBERS)('matches negative numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it('matches zero', () => {
      expect(regex.test(ZERO)).toBeTrue();
    });

    it('matches negative zero', () => {
      expect(regex.test(NEGATIVE_ZERO)).toBeTrue();
    });

    it.each(SPECIAL_NUMBERS)('matches special numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(DECIMALS)('matches match decimals (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NON_NUMERICS)('matches non-numerics (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it('matches nothing (%s)', () => {
      expect(regex.test(NOTHING)).toBeTrue();
    });
  }));

  describe('replaces %j', () => {
    const placeholder = '%j';
    const pattern = replacePrintfPatterns(placeholder);
    const regex = new RegExp(`^${pattern}$`);
    
    it('matches itself', () => {
      expect(regex.test(placeholder)).toBeTrue();
    });

    it.each(PRINTF_PATTERNS.filter(otherPlaceholder => otherPlaceholder !== placeholder))('does NOT match other printf patterns (%s)', (otherPlaceholder) => {
      expect(regex.test(otherPlaceholder)).toBeFalse();
    });

    it.each(POSITIVE_WHOLE_NUMBERS)('matches positive whole numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(NEGATIVE_WHOLE_NUMBERS)('matches negative numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it('matches zero', () => {
      expect(regex.test(ZERO)).toBeTrue();
    });

    it('matches negative zero', () => {
      expect(regex.test(NEGATIVE_ZERO)).toBeTrue();
    });

    it.each(SPECIAL_NUMBERS)('matches special numbers (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(DECIMALS)('matches match decimals (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(JSON_OBJECTS)('matches objects (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(JSON_ARRAYS)('matches arrays (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(JSON_STRINGS)('matches strings (%s)', (value) => {
      expect(regex.test(value)).toBeTrue();
    });

    it.each(OBVIOUS_INVALID_JSON_STRINGS)('does NOT match very obvious invalid strings (%s)', (value) => {
      expect(regex.test(value)).toBeFalse();
    });

    it('does NOT match nothing (%s)', () => {
      expect(regex.test(NOTHING)).toBeFalse();
    });
  });
});