import _ from 'lodash';
import { DESCRIBE_ID_SEPARATOR, TEST_ID_SEPARATOR } from '../constants';
import { ITestFilter } from "../types";
import { replacePrintfPatterns } from "./escapeRegExp";
import { mapStringToId, mapIdToEscapedRegExpId, mapIdToString, Id } from "./idMaps";

function isDefined<T>(object: T | undefined): object is T {
  return object !== undefined;
};

function exactMatchRegex(regexString: string): string {
  return `^${regexString}$`;
}

function startingMatchRegex(regexString: string): string {
  return `^${regexString}`;
}

function mapTestIdToTestNamePattern(test: Id): string {
  // Jest test names are a concatenation of the describeIds and testId, separated by space
  const describeIds = (test.describeIds || []);
  const testId = test.testId === undefined
    // If there's NO testId, add empty space to at least require SOMETHING after the last describe (helps prevent partial matches on describes)
    ? ''
    // If there IS a testId, require exact match
    : test.testId + '$';
  const regex = [...describeIds, testId]
    .filter(isDefined)
    .map(replacePrintfPatterns)
    .join(' ');
    return startingMatchRegex(regex);
}

export function mapTestIdToDescribeIdPattern(test: string): string {
  return [test]
    .map(mapStringToId)
    .map(mapIdToEscapedRegExpId)
    .map(testId => ({
      projectId: testId.projectId,
      fileName: testId.fileName,
      describeIds: testId.describeIds?.map(replacePrintfPatterns),
      testId: testId.testId === undefined ? undefined : replacePrintfPatterns(testId.testId)
    }))
    .map(mapIdToString)
    .map(regexString => {
      const parts = regexString.split(`${DESCRIBE_ID_SEPARATOR}${DESCRIBE_ID_SEPARATOR}`);
      return parts.join(`${DESCRIBE_ID_SEPARATOR}(${DESCRIBE_ID_SEPARATOR}`) +
        (')?'.repeat(parts.length - 1));
    })
    .map(regexString => {
      const parts = regexString.split(`${DESCRIBE_ID_SEPARATOR}${TEST_ID_SEPARATOR}`);
      return parts.join(`${DESCRIBE_ID_SEPARATOR}(${TEST_ID_SEPARATOR}`) +
        (')?'.repeat(parts.length - 1))
    })
    .map(exactMatchRegex)
    [0];
}

export function mapTestIdToTestIdPattern(test: string): string {
  return [test]
    .map(mapStringToId)
    .map(mapIdToEscapedRegExpId)
    .map(testId => ({
      projectId: testId.projectId,
      fileName: testId.fileName,
      describeIds: testId.describeIds?.map(replacePrintfPatterns),
      testId: testId.testId === undefined ? undefined : replacePrintfPatterns(testId.testId)
    }))
    .map(testId => {
      const regex = mapIdToString(testId);
      return (testId.testId
        ? exactMatchRegex(regex)
        : startingMatchRegex(regex));
    })
    [0];
}

export function mapTestIdsToTestFilter(tests: string[]): ITestFilter | null {
  if (tests.length === 0 || tests.some(t => t === "root")) {
    return null;
  }

  const ids = tests.map(mapStringToId).map(mapIdToEscapedRegExpId);

  // if there are any ids that do not contain a fileName, then we should run all the tests in the project.
  if (_.some(ids, x => !x.fileName)) {
    return null;
  }

  // we accumulate the file and test names into regex expressions.  Note we escape the names to avoid interpreting
  // any regex control characters in the file or test names.
  const testNamePattern = ids.map(id => mapTestIdToTestNamePattern(id))
    .filter(testId => testId)
    .join("|");
  const testFileNamePattern = ids.filter(x => x.fileName).map(z => z.fileName || "").join("|");

  return {
    testFileNamePattern,
    testNamePattern,
  };
}
