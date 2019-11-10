import * as vscode from 'vscode';

export function isMarkdownFile(document: vscode.TextDocument) {
	return document.languageId === 'backlog';
}