'user strict';

import * as fthtml from "fthtml"
import * as vscode from "vscode";
import { FTHTMLConfigs } from "../fthtml.configs";

export default class FTHTMLParserProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private configs: FTHTMLConfigs;
  constructor(subscriptions: vscode.Disposable[]) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('fthtml');
    this.configs = new FTHTMLConfigs();

    subscriptions.push(this);
    vscode.workspace.onDidChangeConfiguration(e => {
      this.configs = new FTHTMLConfigs();
    },this,subscriptions);

    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (this.configs.validateOnSave) this.renderDocSync(doc);
    }, this, subscriptions);

    vscode.workspace.onDidOpenTextDocument((doc) => {
      this.renderDocSync(doc);
    }, this, subscriptions);

    vscode.workspace.onDidCloseTextDocument((doc) => {
      this.diagnosticCollection.delete(doc.uri);
    }, this, subscriptions);
  }
  
  public dispose(): void {
    this.diagnosticCollection.clear();
    this.diagnosticCollection.dispose();
  }

  private renderDocSync(doc: vscode.TextDocument):void {
    if (doc.uri.scheme === 'file' && doc.languageId === 'fthtml') {
      let rel = doc.uri.path.substring(1, doc.uri.path.lastIndexOf('.fthtml'));
      this.diagnosticCollection.set(doc.uri, []);
      try {
        fthtml.renderFile(rel);
      } catch (error) {
        error = error.toString().substring(error.toString().lastIndexOf('Error:')+6).trim();
        let match: RegExpExecArray | null;
        const diagnostics: vscode.Diagnostic[] = [];
        
        if ((match = /\s\@ (\d+)\:(\d+)\-(\d+)/.exec(error)) !== null) {
          const [line,col,eCol] = [match[1],match[2],match[3]].map((m)=> {return parseInt(m)-1});
          diagnostics.push(new vscode.Diagnostic(new vscode.Range(line, col, line, eCol),error.substring(0,error.indexOf('@')),vscode.DiagnosticSeverity.Error));
        }
        this.diagnosticCollection.set(doc.uri, diagnostics);
      }
    }
  }
}

