export class BacklogEngine {

	public async render(text: string): Promise<string> {

		const backlogWiki2Markdown = [
			this.header,
			this.italic,
			this.bold,
			this.strike,
			this.colorHex,
			this.colorName,
			this.url,
			this.listUnnumbered,
			this.listNumbered,
			this.tableWithHeader,
			this.quote,
			this.quoteMark,
			this.codeMark,
			this.subversion,
			this.git,
			this.contents,
			this.cacoo,
			this.cacooTheme,
			this.cacooSheet,
			this.image,
			this.imageAttachedNum,
			this.imageAttachedName,
			this.thumbnail,
			this.thumbnailAttachedNum,
			this.thumbnailAttachedName,
			this.attach,
		];

		return backlogWiki2Markdown
			.reduce((v: string, fn: Function) => fn(v), text);
	}

	private header = (text: string) => {
		return text.replace(
			/(^|\n)(\*{1,6})(\s*?)/g,
			(_, breaker: string, header: string, spaces: string) =>
				(breaker ? breaker : "") +
				"#".repeat(header.length) +
				(spaces ? spaces : " "));
	}

	private italic = (text: string) => {
		return text.replace(
			/[']{3}(.*?)[']{3}/g,
			"*$1*");
	}

	private bold = (text: string) => {
		return text.replace(
			/[']{2}(.*?)[']{2}/g,
			"**$1**");
	}

	private strike = (text: string) => {
		return text.replace(
			/[%]{2}(.*?)[%]{2}/g,
			"~~$1~~");
	}

	private colorHex = (text: string) => {
		return text.replace(
			/&color\([ \t]*(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))[ \t]*\)[ \t]*\{(.*?)\}/g,
			"<span style='color:$1'>$2</span>");
	}

	private colorName = (text: string) => {
		return text.replace(
			/&color\([ \t]*(aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow)[ \t]*\)[ \t]*\{(.*?)\}/g,
			"<span style='color:$1'>$2</span>");
	}

	private url = (text: string) => {
		return text.replace(
			/\[\[(.*?)(?:[>:])((?:https?|ftp):\/\/.*?)\]\]/g,
			"[$1]($2)");
	}

	private listUnnumbered = (text: string) => {
		return text.replace(
			/(^|\n)([-]+)(\s*?)/g,
			(_, breaker: string, list: string, spaces: string) =>
				(breaker ? breaker : "") +
				"\t".repeat(list.length - 1) +
				"-" +
				(spaces ? spaces : " "));
	}

	private listNumbered = (text: string) => {
		return text.replace(
			/(^|\n)([+]+)(\s*?)/g,
			(_, breaker: string, list: string, spaces: string) =>
				(breaker ? breaker : "") +
				"\t".repeat(list.length - 1) +
				"1." +
				(spaces ? spaces : " "));
	}

	private tableWithHeader = (text: string) => {
		return text.replace(
			/(^|\n)(\|.+?\|)h($|\n)/g,
			(_, breakStart: string, header: string, breakEnd: string) =>
				(breakStart ? breakStart : "") +
				header + "\n" +
				"|--".repeat(header.split(/\|/g).length - 2) + "|" +
				(breakEnd ? breakEnd : ""));
	}

	private quote = (text: string) => {
		return text.replace(
			/(^|\n)(>)(\s*?)/g,
			(_, breaker: string, quote: string, spaces: string) =>
				(breaker ? breaker : "") +
				quote +
				(spaces ? spaces : " "));
	}

	private quoteMark = (text: string) => {
		return text.replace(
			/(^|\n)\{quote\}\n([\s\S]*?)\n\{\/quote\}(\n)?/g,
			(_, breakStart: string, quote: string, breakEnd: string) =>
				(breakStart ? breakStart : "") +
				"\n" +
				"> " + quote +
				"\n" +
				(breakEnd ? breakEnd : ""));
	}

	private codeMark = (text: string) => {
		return text.replace(
			/(^|\n)\{code\}\n([\s\S]*?)\n\{\/code\}(\n)?/g,
			(_, breakStart: string, code: string, breakEnd: string) =>
				(breakStart ? breakStart : "") +
				"```\n" +
				code +
				"\n```" +
				(breakEnd ? breakEnd : ""));
	}

	private subversion = (text: string) => {
		return text.replace(
			/#rev\(([0-9]+)\)/g,
			"[r$1]()"); // TODO: link resolver
	}

	private git = (text: string) => {
		return text.replace(
			/#rev\(([a-zA-Z0-9.-]+:[a-fA-F0-9]{10})\)/g,
			"[$1]()"); // TODO: link resolver
	}

	private contents = (text: string) => {
		return text.replace(
			/(^|\n)(#contents)(\n)/g,
			(_, breakStart: string, contents: string, breakEnd: string) =>
				(breakStart ? breakStart : "") +
				contents + " (not available) " + // TODO: contets resolver
				breakEnd);
	}

	private cacoo = (text: string) => {
		return text.replace(
			/#cacoo\((\S+?),([0-9]+),([0-9]+)\)/g,
			"[c-$2-$3]()");
	}

	private cacooTheme = (text: string) => {
		return text.replace(
			/#cacoo\((\S+?),([0-9]+),([0-9]+),(\S+?)\)/g,
			"[c-$2-$3-$4]()");
	}

	private cacooSheet = (text: string) => {
		return text.replace(
			/#cacoo\((\S+?),([0-9]+),([0-9]+),(\S+?)\),([0-9]+)/g,
			"[c-$2-$3-$4-$5]()");
	}

	private image = (text: string) => {
		return text.replace(
			/#image\((https?:\/\/\S+?)\)/g,
			"![]($1)");
	}

	private imageAttachedNum = (text: string) => {
		return text.replace(
			/#image\(([0-9]+)\)/g,
			"![i$1]()"); // TODO: link resolver
	}

	private imageAttachedName = (text: string) => {
		return text.replace(
			/#image\((\S+?)\)/g,
			"![i-$1]()"); // TODO: link resolver
	}

	private thumbnail = (text: string) => {
		return text.replace(
			/#thumbnail\((https?:\/\/\S+?)\)/g,
			"![]($1)");
	}

	private thumbnailAttachedNum = (text: string) => {
		return text.replace(
			/#thumbnail\(([0-9]+)\)/g,
			"![t$1]()"); // TODO: link resolver
	}

	private thumbnailAttachedName = (text: string) => {
		return text.replace(
			/#thumbnail\((\S+?)\)/g,
			"![t-$1]()"); // TODO: link resolver
	}

	private attach = (text: string) => {
		return text.replace(
			/#attach\(([\s\S]+?):([0-9]+)\)/g,
			"[$1]()"); // TODO: link resolver
	}

}