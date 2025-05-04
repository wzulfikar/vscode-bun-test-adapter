import fs from 'node:fs'
import path from 'node:path'
import util from 'node:util'
import type { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package'
import _ from 'lodash'
import { gt } from 'semver'
import vscode from 'vscode'
import type { Log } from 'vscode-test-adapter-util'
import {
  EXPERIMENTAL_NX_CLI_FEATURE_TOGGLE,
  EXTENSION_CONFIGURATION_NAME,
} from '../constants'
import RepoParserBase from './RepoParserBase'
import type { ProjectConfig, RepoParser } from './types'

// the following requires Node 8 minimum.
export const exists = util.promisify(fs.exists)
export const readFile = util.promisify(fs.readFile)

abstract class NxdevBase<T> extends RepoParserBase implements RepoParser {
  public abstract type: string

  protected abstract configFileName: string

  protected abstract configFilter: (entry: [string, T]) => boolean

  protected abstract configMap: (entry: [string, T]) => ProjectConfig

  private useExperimentalCli?: boolean

  public async getProjects(): Promise<ProjectConfig[]> {
    await this.ensureUseExperimentalCliDetermined()
    const buffer = await readFile(
      path.resolve(this.workspaceRoot, this.configFileName),
    )
    const angularConfig = JSON.parse(buffer.toString()) as {
      projects: { key: T }
    }
    const angularProjects = Object.entries<T>(angularConfig.projects)
      .filter(this.configFilter)
      .map((entry) => this.configMap(entry))

    return angularProjects
  }

  public async isMatch() {
    return (
      (await exists(path.resolve(this.workspaceRoot, this.configFileName))) &&
      (await exists(path.resolve(this.workspaceRoot, 'nx.json')))
    )
  }

  protected getJestExecutionParameters(projectName: string) {
    if (this.useExperimentalCli) {
      return {
        jestCommand: `nx test ${projectName}`,
        jestExecutionDirectory: this.workspaceRoot,
      }
    }

    return this.getJestCommandAndDirectory()
  }

  /**
   * check if the version of Nx is high enough to support fetching questions using the Nx CLI and that the feature
   * toggle is enabled.
   */
  private async ensureUseExperimentalCliDetermined() {
    if (this.useExperimentalCli !== undefined) {
      return
    }

    const featureToggles =
      vscode.workspace
        .getConfiguration(EXTENSION_CONFIGURATION_NAME, null)
        .get<string[]>('featureToggles') || []

    const nxCommandFeatureToggleEnabled = _.some(
      featureToggles,
      EXPERIMENTAL_NX_CLI_FEATURE_TOGGLE,
    )

    const packageFile = await this.getPackageFile(this.workspaceRoot)

    if (!packageFile) {
      this.useExperimentalCli = false
    } else {
      const nxVersion = await getNxVersion(packageFile)
      this.useExperimentalCli =
        nxCommandFeatureToggleEnabled && gt(nxVersion, '9.2.4')
    }
  }
}

const getNxVersion = async (packageJson: JSONSchemaForNPMPackageJsonFiles) => {
  let nxVersion

  if (packageJson.dependencies) {
    nxVersion = packageJson.dependencies['@nrwl/jest']
    if (nxVersion) {
      return nxVersion
    }
  }

  if (packageJson.devDependencies) {
    nxVersion = packageJson.devDependencies['@nrwl/jest']
    if (nxVersion) {
      return nxVersion
    }
  }

  return '0.0.0'
}

export { NxdevBase }
