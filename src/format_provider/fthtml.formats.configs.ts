'use strict';
import { workspace } from "vscode";
import { FTHTMLConfigs } from "../fthtml.configs";

export class FTHTMLFormattingConfigs extends FTHTMLConfigs {
  readonly braces: any;
  readonly isAutoClosingBraces: boolean;

  constructor() {
    super();

    this.braces = {
      newLinesOnEnter: this._.get('format.braces.newLinesOnEnter', true),
      newLinesOnEnterAfterEmbeddedLangs: this._.get('format.braces.newLinesOnEnterAfterEmbeddedLanguage', false),
      newLinesOnEnterAfterAttributes: this._.get('format.braces.newLinesOnEnterAfterAttributes', false)
    };

    this.isAutoClosingBraces = workspace.getConfiguration('editor',null).get('autoClosingBrackets') !== 'never';
  }
}