import { mapStringToId } from '../idMaps';
import { DESCRIBE_ID_SEPARATOR, PROJECT_ID_SEPARATOR, TEST_ID_SEPARATOR } from "../../constants";

const PS = PROJECT_ID_SEPARATOR;
const DS = DESCRIBE_ID_SEPARATOR;
const TS = TEST_ID_SEPARATOR;

describe('mapStringToId', () => {
  it('parses project, file, describe, and test when all are present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe${DS}${TS}someTest${TS}`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe'],
      testId: 'someTest'
    });
  });

  it('parses multiple levels of describes', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe1${DS}${DS}someDescribe2${DS}${DS}someDescribe3${DS}${TS}someTest${TS}`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe1', 'someDescribe2', 'someDescribe3'],
      testId: 'someTest'
    });
  });

  it('parses describe when no test is present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe${DS}`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe'],
      testId: undefined
    });
  });

  it('parses test when no describe is present', () => {
    const testString = `someProject${PS}someFile${TS}someTest${TS}`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: undefined,
      testId: 'someTest'
    });
  });

  it('parses multiple levels of describes when no test is present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe1${DS}${DS}someDescribe2${DS}${DS}someDescribe3${DS}`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe1', 'someDescribe2', 'someDescribe3'],
      testId: undefined
    });
  });

  it('parses project and file when no describe or test are present', () => {
    const testString = `someProject${PS}someFile`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: undefined,
      testId: undefined
    });
  });

  it('parses project when no separators are present', () => {
    const testString = `someProject`;

    const testId = mapStringToId(testString);

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: undefined,
      describeIds: undefined,
      testId: undefined
    });
  });
});