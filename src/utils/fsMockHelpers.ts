import fs from 'node:fs'

const resetFileSystem: () => void = () => (fs as any).vol.reset()

const createFileSystem = (fileSystem: any) => {
  for (const key in fileSystem) {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
    if (fileSystem.hasOwnProperty(key) && typeof fileSystem[key] === 'object') {
      fileSystem[key] = JSON.stringify(fileSystem[key])
    }
  }
  ;(fs as any).vol.fromJSON(fileSystem)
}

export { createFileSystem, resetFileSystem }
