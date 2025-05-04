import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import stripAnsi from 'strip-ansi'
import type * as vscode from 'vscode'
import type { ProjectConfig } from './repo' // Assuming this might still be relevant
import type { ITestFilter } from './types' // Assuming this might still be relevant

// Define a potential structure for Bun test results (adjust as needed)
export interface IBunTestResult {
  file: string
  describe: string // Full describe block path
  testName: string
  passed: boolean
  duration?: number
  errorMessage?: string
  errorStack?: string
  line?: number
}

export interface IBunResponse {
  results: IBunTestResult[]
  // Add other relevant info if needed, e.g., overall pass/fail, total time
}

export default class BunManager {
  private activeProcess: ChildProcessWithoutNullStreams | null = null

  public closeAllActiveProcesses(): void {
    if (this.activeProcess?.killed === false) {
      this.activeProcess.kill('SIGTERM') // Send termination signal
      console.log('Terminated active Bun process.')
    }
    this.activeProcess = null
  }

  public async runTests(
    testFilter: ITestFilter | null,
    // projectConfig: ProjectConfig, // May not be needed if Bun auto-detects tests
    workspaceRoot: string,
    output: vscode.OutputChannel,
  ): Promise<IBunResponse | null> {
    output.clear()
    output.appendLine('Running Bun tests...')
    this.closeAllActiveProcesses() // Ensure no old process is running

    // --- Argument Construction ---
    // TODO: Determine how to pass filters to `bun test`
    const args: string[] = ['test']
    if (testFilter) {
      // Example: Bun might support filtering by file path directly
      if (testFilter.testFileNamePattern) {
        // This is a guess, need to verify Bun's CLI options
        args.push(testFilter.testFileNamePattern)
      }
      // Example: Bun might support filtering by test name pattern via -t or --match
      if (testFilter.testNamePattern) {
        // This is a guess, need to verify Bun's CLI options
        // args.push('-t', testFilter.testNamePattern); // or --match
      }
    }
    // Add other necessary args, e.g., --reporter=tap if available?

    return new Promise<IBunResponse | null>((resolve, reject) => {
      try {
        // --- Process Execution ---
        this.activeProcess = spawn('bun', args, {
          cwd: workspaceRoot,
          shell: false,
          env: process.env,
        })
        console.log(`Spawning: bun ${args.join(' ')} in ${workspaceRoot}`)

        let stdoutData = ''
        let stderrData = ''

        this.activeProcess.stdout.on('data', (data: Buffer) => {
          const text = data.toString()
          stdoutData += text
          output.append(stripAnsi(text)) // Pipe sanitized output
        })

        this.activeProcess.stderr.on('data', (data: Buffer) => {
          const text = data.toString()
          stderrData += text
          output.append(stripAnsi(text)) // Pipe sanitized output
        })

        this.activeProcess.on('error', (err) => {
          console.error('Failed to start Bun process:', err)
          output.appendLine(`Failed to start Bun process: ${err.message}`)
          this.activeProcess = null
          reject(err)
        })

        this.activeProcess.on('close', (code) => {
          console.log(`Bun process exited with code ${code}`)
          this.activeProcess = null

          if (code === null || code !== 0) {
            // Handle potential cancellation (code might be null) or errors
            // Maybe try parsing stderrData if it seems relevant
            console.error(
              `Bun process error (Code: ${code}). Stderr: ${stderrData}`,
            )
            // Decide if we should still try parsing stdout or just reject/return null
            // For now, let's try parsing anyway, but log the error
            output.appendLine(`Bun process exited with error code: ${code}`)
          }

          // --- Output Parsing ---
          try {
            // TODO: Implement robust parsing of stdoutData (TAP or default format)
            const parsedResults = this.parseBunOutput(stdoutData)
            resolve({ results: parsedResults })
          } catch (parseError: unknown) {
            console.error('Failed to parse Bun output:', parseError)
            output.appendLine(`Failed to parse Bun output: ${parseError}`)
            // Decide what to return on parse error - null or empty results?
            resolve(null) // Or perhaps { results: [] } ?
          }
        })
      } catch (error: unknown) {
        console.error('Error spawning Bun process:', error)
        output.appendLine(`Error running bun test: ${error}`)
        this.activeProcess = null
        reject(error)
      }
    })
  }

  // --- Parsing Logic ---
  private parseBunOutput(output: string): IBunTestResult[] {
    // TODO: Implement actual parsing logic here.
    // This will depend heavily on the format of `bun test` output.
    // If using TAP: use a TAP parser library.
    // If using default output: use regex or line-by-line analysis.
    console.log('--- Raw Bun Output ---')
    console.log(output)
    console.log('--- End Raw Bun Output ---')

    const lines = output.split('\n')
    const results: IBunTestResult[] = []

    // Example placeholder logic (VERY basic)
    for (const line of lines) {
      if (line.includes('fail')) {
        // Try to extract info...
      } else if (line.includes('pass')) {
        // Try to extract info...
      }
    }

    // Placeholder return
    return results
  }
}
