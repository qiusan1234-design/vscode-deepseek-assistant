import * as vscode from 'vscode';

type StatusBarState = 'ready' | 'ingesting' | 'querying' | 'error' | 'server-on';

export class StatusBarManager {
  private item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.item.command = 'c1m.showStats';
    context.subscriptions.push(this.item);
    this.item.show();
  }

  update(state: StatusBarState): void {
    switch (state) {
      case 'ready':
        this.item.text = '$(database) C1M Ready';
        this.item.tooltip = 'Claude 1M Context Engine — Ready';
        this.item.backgroundColor = undefined;
        break;
      case 'ingesting':
        this.item.text = '$(sync~spin) C1M Ingesting...';
        this.item.tooltip = 'Ingesting documents...';
        this.item.backgroundColor = undefined;
        break;
      case 'querying':
        this.item.text = '$(sync~spin) C1M Querying...';
        this.item.tooltip = 'Querying knowledge base...';
        this.item.backgroundColor = undefined;
        break;
      case 'error':
        this.item.text = '$(error) C1M Error';
        this.item.tooltip = 'Click for details';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case 'server-on':
        this.item.text = '$(radio-tower) C1M Server On';
        this.item.tooltip = 'Local server is running';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
    }
  }
}
