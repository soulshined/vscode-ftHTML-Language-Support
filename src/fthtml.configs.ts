import { workspace, WorkspaceConfiguration } from "vscode";
import { platform } from 'os';

export class FTHTMLConfigs {
  protected _: WorkspaceConfiguration = workspace.getConfiguration('fthtml');

  public get validateOnSave(): boolean {
    return this._.get('validateOnSave', true);
  }

  public get exportOnSave(): boolean {
    return this._.get('exportOnSave', false);
  }

  public get clearOutputOnSave(): boolean {
    return this._.get('clearOutputOnSave', false);
  }

  public get shell(): string | undefined {
    let shell = undefined
    if (platform() === 'darwin')
      shell = "/usr/local/bin"

    return this._.get('shell', shell);
  }

  constructor() {
  }
}