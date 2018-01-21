/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { BacklogEngine } from './backlogEngine';
import { MarkdownEngine } from './markdownEngine';
import { ExtensionContentSecurityPolicyArbiter, PreviewSecuritySelector } from './security';
import { Logger } from './logger';
import { CommandManager } from './commandManager';
import * as commands from './commands';
import { loadDefaultTelemetryReporter } from './telemetryReporter';
import { loadMarkdownExtensions } from './markdownExtensions';
import LinkProvider from './features/documentLinkProvider';
import MDDocumentSymbolProvider from './features/documentSymbolProvider';
import { MDDocumentContentProvider, getBacklogUri, isBacklogFile } from './features/previewContentProvider';


export function activate(context: vscode.ExtensionContext) {
	const telemetryReporter = loadDefaultTelemetryReporter();
	context.subscriptions.push(telemetryReporter);

	const cspArbiter = new ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
	const engine = new MarkdownEngine();
	const engineBacklog = new BacklogEngine();
	const logger = new Logger();

	const selector = 'backlog';

	const contentProvider = new MDDocumentContentProvider(engine, engineBacklog, context, cspArbiter, logger);
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(MDDocumentContentProvider.scheme, contentProvider));

	loadMarkdownExtensions(contentProvider, engine);

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, new MDDocumentSymbolProvider(engine)));
	context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(selector, new LinkProvider()));

	const previewSecuritySelector = new PreviewSecuritySelector(cspArbiter, contentProvider);

	const commandManager = new CommandManager();
	context.subscriptions.push(commandManager);
	commandManager.register(new commands.ShowPreviewCommand(cspArbiter, telemetryReporter));
	commandManager.register(new commands.ShowPreviewToSideCommand(cspArbiter, telemetryReporter));
	commandManager.register(new commands.ShowSourceCommand());
	commandManager.register(new commands.RefreshPreviewCommand(contentProvider));
	commandManager.register(new commands.RevealLineCommand(logger));
	commandManager.register(new commands.MoveCursorToPositionCommand());
	commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector));
	commandManager.register(new commands.OnPreviewStyleLoadErrorCommand());
	commandManager.register(new commands.DidClickCommand());
	commandManager.register(new commands.OpenDocumentLinkCommand(engine));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
		if (isBacklogFile(document)) {
			const uri = getBacklogUri(document.uri);
			contentProvider.update(uri);
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
		if (isBacklogFile(event.document)) {
			const uri = getBacklogUri(event.document.uri);
			contentProvider.update(uri);
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
		logger.updateConfiguration();
		contentProvider.updateConfiguration();
	}));

	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
		if (isBacklogFile(event.textEditor.document)) {
			const backlogFile = getBacklogUri(event.textEditor.document.uri);
			logger.log('updatePreviewForSelection', { markdownFile: backlogFile.toString() });

			vscode.commands.executeCommand('_workbench.htmlPreview.postMessage',
				backlogFile,
				{
					line: event.selections[0].active.line
				});
		}
	}));
}
