import { getSettings } from './settings';

export interface MessagePoster {
	/**
	 * Post a message to the backlog extension
	 */
	postMessage(type: string, body: object): void;
}

export const createPosterForVsCode = (vscode: any) => {
	return new class implements MessagePoster {
		postMessage(type: string, body: object): void {
			vscode.postMessage({
				type,
				source: getSettings().source,
				body
			});
		}
	};
};

