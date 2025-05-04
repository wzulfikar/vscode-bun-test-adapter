import path from 'node:path'
import type { Log } from 'vscode-test-adapter-util'
import { NxdevBase } from './NxdevBase'
import type { RepoParser } from './types'

interface NxAngular {
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

class NxdevAngular extends NxdevBase<NxAngular> implements RepoParser {
  public type = 'Nx.dev Angular'

  protected configFileName = 'angular.json'

  protected configFilter = ([, projectConfig]: [string, NxAngular]) =>
    projectConfig.architect?.test &&
    projectConfig.architect.test.builder === '@nrwl/jest:jest'

  protected configMap = ([projectName, projectConfig]: [string, NxAngular]) => {
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

export { NxdevAngular }
