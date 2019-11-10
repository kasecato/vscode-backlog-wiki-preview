import * as crypto from 'crypto';
import * as path from 'path';
import { MarkdownIt, Token } from 'markdown-it';
import * as vscode from 'vscode';
import { MarkdownContributionProvider as MarkdownContributionProvider } from './markdownExtensions';
import { Slugifier } from './slugify';
import { SkinnyTextDocument } from './tableOfContentsProvider';
import { Schemes, isOfScheme } from './util/links';
import { BacklogEngine } from './backlogEngine';

const UNICODE_NEWLINE_REGEX = /\u2028|\u2029/g;

interface MarkdownItConfig {
	readonly breaks: boolean;
	readonly linkify: boolean;
}

class TokenCache {
	private cachedDocument?: {
		readonly uri: vscode.Uri;
		readonly version: number;
		readonly config: MarkdownItConfig;
	};
	private tokens?: Token[];

	public tryGetCached(document: SkinnyTextDocument, config: MarkdownItConfig): Token[] | undefined {
		if (this.cachedDocument
			&& this.cachedDocument.uri.toString() === document.uri.toString()
			&& this.cachedDocument.version === document.version
			&& this.cachedDocument.config.breaks === config.breaks
			&& this.cachedDocument.config.linkify === config.linkify
		) {
			return this.tokens;
		}
		return undefined;
	}

	public update(document: SkinnyTextDocument, config: MarkdownItConfig, tokens: Token[]) {
		this.cachedDocument = {
			uri: document.uri,
			version: document.version,
			config,
		};
		this.tokens = tokens;
	}

	public clean(): void {
		this.cachedDocument = undefined;
		this.tokens = undefined;
	}
}

export class MarkdownEngine {
	private md?: Promise<MarkdownIt>;
	private bl?: BacklogEngine;

	private currentDocument?: vscode.Uri;
	private _slugCount = new Map<string, number>();
	private _tokenCache = new TokenCache();

	public constructor(
		private readonly contributionProvider: MarkdownContributionProvider,
		private readonly slugifier: Slugifier,
	) {
		contributionProvider.onContributionsChanged(() => {
			// Markdown plugin contributions may have changed
			this.md = undefined;
		});
	}

	private async getEngine(config: MarkdownItConfig): Promise<MarkdownIt> {
		if (!this.md) {
			this.md = import('markdown-it').then(async markdownIt => {
				let md: MarkdownIt = markdownIt(await getMarkdownOptions(() => md));

				for (const plugin of this.contributionProvider.contributions.markdownItPlugins.values()) {
					try {
						md = (await plugin)(md);
					} catch {
						// noop
					}
				}

				const frontMatterPlugin = require('markdown-it-front-matter');
				// Extract rules from front matter plugin and apply at a lower precedence
				let fontMatterRule: any;
				frontMatterPlugin({
					block: {
						ruler: {
							before: (_id: any, _id2: any, rule: any) => { fontMatterRule = rule; }
						}
					}
				}, () => { /* noop */ });

				md.block.ruler.before('fence', 'front_matter', fontMatterRule, {
					alt: ['paragraph', 'reference', 'blockquote', 'list']
				});

				for (const renderName of ['paragraph_open', 'heading_open', 'image', 'code_block', 'fence', 'blockquote_open', 'list_item_open']) {
					this.addLineNumberRenderer(md, renderName);
				}

				for (const renderName of ['thead_open', 'tbody_open']) { // For backlog
					this.addLineNumberRenderer(md, renderName);
				}

				this.addImageStabilizer(md);
				this.addFencedRenderer(md);
				this.addLinkNormalizer(md);
				this.addLinkValidator(md);
				this.addNamedHeaders(md);
				this.addLinkRenderer(md);
				return md;
			});
		}

		const md = await this.md!;
		md.set(config);
		return md;
	}

	private getBacklogEngine(): BacklogEngine {
		if (!this.bl) {
			this.bl = new BacklogEngine();
		}

		return this.bl;
	}

	private async tokenizeDocument(
		document: SkinnyTextDocument,
		config: MarkdownItConfig,
		engine: MarkdownIt,
		backlogEngine: BacklogEngine
	): Promise<Token[]> {
		const cached = this._tokenCache.tryGetCached(document, config);
		if (cached) {
			return cached;
		}

		this.currentDocument = document.uri;
		this._slugCount = new Map<string, number>();

		const tokens = await this.tokenizeString(document.getText(), engine, backlogEngine);
		this._tokenCache.update(document, config, tokens);
		return tokens;
	}

	private async tokenizeString(text: string, engine: MarkdownIt, backlogEngine: BacklogEngine) {
		const backlogToMarkdownText = await backlogEngine.render(text);
		return engine.parse(backlogToMarkdownText.replace(UNICODE_NEWLINE_REGEX, ''), {});
	}

	public async render(input: SkinnyTextDocument | string): Promise<string> {
		const config = this.getConfig(typeof input === 'string' ? undefined : input.uri);
		const engine = await this.getEngine(config);
		const backlogEngine = this.getBacklogEngine();

		const tokens = typeof input === 'string'
			? await this.tokenizeString(input, engine, backlogEngine)
			: await this.tokenizeDocument(input, config, engine, backlogEngine);

		return engine.renderer.render(tokens, {
			...(engine as any).options,
			...config
		}, {});
	}

	public async parse(document: SkinnyTextDocument): Promise<Token[]> {
		const config = this.getConfig(document.uri);
		const engine = await this.getEngine(config);
		const backlogEngine = this.getBacklogEngine();
		return await this.tokenizeDocument(document, config, engine, backlogEngine);
	}

	public cleanCache(): void {
		this._tokenCache.clean();
	}

	private getConfig(resource?: vscode.Uri): MarkdownItConfig {
		const config = vscode.workspace.getConfiguration('backlog', resource);
		return {
			breaks: config.get<boolean>('preview.breaks', false),
			linkify: config.get<boolean>('preview.linkify', true)
		};
	}

	private addLineNumberRenderer(md: any, ruleName: string): void {
		const original = md.renderer.rules[ruleName];
		md.renderer.rules[ruleName] = (tokens: any, idx: number, options: any, env: any, self: any) => {
			const offset = this.getBacklog2MarkdownOffset(tokens, idx); // For backlog
			const token = tokens[idx];
			if (token.map && token.map.length) {
				// token.attrSet('data-line', token.map[0]);
				token.attrSet('data-line', (token.map[0] - offset).toString()); // For backlog
				token.attrJoin('class', 'code-line');
			}

			if (original) {
				return original(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	private addImageStabilizer(md: any): void {
		const original = md.renderer.rules.image;
		md.renderer.rules.image = (tokens: any, idx: number, options: any, env: any, self: any) => {
			const token = tokens[idx];
			token.attrJoin('class', 'loading');

			const src = token.attrGet('src');
			if (src) {
				const hash = crypto.createHash('sha256');
				hash.update(src);
				const imgHash = hash.digest('hex');
				token.attrSet('id', `image-hash-${imgHash}`);
			}

			if (original) {
				return original(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	private addFencedRenderer(md: any): void {
		const original = md.renderer.rules['fenced'];
		md.renderer.rules['fenced'] = (tokens: any, idx: number, options: any, env: any, self: any) => {
			const token = tokens[idx];
			if (token.map && token.map.length) {
				token.attrJoin('class', 'hljs');
			}

			return original(tokens, idx, options, env, self);
		};
	}

	private addLinkNormalizer(md: any): void {
		const normalizeLink = md.normalizeLink;
		md.normalizeLink = (link: string) => {
			try {
				// Normalize VS Code schemes to target the current version
				if (isOfScheme(Schemes.vscode, link) || isOfScheme(Schemes['vscode-insiders'], link)) {
					return normalizeLink(vscode.Uri.parse(link).with({ scheme: vscode.env.uriScheme }).toString());
				}

				// If original link doesn't look like a url with a scheme, assume it must be a link to a file in workspace
				if (!/^[a-z\-]+:/i.test(link)) {
					// Use a fake scheme for parsing
					let uri = vscode.Uri.parse('markdown-link:' + link);

					// Relative paths should be resolved correctly inside the preview but we need to
					// handle absolute paths specially (for images) to resolve them relative to the workspace root
					if (uri.path[0] === '/') {
						const root = vscode.workspace.getWorkspaceFolder(this.currentDocument!);
						if (root) {
							uri = uri.with({
								path: path.join(root.uri.fsPath, uri.path),
							});
						}
					}

					if (uri.fragment) {
						uri = uri.with({
							fragment: this.slugifier.fromHeading(uri.fragment).value
						});
					}
					return normalizeLink(uri.toString(true).replace(/^markdown-link:/, ''));
				}
			} catch (e) {
				// noop
			}
			return normalizeLink(link);
		};
	}

	private addLinkValidator(md: any): void {
		const validateLink = md.validateLink;
		md.validateLink = (link: string) => {
			// support file:// links
			return validateLink(link)
				|| isOfScheme(Schemes.file, link)
				|| isOfScheme(Schemes.vscode, link)
				|| isOfScheme(Schemes['vscode-insiders'], link)
				|| /^data:image\/.*?;/.test(link);
		};
	}

	private addNamedHeaders(md: any): void {
		const original = md.renderer.rules.heading_open;
		md.renderer.rules.heading_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
			const title = tokens[idx + 1].children.reduce((acc: string, t: any) => acc + t.content, '');
			let slug = this.slugifier.fromHeading(title);

			if (this._slugCount.has(slug.value)) {
				const count = this._slugCount.get(slug.value)!;
				this._slugCount.set(slug.value, count + 1);
				slug = this.slugifier.fromHeading(slug.value + '-' + (count + 1));
			} else {
				this._slugCount.set(slug.value, 0);
			}

			tokens[idx].attrs = tokens[idx].attrs || [];
			tokens[idx].attrs.push(['id', slug.value]);

			if (original) {
				return original(tokens, idx, options, env, self);
			} else {
				return self.renderToken(tokens, idx, options, env, self);
			}
		};
	}

	private addLinkRenderer(md: any): void {
		const old_render = md.renderer.rules.link_open || ((tokens: any, idx: number, options: any, _env: any, self: any) => {
			return self.renderToken(tokens, idx, options);
		});

		md.renderer.rules.link_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
			const token = tokens[idx];
			const hrefIndex = token.attrIndex('href');
			if (hrefIndex >= 0) {
				const href = token.attrs[hrefIndex][1];
				token.attrPush(['data-href', href]);
			}
			return old_render(tokens, idx, options, env, self);
		};
	}

	// For backlog
	private backlogOffsets: Map<string, number> = new Map([
		['table_open', 1]
	]);

	private getBacklog2MarkdownOffset(tokens: Array<Token>, idx: number): number {
		if (tokens.length === 0) {
			return 0;
		}
		return tokens.slice(0, idx - 1)
					.filter(token => this.backlogOffsets.has(token.type))
					.map(token => this.backlogOffsets.get(token.type) as number)
					.reduce((pv, cv) => pv + cv, 0);
	}
}

async function getMarkdownOptions(md: () => MarkdownIt) {
	const hljs = await import('highlight.js');
	return {
		html: true,
		highlight: (str: string, lang?: string) => {
			lang = normalizeHighlightLang(lang);
			if (lang && hljs.getLanguage(lang)) {
				try {
					return `<div>${hljs.highlight(lang, str, true).value}</div>`;
				}
				catch (error) { }
			}
			return `<code><div>${md().utils.escapeHtml(str)}</div></code>`;
		}
	};
}

function normalizeHighlightLang(lang: string | undefined) {
	switch (lang && lang.toLowerCase()) {
		case 'tsx':
		case 'typescriptreact':
			// Workaround for highlight not supporting tsx: https://github.com/isagalaev/highlight.js/issues/1155
			return 'jsx';

		case 'json5':
		case 'jsonc':
			return 'json';

		case 'c#':
		case 'csharp':
			return 'cs';

		default:
			return lang;
	}
}

