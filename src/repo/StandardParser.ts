import type { Log } from 'vscode-test-adapter-util'
import { getJestConfigInDirectory } from '../utils'
import RepoParserBase from './RepoParserBase'
import { getProjectName, getTsConfig } from './repoHelpers'
import type { ProjectConfig, RepoParser } from './types'

class StandardParser extends RepoParserBase implements RepoParser {
  public type = 'default'

  public async getProjects(): Promise<ProjectConfig[]> {
    const jestConfig =
      (await getJestConfigInDirectory(this.workspaceRoot)) ?? undefined

    const { jestCommand, jestExecutionDirectory } =
      this.getJestCommandAndDirectory()

    return Promise.resolve([
      {
        jestCommand,
        jestConfig,
        jestExecutionDirectory,
        projectName: await getProjectName(this.workspaceRoot),
        rootPath: this.workspaceRoot,
        tsConfig: await getTsConfig(this.workspaceRoot),
      },
    ])
  }

  public async isMatch(): Promise<boolean> {
    const packageFile = await this.getPackageFile(this.workspaceRoot)

    return (
      packageFile?.dependencies?.jest !== undefined ||
      packageFile?.devDependencies?.jest !== undefined ||
      packageFile?.peerDependencies?.jest !== undefined ||
      packageFile?.optionalDependencies?.jest !== undefined
    )
  }
}

export { StandardParser }
