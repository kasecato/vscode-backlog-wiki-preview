import * as vscode from 'vscode';
import { Command } from '../commandManager';
import { MarkdownPreviewManager } from '../features/previewManager';

export class ShowSourceCommand implements Command {
	public readonly id = 'backlog.showSource';

	public constructor(
		private readonly previewManager: MarkdownPreviewManager
	) { }

	public execute() {
		const { activePreviewResource, activePreviewResourceColumn } = this.previewManager;
		if (activePreviewResource && activePreviewResourceColumn) {
			return vscode.workspace.openTextDocument(activePreviewResource).then(document => {
				vscode.window.showTextDocument(document, activePreviewResourceColumn);
			});
		}
		return undefined;
	}
}