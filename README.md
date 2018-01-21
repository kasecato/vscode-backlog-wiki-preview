# VS Code for Backlog Wiki Preview

You just start writing [Backlog](https://backlog.com/) wiki, save the file with the `.bl`, `biki` or `.backlog` extension and then you can toggle the visualization of the editor between the code and the preview of the Backlog file. To switch between views, press `⇧⌘V` in the editor. You can view the preview side-by-side (`⌘K V`) with the file you are editing and see changes reflected in real-time as you edit.

![](https://github.com/kasecato/vscode-backlog-wiki-preview/blob/master/images/vscode-backlog-wiki-preview.gif)

> Tip: You can also right-click on the editor Tab and select **Open Preview** or use the **Command Palette** (`⇧⌘P`) **Backlog: Open Preview** and **Backlog: Open Preview to the Side** commands.


## Usage

Rule | Source | Result | Preview | Hightlight | Snippet
-----|--------|--------|---------|------------|--------
Link to an issue| BLG-95,[[BLG-98]] | BLG-95,[[BLG-98]] | □ | □ | □ 
Link to a wiki page| [[WikiPageName]] | [[WikiPageName]] | □ | □ | □ 
Bold   | ''Bold''     | **Bold**   | ✅ | ✅ | ✅ |
Italic | '''Italic''' | *Italic*   | ✅ | ✅ | ✅ |
Strike | %%Strike%%   | ~~Strike~~ | ✅ | ✅ | ✅ |
Color | &color(#f00) { Color } | <span style="color:#f00">Color</span> | ✅ | ✅ | □ |
Color | &color(red) { Color }  | <span style="color:red">Color</span>  | ✅ | ✅ | ✅ |
Color | &color(#ffffff, #abd500) { Color } | <span style="color:#ffffff;background-color:#abd500">Color</span> | □ | □ | □ |
URL | http://www.backlog.jp/ | http://www.backlog.jp/ |  ✅ | ✅ | □ |
URL | [[Backlog>http://www.backlog.jp/]] | [Backlog](http://www.backlog.jp/) | ✅ | ✅ | □ |
URL | [[Backlog:http://www.backlog.jp/]] | [Backlog](http://www.backlog.jp/) | ✅ | ✅ | ✅ |
Header | * Header1<br/>** Header2<br/>*** Header3 | <h1>Header1</h1><h2>Header2</h2><h3>Header3</h3> | ✅ | ✅ | ✅ |
Bulleted List | - Item-A<br/>- Item-B<br/>-- Item-B-1<br/>--- Item-B-2-a | <ul><li>Item-A</li><li>Item-B<ul><li>Item-B-1</li><ul><li>Item-B-2-a</li></ul></ul></li></ul> | ✅ | ✅ | ✅ |
Numbered List | + Item-A<br/>+ Item-B<br/>+ Item-C | <ol type="1"><li>Item-A</li><li>Item-B<li>Item-C</li></ol> | ✅ | ✅ | ✅ |
Table | \| A \| B \| C \|<br/>\|a\|b\|c\| | | □ | □ | □ 
Table | \|A\|B\|C\|h<br/>\|a\|b\|c\|<br/>\|e\|f\|g\| | | □ | □ | □ 
Table | \|~No.1\|aaa\|bbb\|<br/>\|~No.2\|ccc\|ddd\| | | □ | □ | □ 
Quote | >Quote<br/>>This is a paragraph | <blockquote>Quote<br/>This is a paragraph</blockquote> | ✅ | ✅ | ✅ |
Quote | {quote}<br/>Quote<br/>This is a paragraph<br/>{/quote} | <blockquote>Quote<br/>This is a paragraph</blockquote> | ✅ | ✅ | □ |
Code Macro | {code}<br/>package helloworld;<br/>public class Hello {<br/>&nbsp;&nbsp;public String sayHello {<br/>&nbsp;&nbsp;&nbsp;&nbsp;return "Hello";<br/>&nbsp;&nbsp;}<br/>}<br/>{/code} | | ✅ | ✅ | ✅ |
Link to a Subversion Revision | #rev(11) | [r11]() | □ | ✅ | ✅ |
Link to a Git Revision | #rev(app:abcdeabcde) | [app:abcdeabcde]() | □ | ✅ | ✅ |
Table of Contents | #contents | #contents | □ | ✅ | ✅ |
Break | aaa&br;bbb | aaa&br;bbb | □ | ✅ | ✅ |
Cacoo diagram (Viewer) | #cacoo([path],[width],[height]) | [c-width-height]() | □ | ✅ | □ |
Cacoo diagram (Viewer) | #cacoo([path],[width],[height],[theme]) | [c-width-height-theme]() | □ | ✅ | □ |
Cacoo diagram (Viewer) | #cacoo([path],[width],[height],[theme],[sheetNo]) | [c-width-height-theme-sheetNo]() | □ | ✅ | □ |
Insert an image (from other website) | #image(https://www.backlog.jp/img/common/header/logo_site.png) | ![](https://www.backlog.jp/img/common/header/logo_site.png) | ✅ | ✅ | ✅ |
Show attached image file | #image(11) | [i11]() | □ | ✅ | □ |
Show attached image file | #image(nulab.gif) | [i-nulab.gif]() | □ | ✅ | □ |
Insert a thumbnail (from other website) | #thumbnail(https://www.backlog.jp/img/common/header/logo_site.png) | ![](https://www.backlog.jp/img/common/header/logo_site.png) |  ✅ | ✅ | ✅ |
Display thumbnail of attached image file | #thumbnail(11) | [t11]() | □ | ✅ | □ |
Display thumbnail of attached image file | #thumbnail(nulab.gif) | [t-nulab.gif]() | □ | ✅ | □ |
Show link to attached file | #attach(sample.zip:11) | [sample.zip]() | □ | ✅ | □ |
Escape a special letter | \\%\\%Not Striked\\%\\% | \\%\\%Not Striked\\%\\% | □ | □ | □ |


## Options

```json
{
    // Double click in the backlog preview to switch to the editor.
    "backlog.preview.doubleClickToSwitchToEditor": true,

    // Controls the font family used in the backlog preview.
    "backlog.preview.fontFamily": "-apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', 'HelveticaNeue-Light', 'Ubuntu', 'Droid Sans', sans-serif",

    // Controls the font size in pixels used in the backlog preview.
    "backlog.preview.fontSize": 14,

    // Controls the line height used in the backlog preview. This number is relative to the font size.
    "backlog.preview.lineHeight": 1.6,

    // Mark the current editor selection in the backlog preview.
    "backlog.preview.markEditorSelection": true,

    // When the backlog preview is scrolled, update the view of the editor.
    "backlog.preview.scrollEditorWithPreview": true,

    // Scrolls the backlog preview to reveal the currently selected line from the editor.
    "backlog.preview.scrollPreviewWithEditorSelection": true,

    // Sets how YAML front matter should be rendered in the backlog preview. 'hide' removes the front matter. Otherwise, the front matter is treated as backlog content.
    "backlog.previewFrontMatter": "hide",

    // A list of URLs or local paths to CSS style sheets to use from the backlog preview. Relative paths are interpreted relative to the folder open in the explorer. If there is no open folder, they are interpreted relative to the location of the backlog file. All '\' need to be written as '\\'.
    "backlog.styles": [],

    // Enable debug logging for the backlog extension.
    "backlog.trace": "off"
}
```


## Known Issues

- Table notation is not yet supported
- Not yet compatible with escape
- Markdown notation is previewed
- Some syntax that can not be converted with backlog is highlighted
- Links that can not be created without logging in the backlog are not supported


## References

- GitHub, "Visual Studio Code," https://github.com/Microsoft/vscode
- Visual Studio Code, "Markdown and VS Code," https://code.visualstudio.com/docs/languages/markdown
- Backlog, "Our Logos," https://nulab-inc.com/about/logo/
