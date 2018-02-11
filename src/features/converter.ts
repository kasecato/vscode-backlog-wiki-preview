import * as vscode from 'vscode';
import * as path from 'path';

import { BacklogEngine } from '../backlogEngine';

export class Converter {

	public constructor(
		private readonly engine: BacklogEngine
	) { }

	public async convertBacklogToMarkdown() {

		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}

		try {
			const doc = editor.document;
			const parsedFilePath = path.parse(doc.fileName);
			let documentText: string = doc.getText();
			await this.createFileWithUniqueName(parsedFilePath, "md", documentText);
		} catch (err) {
			console.log(err);
		}
	}

	private async createFileWithUniqueName(parsedFilePath: path.ParsedPath, extension: string, documentText: string): Promise<void> {
		const matchingFiles = await vscode.workspace.findFiles("**/" + parsedFilePath.name + "*." + extension);
		let paths = matchingFiles.map(p => p.fsPath);

		const editorWindows = vscode.window.visibleTextEditors.map(x => x.document.fileName);
		paths = paths.concat(editorWindows);

		let newFilePath = path.join(parsedFilePath.dir, './' + parsedFilePath.name + '.' + extension);
		if (matchingFiles.length !== 0) {
			let counter = 1;
			while (paths.indexOf(newFilePath) >= 0) {
				newFilePath = path.join(parsedFilePath.dir, './' + parsedFilePath.name + '(' + counter + ').' + extension);
				counter++;
			}
		}
		this.openEditor(documentText, newFilePath, false);
	}

	private async openEditor(documentText: string, path: string, exists: boolean) {
		const uri = this.uriFor(path, exists);
		const doc = await vscode.workspace.openTextDocument(uri);
		const editor = await vscode.window.showTextDocument(doc);
		const parsed = await this.engine.render(documentText);
		return editor.edit((edit) => {
			if (!parsed) {
				console.log("Could not parse source");
				return;
			}
			edit.insert(new vscode.Position(0, 0), parsed);
		});
	}

	private uriFor(filePath: string, existing: boolean): vscode.Uri {
		if (existing) {
			return vscode.Uri.file(filePath);
		}
		return vscode.Uri.parse("untitled:" + filePath);
	}

}