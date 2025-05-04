import {
  DESCRIBE_ID_SEPARATOR,
  PROJECT_ID_SEPARATOR,
  TEST_ID_SEPARATOR,
} from '../constants'
import { escapeRegExp } from './escapeRegExp'

interface Id {
  projectId: string
  fileName?: string
  describeIds?: string[]
  testId?: string
}

const mapIdToString = (id: Id): string => {
  let result = id.projectId

  if (id.fileName) {
    result += `${PROJECT_ID_SEPARATOR}${id.fileName}`

    if (id.describeIds && id.describeIds.length > 0) {
      result += `${DESCRIBE_ID_SEPARATOR}${id.describeIds.join(`${DESCRIBE_ID_SEPARATOR}${DESCRIBE_ID_SEPARATOR}`)}${DESCRIBE_ID_SEPARATOR}`
    }

    if (id.testId) {
      result += `${TEST_ID_SEPARATOR}${id.testId}${TEST_ID_SEPARATOR}`
    }
  }

  return result
}

const mapStringToId = (id: string): Id => {
  const { projectId, fileName, rest } =
    id.match(
      RegExp(
        `(?<projectId>[^${PROJECT_ID_SEPARATOR}]*)(${PROJECT_ID_SEPARATOR}(?<fileName>[^${DESCRIBE_ID_SEPARATOR}${TEST_ID_SEPARATOR}]*)?(?<rest>.*))?`,
      ),
    )?.groups || {}

  // TestID is everything after first TEST_ID_SEPARATOR and ends with TEST_ID_SEPARATORs
  // if we find multiple TEST_ID_SEPARATORs in the middle, add them back in
  const [describes, ...testIdParts] = (rest || '')
    .replace(new RegExp(`${TEST_ID_SEPARATOR}$`), '') // Remove trailing TEST_ID_SEPARATOR
    .split(TEST_ID_SEPARATOR)
  const testId = testIdParts.join(TEST_ID_SEPARATOR) || undefined
  // describeIDs are wrapped with DESCRIBE_ID_SEPARATOR
  const describeIds = !describes.length
    ? []
    : describes
        .replace(
          new RegExp(`^${DESCRIBE_ID_SEPARATOR}(.*)${DESCRIBE_ID_SEPARATOR}$`),
          '$1',
        )
        .split(`${DESCRIBE_ID_SEPARATOR}${DESCRIBE_ID_SEPARATOR}`)

  return {
    projectId,
    fileName,
    describeIds: describeIds.length ? describeIds : undefined,
    testId,
  }
}

const mapIdToEscapedRegExpId = (id: Id): Id => {
  return {
    projectId: escapeRegExp(id.projectId),

    fileName: id.fileName === undefined ? undefined : escapeRegExp(id.fileName),

    describeIds:
      id.describeIds === undefined
        ? undefined
        : id.describeIds.map(escapeRegExp),

    testId: id.testId === undefined ? undefined : escapeRegExp(id.testId),
  }
}

export { mapIdToString, mapStringToId, mapIdToEscapedRegExpId, type Id }
