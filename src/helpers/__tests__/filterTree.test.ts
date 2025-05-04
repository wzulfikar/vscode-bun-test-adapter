import { flatMap, flattenDeep } from 'lodash'
import type { ProjectConfig } from '../../repo'
import { filterTree } from '../filterTree'
import { type Id, mapIdToString } from '../idMaps'
// import { mapTestIdToTestNamePattern } from "../mapTestIdsToTestFilter";
import {
  type DescribeNode,
  type FileNode,
  type FileWithParseErrorNode,
  // FileWithParseErrorNode,
  type FolderNode,
  type ProjectRootNode,
  type TestNode,
  createDescribeNode,
  createFileNode,
  // createFolderNode,
  createProjectNode,
  createTestNode,
} from '../tree'

const PROJECT_NAME = 'mock-project'
const ROOT_PATH = `/${PROJECT_NAME}`
const dummyConfig: ProjectConfig = {
  jestCommand: '',
  jestConfig: '',
  jestExecutionDirectory: '',
  projectName: PROJECT_NAME,
  rootPath: ROOT_PATH,
  tsConfig: '',
}

const isFolder = (object: FileNode | FolderNode): object is FolderNode => {
  return 'folders' in object || 'files' in object
}

const isFile = (object: FileNode | FolderNode): object is FileNode => {
  return !isFolder(object)
}

const isDescribe = (
  object: TestNode | DescribeNode,
): object is DescribeNode => {
  return 'tests' in object || 'describeBlocks' in object
}

const isTest = (object: TestNode | DescribeNode): object is TestNode => {
  return !isDescribe(object)
}

const createProject = (
  id: Id,
  createChildren: (id: Id) => (FileNode | FolderNode)[],
): ProjectRootNode => {
  const project = createProjectNode(PROJECT_NAME, PROJECT_NAME, dummyConfig)
  const children = createChildren(id)
  project.folders = children.filter(isFolder)
  project.files = children.filter(isFile)
  return project
}

// const createFolder = (rootId: Id, folderName: string, createChildren: (id:Id) => (FileNode|FolderNode)[]): FolderNode => {
//   const id: Id = {
//     ...rootId,
//     fileName: `${rootId.fileName || ''}/${folderName}`
//   };
//   const idString = mapIdToString(id);

//   const folder = createFolderNode(idString, folderName);
//   const children = createChildren(id);
//   folder.folders = children.filter(isFolder);
//   folder.files = children.filter(isFile);

//   return folder;
// };

const createFile = (
  rootId: Id,
  fileName: string,
  createDescribeBlocks: (id: Id) => DescribeNode[],
): FileNode => {
  const id = {
    ...rootId,
    fileName: `${rootId.fileName || ''}/${fileName}`,
  }
  const idString = mapIdToString(id)

  const file = createFileNode(idString, fileName, id.fileName)
  file.describeBlocks = createDescribeBlocks(id)

  return file
}

const createDescribe = (
  rootId: Id,
  label: string,
  line: number,
  createChildren: (id: Id) => (TestNode | DescribeNode)[] = (id) => [],
): DescribeNode => {
  const id = {
    ...rootId,
    describeIds: (rootId.describeIds || []).concat(label),
  }
  const idString = mapIdToString(id)
  const fileName = id.fileName || ''

  const describeNode = createDescribeNode(
    idString,
    label,
    fileName,
    line,
    false,
  )
  const children = createChildren(id)
  describeNode.describeBlocks = children.filter(isDescribe)
  describeNode.tests = children.filter(isTest)

  return describeNode
}

const createTest = (rootId: Id, label: string, line: number): TestNode => {
  const id = {
    ...rootId,
    testId: label,
  }
  const idString = mapIdToString(id)
  const fileName = id.fileName || ''

  return createTestNode(idString, label, fileName, line, false)
}

describe('filterTree', () => {
  describe('using plan string matches', () => {
    describe('tree with single test', () => {
      const BASE_ID = { projectId: PROJECT_NAME, fileName: ROOT_PATH }
      const tree = createProject(BASE_ID, (id) => [
        createFile(id, 'some-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
      ])

      describe('expected matches', () => {
        const expectedFilteredTree = {
          files: [
            {
              describeBlocks: [
                {
                  describeBlocks: [
                    {
                      describeBlocks: [],
                      label: 'innerDescribe',
                      tests: [{ label: 'someTest' }],
                    },
                  ],
                  label: 'someDescribe',
                  tests: [],
                },
              ],
              file: '/mock-project/some-file.js',
            },
          ],
          folders: [],
          label: 'mock-project',
        }

        it('given full test id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given nested describe id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given top-level describe id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given file id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given project id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })
      })

      describe('expected misses', () => {
        it('given different test id, matches describes, but not test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'differentTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const allDescribesButNoTest = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          // No test found
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(allDescribesButNoTest)
        })

        // Currently failing
        it('given test id plus suffix, matches describes, but not test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest2',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const allDescribesButNoTest = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          // No test found
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(allDescribesButNoTest)
        })

        it('given correct test, but wrong inner describe, matches file and outer describe only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'otherDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const outerDescribeOnly = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      // No inner describe
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(outerDescribeOnly)
        })

        // Currently failing
        it('given correct test, but inner describe with suffix, matches file and outer describe only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe2'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const outerDescribeOnly = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      // No inner describe
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(outerDescribeOnly)
        })

        it('given correct test, but wrong outer describe, matches file only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['otherDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const fileOnly = {
            files: [
              {
                describeBlocks: [
                  // No inner describe
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(fileOnly)
        })

        // Currently failing
        it('given correct test, but outer describe with suffix, matches file only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe2', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          const fileOnly = {
            files: [
              {
                describeBlocks: [
                  // No inner describe
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(fileOnly)
        })
      })
    })

    describe('tree with multiple options at each level', () => {
      const BASE_ID = { projectId: PROJECT_NAME, fileName: ROOT_PATH }
      const tree = createProject(BASE_ID, (id) => [
        createFile(id, 'some-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
              createTest(id, 'someTest2', 2),
              createTest(id, 'otherTest', 2),
            ]),
            createDescribe(id, 'innerDescribe2', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
            createDescribe(id, 'otherInnerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
          createDescribe(id, 'someDescribe2', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
          createDescribe(id, 'otherDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
        createFile(id, 'some-other-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
      ])

      describe('expected matches', () => {
        it('given full test id, matches only specific test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given nested describe id, matches all tests in nested describe', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given top-level describe id, matches all tests in outer describe', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given file id, matches all tests in file', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe2',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'otherDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given project id, matches all tests in project', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, false)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe2',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'otherDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-other-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })
      })
    })
  })

  describe('using regex matches', () => {
    describe('tree with single test', () => {
      const BASE_ID = { projectId: PROJECT_NAME, fileName: ROOT_PATH }
      const tree = createProject(BASE_ID, (id) => [
        createFile(id, 'some-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
      ])

      describe('expected matches', () => {
        const expectedFilteredTree = {
          files: [
            {
              describeBlocks: [
                {
                  describeBlocks: [
                    {
                      describeBlocks: [],
                      label: 'innerDescribe',
                      tests: [{ label: 'someTest' }],
                    },
                  ],
                  label: 'someDescribe',
                  tests: [],
                },
              ],
              file: '/mock-project/some-file.js',
            },
          ],
          folders: [],
          label: 'mock-project',
        }

        it('given full test id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given nested describe id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given top-level describe id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given file id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })

        it('given project id, matches test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject(expectedFilteredTree)
        })
      })

      describe('expected misses', () => {
        it('given different test id, matches describes, but not test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'differentTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const allDescribesButNoTest = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          // No test found
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(allDescribesButNoTest)
        })

        // Currently failing
        it('given test id plus suffix, matches describes, but not test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest2',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const allDescribesButNoTest = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          // No test found
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(allDescribesButNoTest)
        })

        it('given correct test, but wrong inner describe, matches file and outer describe only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'otherDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const outerDescribeOnly = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      // No inner describe
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(outerDescribeOnly)
        })

        // Currently failing
        it('given correct test, but inner describe with suffix, matches file and outer describe only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe2'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const outerDescribeOnly = {
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      // No inner describe
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(outerDescribeOnly)
        })

        it('given correct test, but wrong outer describe, matches file only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['otherDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const fileOnly = {
            files: [
              {
                describeBlocks: [
                  // No inner describe
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(fileOnly)
        })

        // Currently failing
        it('given correct test, but outer describe with suffix, matches file only', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe2', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const fileOnly = {
            files: [
              {
                describeBlocks: [
                  // No inner describe
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          }
          expect(filteredTree).toMatchObject(fileOnly)
        })
      })
    })

    describe('tree with multiple options at each level', () => {
      const BASE_ID = { projectId: PROJECT_NAME, fileName: ROOT_PATH }
      const tree = createProject(BASE_ID, (id) => [
        createFile(id, 'some-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
              createTest(id, 'someTest2', 2),
              createTest(id, 'otherTest', 2),
            ]),
            createDescribe(id, 'innerDescribe2', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
            createDescribe(id, 'otherInnerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
          createDescribe(id, 'someDescribe2', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
          createDescribe(id, 'otherDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
        createFile(id, 'some-other-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createDescribe(id, 'innerDescribe', 1, (id) => [
              createTest(id, 'someTest', 2),
            ]),
          ]),
        ]),
      ])

      describe('expected matches', () => {
        it('given full test id, matches only specific test', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
              testId: 'someTest',
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given nested describe id, matches all tests in nested describe', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe', 'innerDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given top-level describe id, matches all tests in outer describe', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given file id, matches all tests in file', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe2',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'otherDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })

        it('given project id, matches all tests in project', () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          expect(filteredTree).toMatchObject({
            files: [
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [
                          { label: 'someTest' },
                          { label: 'someTest2' },
                          { label: 'otherTest' },
                        ],
                      },
                      {
                        describeBlocks: [],
                        label: 'innerDescribe2',
                        tests: [{ label: 'someTest' }],
                      },
                      {
                        describeBlocks: [],
                        label: 'otherInnerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe2',
                    tests: [],
                  },
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'otherDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-file.js',
              },
              {
                describeBlocks: [
                  {
                    describeBlocks: [
                      {
                        describeBlocks: [],
                        label: 'innerDescribe',
                        tests: [{ label: 'someTest' }],
                      },
                    ],
                    label: 'someDescribe',
                    tests: [],
                  },
                ],
                file: '/mock-project/some-other-file.js',
              },
            ],
            folders: [],
            label: 'mock-project',
          })
        })
      })
    })

    describe('jest.each blocks', () => {
      const BASE_ID = { projectId: PROJECT_NAME, fileName: ROOT_PATH }
      const tree = createProject(BASE_ID, (id) => [
        createFile(id, 'some-file.js', (id) => [
          createDescribe(id, 'someDescribe', 1, (id) => [
            createTest(id, 'someTest (1)', 2),
            createTest(id, 'someTest (2.4)', 3),
            createTest(id, 'someTest (-3)', 4),
            createTest(id, 'someTest ("a string")', 5),
            createTest(id, 'someTest ({"key":"value"})', 6),
            createTest(id, 'someTest ([1,2,3])', 7),
            createTest(id, 'someTest {"not":"in-parens"}', 8),
            createTest(id, 'someTest (random words)', 9),
            createTest(id, 'someTest not in parens', 10),
            createTest(id, 'someTest 5', 10),
            createTest(id, 'someTest (%#)', 11),
            createTest(id, 'someTest (%i)', 11),
            createTest(id, 'someTest (%d)', 11),
            createTest(id, 'someTest (%f)', 11),
            createTest(id, 'someTest (%p)', 11),
            createTest(id, 'someTest (%s)', 11),
            createTest(id, 'someTest (%o)', 11),
            createTest(id, 'someTest (%j)', 11),
          ]),
        ]),
      ])

      const getFiles = (
        tree: ProjectRootNode | FolderNode,
      ): (FileNode | FileWithParseErrorNode)[] => {
        return [
          ...tree.files,
          ...flatMap(tree.folders, (folder) => getFiles(folder)),
        ]
      }

      const getTests = (describeBlocks: DescribeNode[]): TestNode[] => {
        return [
          ...flatMap(describeBlocks, (describe) => describe.tests),
          ...flatMap(describeBlocks, (describe) =>
            getTests(describe.describeBlocks),
          ),
        ]
      }

      const getTestLabels = (tree: ProjectRootNode): string[] => {
        return flattenDeep(
          getFiles(tree).map((file) =>
            getTests(file.describeBlocks).map((test) => test.label),
          ),
        )
      }

      it('%#', () => {
        const testNames = [
          mapIdToString({
            projectId: PROJECT_NAME,
            fileName: `${ROOT_PATH}/some-file.js`,
            describeIds: ['someDescribe'],
            testId: 'someTest (%#)',
          }),
        ]

        const filteredTree = filterTree(tree, testNames, true)

        const tests = getTestLabels(filteredTree)
        expect(tests).toMatchObject(['someTest (1)', 'someTest (%#)'])
      })

      it('%i', () => {
        const testNames = [
          mapIdToString({
            projectId: PROJECT_NAME,
            fileName: `${ROOT_PATH}/some-file.js`,
            describeIds: ['someDescribe'],
            testId: 'someTest (%i)',
          }),
        ]

        const filteredTree = filterTree(tree, testNames, true)

        const tests = getTestLabels(filteredTree)
        expect(tests).toMatchObject([
          'someTest (1)',
          'someTest (-3)',
          'someTest (%i)',
        ])
      })
      ;['%d', '%f'].forEach((placeholder) =>
        it(`${placeholder}`, () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
              testId: `someTest (${placeholder})`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const tests = getTestLabels(filteredTree)
          expect(tests).toMatchObject([
            'someTest (1)',
            'someTest (2.4)',
            'someTest (-3)',
            `someTest (${placeholder})`,
          ])
        }),
      )

      it('%j', () => {
        const testNames = [
          mapIdToString({
            projectId: PROJECT_NAME,
            fileName: `${ROOT_PATH}/some-file.js`,
            describeIds: ['someDescribe'],
            testId: 'someTest (%j)',
          }),
        ]

        const filteredTree = filterTree(tree, testNames, true)

        const tests = getTestLabels(filteredTree)
        expect(tests).toMatchObject([
          'someTest (1)',
          'someTest (2.4)',
          'someTest (-3)',
          'someTest ("a string")',
          'someTest ({"key":"value"})',
          'someTest ([1,2,3])',
          'someTest (%j)',
        ])
      })
      ;['%p', '%s', '%o'].forEach((placeholder) =>
        it(`${placeholder}`, () => {
          const testNames = [
            mapIdToString({
              projectId: PROJECT_NAME,
              fileName: `${ROOT_PATH}/some-file.js`,
              describeIds: ['someDescribe'],
              testId: `someTest (${placeholder})`,
            }),
          ]

          const filteredTree = filterTree(tree, testNames, true)

          const tests = getTestLabels(filteredTree)
          expect(tests).toMatchObject([
            'someTest (1)',
            'someTest (2.4)',
            'someTest (-3)',
            'someTest ("a string")',
            'someTest ({"key":"value"})',
            'someTest ([1,2,3])',
            'someTest (random words)',
            'someTest (%#)',
            'someTest (%i)',
            'someTest (%d)',
            'someTest (%f)',
            'someTest (%p)',
            'someTest (%s)',
            'someTest (%o)',
            'someTest (%j)',
          ])
        }),
      )
    })
  })
})
