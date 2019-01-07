import { workspace, WorkspaceConfiguration } from "vscode";
export class FTHTMLConfigs {
  protected _: WorkspaceConfiguration = workspace.getConfiguration('fthtml');
  
  public get validateOnSave() : boolean {
    return this._.get('validateOnSave', true);
  }
    
  constructor() {
  }
}