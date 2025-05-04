import path from 'node:path'
import type { Log } from 'vscode-test-adapter-util'
import { NxdevBase } from './NxdevBase'
import type { RepoParser } from './types'

interface NxReact {
  architect: {
    test: {
      builder: string
      options: {
        jestConfig: string
        tsConfig?: string
        setupFile?: string
      }
    }
  }
}

class NxdevReact extends NxdevBase<NxReact> implements RepoParser {
  public type = 'Nx.dev React'

  protected configFileName = 'workspace.json'

  protected configFilter = ([, projectConfig]: [string, NxReact]) =>
    projectConfig.architect?.test &&
    projectConfig.architect.test.builder === '@nrwl/jest:jest'

  protected configMap = ([projectName, projectConfig]: [string, NxReact]) => {
    const options = projectConfig.architect.test.options

    return {
      ...this.getJestExecutionParameters(projectName),
      jestConfig: path.resolve(this.workspaceRoot, options.jestConfig),
      projectName,
      rootPath: path.resolve(
        this.workspaceRoot,
        path.dirname(options.jestConfig),
      ),
      setupFile:
        options.setupFile &&
        path.resolve(this.workspaceRoot, options.setupFile),
      tsConfig:
        options.tsConfig && path.resolve(this.workspaceRoot, options.tsConfig),
    }
  }
}

export { NxdevReact }
