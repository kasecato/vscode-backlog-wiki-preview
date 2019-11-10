import { Command } from '../commandManager';
import { MarkdownEngine } from '../markdownEngine';
import { SkinnyTextDocument } from '../tableOfContentsProvider';

export class RenderDocument implements Command {
	public readonly id = 'backlog.api.render';

	public constructor(
		private readonly engine: MarkdownEngine
	) { }

	public async execute(document: SkinnyTextDocument | string): Promise<string> {
		return this.engine.render(document);
	}
}
