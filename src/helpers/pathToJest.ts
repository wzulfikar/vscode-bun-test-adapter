import { existsSync } from 'node:fs'
import { normalize, resolve } from 'node:path'
import type { WorkspaceFolder } from 'vscode'

export default function pathToJest(workspace: WorkspaceFolder): string {
  const jest = pathToLocalJestExecutable(workspace.uri.fsPath)
  if (existsSync(jest)) {
    return jest
  }
  return 'jest'
}

function pathToLocalJestExecutable(rootDir: string): string {
  if (process.platform === 'win32') {
    return normalize(resolve(rootDir, './node_modules/.bin/jest.cmd'))
  }
  return normalize(resolve(rootDir, './node_modules/.bin/jest'))
}
