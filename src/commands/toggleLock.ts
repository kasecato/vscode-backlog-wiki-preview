import { Command } from '../commandManager';
import { MarkdownPreviewManager } from '../features/previewManager';

export class ToggleLockCommand implements Command {
	public readonly id = 'backlog.preview.toggleLock';

	public constructor(
		private readonly previewManager: MarkdownPreviewManager
	) { }

	public execute() {
		this.previewManager.toggleLock();
	}
}