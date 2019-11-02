import { workspace, WorkspaceConfiguration } from "vscode";
export class FTHTMLConfigs {
  protected _: WorkspaceConfiguration = workspace.getConfiguration('fthtml');
  
  public get validateOnSave() : boolean {
    return this._.get('validateOnSave', true);
  }

  public get exportOnSave() : boolean {
    return this._.get('exportOnSave' , false);
  }

  public get clearOutputOnSave() : boolean {
    return this._.get('clearOutputOnSave' , false);
  }
    
  constructor() {
  }
}