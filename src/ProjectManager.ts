import _ from 'lodash'
import vscode from 'vscode'
import type { Log } from 'vscode-test-adapter-util'
import type { JestTestAdapterOptions } from './JestManager'
import { getSettings } from './JestSettings'
import TestLoader from './TestLoader'
import { type WorkspaceRootNode, createWorkspaceRootNode } from './helpers/tree'
import { type RepoParser, getRepoParser } from './repo'
import type { ProjectChangeEvent, ProjectConfig } from './repo/types'
import type {
  EnvironmentChangedEvent,
  IDisposable,
  ProjectsChangedEvent,
  WorkspaceTestState,
} from './types'

class ProjectManager {
  private repoParser: RepoParser | null = null
  private testLoaders: TestLoader[] = []
  private disposables: IDisposable[] = []
  private projectsChangedEmitter: vscode.EventEmitter<ProjectsChangedEvent>
  private workspaceTestState: WorkspaceRootNode = createWorkspaceRootNode()

  constructor(
    private readonly workspace: vscode.WorkspaceFolder,
    private readonly log: Log,
    private readonly options: JestTestAdapterOptions,
  ) {
    this.projectsChangedEmitter =
      new vscode.EventEmitter<ProjectsChangedEvent>()
  }

  public get projectsChanged() {
    return this.projectsChangedEmitter.event
  }

  public async getTestState(): Promise<WorkspaceTestState> {
    await this.ensureInitialised()
    if (!this.repoParser) {
      // we return the default WorkspaceRootNode in the case we don't find a valid RepoParser.
      this.log.info(
        `No RepoParser available for project: ${this.workspace.uri.fsPath}`,
      )
      return { suite: this.workspaceTestState }
    }

    const promises = this.testLoaders.map((t) => t.getTestState(true))
    const testStates = await Promise.all(promises)

    this.workspaceTestState = {
      id: 'root',
      label: `${this.workspace.name}`,
      projects: testStates.map((x) => x.suite),
      type: 'workspaceRootNode',
    }

    return { suite: this.workspaceTestState }
  }

  public dispose(): void {
    for (const disposable of this.testLoaders) {
      disposable.dispose()
    }
    this.testLoaders = []

    for (const disposable of this.disposables) {
      disposable.dispose()
    }
    this.disposables = []

    if (this.projectsChangedEmitter) {
      this.projectsChangedEmitter.dispose()
    }
  }

  private handleTestChange(event: EnvironmentChangedEvent) {
    switch (event.type) {
      case 'App':
        // Assume that we don't need to update `this.workspaceTestState` because only App files have changed.

        this.projectsChangedEmitter.fire({
          invalidatedTestIds: event.invalidatedTestIds,
          suite: this.workspaceTestState,
          type: 'projectAppUpdated',
        })

        this.log.info(`Application file changed: ${JSON.stringify(event)}`)
        break

      case 'Test':
        this.workspaceTestState = {
          ...this.workspaceTestState,
          projects: this.workspaceTestState.projects.map((p) =>
            p.id !== event.updatedSuite.id ? p : event.updatedSuite,
          ),
        }

        this.projectsChangedEmitter.fire({
          suite: this.workspaceTestState,
          testEvent: event,
          type: 'projectTestsUpdated',
        })

        this.log.info(`Test file changed: ${JSON.stringify(event)}`)
        break
    }
  }

  private async ensureInitialised() {
    const jestPath = this.options.pathToJest(this.workspace)

    if (!this.repoParser) {
      this.repoParser = await getRepoParser(
        this.workspace.uri.fsPath,
        this.log,
        jestPath,
      )

      if (this.repoParser) {
        this.disposables.push(
          this.repoParser.projectChange((e) => this.handleProjectChange(e)),
        )

        // register the test loaders for each project.
        const projects = await this.repoParser.getProjects()
        const createLoaderPromises = projects.map(async (p) => {
          await this.addNewTestLoader(p, jestPath)
        })
        await Promise.all(createLoaderPromises)
      }
    }
  }

  private async handleProjectChange(event: ProjectChangeEvent) {
    const jestPath = this.options.pathToJest(this.workspace)

    switch (event.type) {
      case 'added': {
        const loader = await this.addNewTestLoader(event.config, jestPath)
        const newProject = await loader.getTestState()

        this.workspaceTestState = {
          ...this.workspaceTestState,
          projects: this.workspaceTestState.projects
            .concat(newProject.suite)
            .sort((a, b) => a.id.localeCompare(b.id)),
        }

        this.projectsChangedEmitter.fire({
          addedProject: newProject.suite,
          suite: this.workspaceTestState,
          type: 'projectAdded',
        })

        this.log.info(`New project added: ${event.config} ${newProject}`)
        break
      }

      case 'removed':
        this.workspaceTestState = {
          ...this.workspaceTestState,
          projects: this.workspaceTestState.projects.filter(
            (x) => x.config.rootPath === event.rootPath,
          ),
        }

        this.projectsChangedEmitter.fire({
          suite: this.workspaceTestState,
          type: 'projectRemoved',
        })

        this.log.info(`Project removed: ${event}`)
        break
    }
  }

  private async addNewTestLoader(
    projectConfig: ProjectConfig,
    jestPath: string,
  ): Promise<TestLoader> {
    this.log.info(`Loading Jest settings from ${projectConfig.jestConfig}...`)
    const settings = await getSettings(projectConfig)

    if (settings.configs.length > 1) {
      this.log.info('More than one Jest config found.', settings)
    } else if (settings.configs[0]?.testRegex?.length > 1) {
      this.log.info('More than one Jest test regex found.', settings)
    }

    const testLoader = new TestLoader(settings, this.log, projectConfig)
    this.testLoaders.push(testLoader)
    this.disposables.push(
      testLoader.environmentChange((e) => this.handleTestChange(e), this),
    )

    return testLoader
  }
}

export default ProjectManager
