import * as vscode from 'vscode';
import { CommandManager } from './commandManager';
import * as commands from './commands/index';
import LinkProvider from './features/documentLinkProvider';
import MDDocumentSymbolProvider from './features/documentSymbolProvider';
import MarkdownFoldingProvider from './features/foldingProvider';
import { MarkdownContentProvider } from './features/previewContentProvider';
import { MarkdownPreviewManager } from './features/previewManager';
import MarkdownWorkspaceSymbolProvider from './features/workspaceSymbolProvider';
import { Logger } from './logger';
import { MarkdownEngine } from './markdownEngine';
import { getMarkdownExtensionContributions } from './markdownExtensions';
import { ExtensionContentSecurityPolicyArbiter, PreviewSecuritySelector, ContentSecurityPolicyArbiter } from './security';
import { loadDefaultTelemetryReporter, TelemetryReporter } from './telemetryReporter';
import { githubSlugifier } from './slugify';
import { BacklogEngine } from './backlogEngine';


export function activate(context: vscode.ExtensionContext) {
	const telemetryReporter = loadDefaultTelemetryReporter();
	context.subscriptions.push(telemetryReporter);

	const contributions = getMarkdownExtensionContributions(context);
	context.subscriptions.push(contributions);

	const cspArbiter = new ExtensionContentSecurityPolicyArbiter(context.globalState, context.workspaceState);
	const engine = new MarkdownEngine(contributions, githubSlugifier);
	const backlogEngine = new BacklogEngine();
	const logger = new Logger();

	const contentProvider = new MarkdownContentProvider(engine, context, cspArbiter, contributions, logger);
	const symbolProvider = new MDDocumentSymbolProvider(engine);
	const previewManager = new MarkdownPreviewManager(contentProvider, logger, contributions);
	context.subscriptions.push(previewManager);

	context.subscriptions.push(registerMarkdownLanguageFeatures(symbolProvider, engine));
	context.subscriptions.push(registerMarkdownCommands(previewManager, telemetryReporter, cspArbiter, engine, backlogEngine));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
		logger.updateConfiguration();
		previewManager.updateConfiguration();
	}));
}

function registerMarkdownLanguageFeatures(
	symbolProvider: MDDocumentSymbolProvider,
	engine: MarkdownEngine
): vscode.Disposable {
	const selector: vscode.DocumentSelector = [
		{ language: 'backlog', scheme: 'file' },
		{ language: 'backlog', scheme: 'untitled' }
	];

	return vscode.Disposable.from(
		vscode.languages.setLanguageConfiguration('backlog', {
			wordPattern: new RegExp('(\\p{Alphabetic}|\\p{Number}|\\p{Nonspacing_Mark})+', 'ug'),
		}),
		vscode.languages.registerDocumentSymbolProvider(selector, symbolProvider),
		vscode.languages.registerDocumentLinkProvider(selector, new LinkProvider()),
		vscode.languages.registerFoldingRangeProvider(selector, new MarkdownFoldingProvider(engine)),
		vscode.languages.registerWorkspaceSymbolProvider(new MarkdownWorkspaceSymbolProvider(symbolProvider))
	);
}

function registerMarkdownCommands(
	previewManager: MarkdownPreviewManager,
	telemetryReporter: TelemetryReporter,
	cspArbiter: ContentSecurityPolicyArbiter,
	engine: MarkdownEngine,
	backlogEngine: BacklogEngine
): vscode.Disposable {
	const previewSecuritySelector = new PreviewSecuritySelector(cspArbiter, previewManager);

	const commandManager = new CommandManager();
	commandManager.register(new commands.ShowPreviewCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowPreviewToSideCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowLockedPreviewToSideCommand(previewManager, telemetryReporter));
	commandManager.register(new commands.ShowSourceCommand(previewManager));
	commandManager.register(new commands.RefreshPreviewCommand(previewManager, engine));
	commandManager.register(new commands.MoveCursorToPositionCommand());
	commandManager.register(new commands.ShowPreviewSecuritySelectorCommand(previewSecuritySelector, previewManager));
	commandManager.register(new commands.OpenDocumentLinkCommand(engine));
	commandManager.register(new commands.ToggleLockCommand(previewManager));
	commandManager.register(new commands.RenderDocument(engine));
	commandManager.register(new commands.ConvertToMarkdownCommand(backlogEngine));
	return commandManager;
}

