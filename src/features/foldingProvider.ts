import { Token } from 'markdown-it';
import * as vscode from 'vscode';
import { MarkdownEngine } from '../markdownEngine';
import { TableOfContentsProvider } from '../tableOfContentsProvider';
import { flatten } from '../util/arrays';

const rangeLimit = 5000;

const isStartRegion = (t: string) => /^\s*<!--\s*#?region\b.*-->/.test(t);
const isEndRegion = (t: string) => /^\s*<!--\s*#?endregion\b.*-->/.test(t);

const isRegionMarker = (token: Token) =>
	token.type === 'html_block' && (isStartRegion(token.content) || isEndRegion(token.content));

export default class MarkdownFoldingProvider implements vscode.FoldingRangeProvider {

	constructor(
		private readonly engine: MarkdownEngine
	) { }

	public async provideFoldingRanges(
		document: vscode.TextDocument,
		_: vscode.FoldingContext,
		_token: vscode.CancellationToken
	): Promise<vscode.FoldingRange[]> {
		const foldables = await Promise.all([
			this.getRegions(document),
			this.getHeaderFoldingRanges(document),
			this.getBlockFoldingRanges(document)
		]);
		return flatten(foldables).slice(0, rangeLimit);
	}

	private async getRegions(document: vscode.TextDocument): Promise<vscode.FoldingRange[]> {
		const tokens = await this.engine.parse(document);
		const regionMarkers = tokens.filter(isRegionMarker)
			.map(token => ({ line: token.map[0], isStart: isStartRegion(token.content) }));

		const nestingStack: { line: number, isStart: boolean }[] = [];
		return regionMarkers
			.map(marker => {
				if (marker.isStart) {
					nestingStack.push(marker);
				} else if (nestingStack.length && nestingStack[nestingStack.length - 1].isStart) {
					return new vscode.FoldingRange(nestingStack.pop()!.line, marker.line, vscode.FoldingRangeKind.Region);
				} else {
					// noop: invalid nesting (i.e. [end, start] or [start, end, end])
				}
				return null;
			})
			.filter((region: vscode.FoldingRange | null): region is vscode.FoldingRange => !!region);
	}

	private async getHeaderFoldingRanges(document: vscode.TextDocument) {
		const tocProvider = new TableOfContentsProvider(this.engine, document);
		const toc = await tocProvider.getToc();
		return toc.map(entry => {
			let endLine = entry.location.range.end.line;
			if (document.lineAt(endLine).isEmptyOrWhitespace && endLine >= entry.line + 1) {
				endLine = endLine - 1;
			}
			return new vscode.FoldingRange(entry.line, endLine);
		});
	}

	private async getBlockFoldingRanges(document: vscode.TextDocument): Promise<vscode.FoldingRange[]> {

		const isFoldableToken = (token: Token): boolean => {
			switch (token.type) {
				case 'fence':
				case 'list_item_open':
					return token.map[1] > token.map[0];

				case 'html_block':
					return token.map[1] > token.map[0] + 1;

				default:
					return false;
			}
		};

		const tokens = await this.engine.parse(document);
		const multiLineListItems = tokens.filter(isFoldableToken);
		return multiLineListItems.map(listItem => {
			const start = listItem.map[0];
			let end = listItem.map[1] - 1;
			if (document.lineAt(end).isEmptyOrWhitespace && end >= start + 1) {
				end = end - 1;
			}
			return new vscode.FoldingRange(start, end);
		});
	}
}
