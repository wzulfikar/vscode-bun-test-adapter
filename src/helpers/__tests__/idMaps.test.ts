import {
  DESCRIBE_ID_SEPARATOR,
  PROJECT_ID_SEPARATOR,
  TEST_ID_SEPARATOR,
} from '../../constants'
import { mapIdToEscapedRegExpId, mapIdToString, mapStringToId } from '../idMaps'

const PS = PROJECT_ID_SEPARATOR
const DS = DESCRIBE_ID_SEPARATOR
const TS = TEST_ID_SEPARATOR

describe('mapStringToId', () => {
  it('parses project, file, describe, and test when all are present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe${DS}${TS}someTest${TS}`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe'],
      testId: 'someTest',
    })
  })

  it('parses multiple levels of describes', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe1${DS}${DS}someDescribe2${DS}${DS}someDescribe3${DS}${TS}someTest${TS}`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe1', 'someDescribe2', 'someDescribe3'],
      testId: 'someTest',
    })
  })

  it('parses describe when no test is present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe${DS}`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe'],
      testId: undefined,
    })
  })

  it('parses test when no describe is present', () => {
    const testString = `someProject${PS}someFile${TS}someTest${TS}`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: undefined,
      testId: 'someTest',
    })
  })

  it('parses multiple levels of describes when no test is present', () => {
    const testString = `someProject${PS}someFile${DS}someDescribe1${DS}${DS}someDescribe2${DS}${DS}someDescribe3${DS}`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: ['someDescribe1', 'someDescribe2', 'someDescribe3'],
      testId: undefined,
    })
  })

  it('parses project and file when no describe or test are present', () => {
    const testString = `someProject${PS}someFile`

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: 'someFile',
      describeIds: undefined,
      testId: undefined,
    })
  })

  it('parses project when no separators are present', () => {
    const testString = 'someProject'

    const testId = mapStringToId(testString)

    expect(testId).toEqual({
      projectId: 'someProject',
      fileName: undefined,
      describeIds: undefined,
      testId: undefined,
    })
  })
})

describe('mapIdToString', () => {
  describe('round-trip tests', () => {
    it('results in the same id when mapping to string and back', () => {
      const originalId = {
        projectId: 'someProject',
        fileName: 'someFile',
        describeIds: ['outerDescribe', 'innerDescribe'],
        testId: 'aTest',
      }

      const roundTrip = mapStringToId(mapIdToString(originalId))

      expect(roundTrip).toEqual(originalId)
    })

    it('does not lose special characters', () => {
      const originalId = {
        projectId: 'some.Pr*jec?',
        fileName: 'some-file.js',
        describeIds: ['[brackets]and(parenthesis)', '^start|end$'],
        testId: '+{more}\\',
      }

      const roundTrip = mapStringToId(mapIdToString(originalId))

      expect(roundTrip).toEqual(originalId)
    })

    it('works when no test', () => {
      const originalId = {
        projectId: 'someProject',
        fileName: 'someFile',
        describeIds: ['outerDescribe', 'innerDescribe'],
      }

      const roundTrip = mapStringToId(mapIdToString(originalId))

      expect(roundTrip).toEqual(originalId)
    })

    it('works when no describes', () => {
      const originalId = {
        projectId: 'someProject',
        fileName: 'someFile',
      }

      const roundTrip = mapStringToId(mapIdToString(originalId))

      expect(roundTrip).toEqual(originalId)
    })

    it('works when no file', () => {
      const originalId = {
        projectId: 'someProject',
      }

      const roundTrip = mapStringToId(mapIdToString(originalId))

      expect(roundTrip).toEqual(originalId)
    })
  })
})

describe('mapIdToEscapedRegExpId', () => {
  it('escapes regex special characters', () => {
    const unescaped = {
      projectId: 'some.Pr*jec?',
      fileName: 'some-file.js',
      describeIds: ['[brackets]and(parenthesis)', '^start|end$'],
      testId: '+{more}\\',
    }

    const escaped = mapIdToEscapedRegExpId(unescaped)

    expect(escaped).toEqual({
      projectId: 'some\\.Pr\\*jec\\?',
      fileName: 'some-file\\.js',
      describeIds: ['\\[brackets\\]and\\(parenthesis\\)', '\\^start\\|end\\$'],
      testId: '\\+\\{more\\}\\\\',
    })
  })
})
