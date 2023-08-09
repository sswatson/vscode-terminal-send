import * as vscode from "vscode";

class EditorToTerminal {
  public map = new Map<string, vscode.Terminal>();

  private key(editor: vscode.TextEditor) {
    return editor.document.uri.toString();
  }

  set(editor: vscode.TextEditor, terminal: vscode.Terminal) {
    const key = this.key(editor);
    this.map.set(key, terminal);
  }

  get(editor: vscode.TextEditor) {
    const key = this.key(editor);
    return this.map.get(key);
  }

  delete(editor: vscode.TextEditor) {
    const key = this.key(editor);
    this.map.delete(key);
  }

  terminals() {
    return Array.from(this.map.values());
  }

  lastTerminal() {
    return this.terminals().at(-1);
  }
}

let editorToTerminal = new EditorToTerminal();

export function activate(context: vscode.ExtensionContext) {
  markExtensionActive(true);
  
  vscode.workspace
    .getConfiguration()
    .update(
      "terminalSend.template",
      ""
    );

  function wrapTemplate(text: string) {
    const template = vscode.workspace
      .getConfiguration()
      .get("terminalSend.template") as string;
    if (!template) return text;
    return template.replace("{}", text);
  }

  let sendCommandDisposable = vscode.commands.registerCommand(
    "terminalSend.sendSelection",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }

      let selection = editor.selection;
      let text = editor.document.getText(selection);

      if (!text) {
        const selection = findBlock(editor);
        text = editor.document.getText(selection);
        editor.selection = selection;
      }

      const terminal =
        editorToTerminal.get(editor) 
        ?? vscode.window.activeTerminal
        ?? (editorToTerminal.lastTerminal() as vscode.Terminal);

      if (!terminal) {
        vscode.window.showErrorMessage("No active terminal");
        return;
      }

      editorToTerminal.set(editor, terminal);

      terminal.sendText(wrapTemplate(dedent(text)), true);
      terminal.show();
      setTimeout(() => {
        if (editor) {
          vscode.window.showTextDocument(editor.document, editor.viewColumn);
        }
      }, 200);
    }
  );

  let setEditorDisposable = vscode.commands.registerCommand(
    "terminalSend.setTerminal",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor");
        return;
      }
      const terminals = vscode.window.terminals;
      if (!terminals.length) {
        vscode.window.showErrorMessage("No active terminal");
        return;
      }
      const terminalName = await vscode.window.showQuickPick(
        terminals.map((term) => term.name)
      );
      if (!terminalName) return;
      const terminal = terminals.find((term) => term.name == terminalName);
      if (terminal) {
        editorToTerminal.set(editor, terminal);
        terminal.show();
      }
    }
  );

  let configureTemplateDisposable = vscode.commands.registerCommand(
    "terminalSend.configureTemplate",
    async () => {
      const template = await vscode.window.showInputBox({
        placeHolder: "Enter template, using {} as placeholder for selected text",
        value: vscode.workspace
          .getConfiguration()
          .get("terminalSend.template"),
      });
      if (typeof template === "string") {
        vscode.workspace
          .getConfiguration()
          .update(
            "terminalSend.template",
            template,
          );
      }
    }
  );

  const terminalCloseHook = vscode.window.onDidCloseTerminal((terminal) => {
    for (let [editor, term] of editorToTerminal.map) {
      if (term === terminal) {
        editorToTerminal.map.delete(editor);
        break;
      }
    }
    if (!editorToTerminal.terminals().length) markExtensionActive(false);
  });

  context.subscriptions.push(
    sendCommandDisposable,
    setEditorDisposable,
    terminalCloseHook,
    configureTemplateDisposable,
  );
}

export function deactivate() {
  markExtensionActive(false);
}

function markExtensionActive(val: boolean) {
  vscode.workspace
    .getConfiguration()
    .update("terminalSend.isActive", val, vscode.ConfigurationTarget.Global);
}

function findBlock(editor: vscode.TextEditor) {
  const { active } = editor.selection;
  let start = active.line,
    end = active.line;
  // search forward to find a nonempty line
  while (
    start < editor.document.lineCount - 1 &&
    editor.document.lineAt(start).isEmptyOrWhitespace
  ) {
    start++;
    end++;
  }
  if (start === editor.document.lineCount - 1) {
    start = active.line;
    end = active.line;
    while (start > 0 && editor.document.lineAt(start).isEmptyOrWhitespace) {
      start--;
      end--;
    }
  }
  // then search backward to find the first empty line before that
  while (start > 0) {
    const line = editor.document.lineAt(start - 1);
    if (line.isEmptyOrWhitespace) {
      break;
    }
    start--;
  }
  // then search forward to find the last empty line after that
  while (end < editor.document.lineCount - 1) {
    const line = editor.document.lineAt(end + 1);
    if (line.isEmptyOrWhitespace) {
      break;
    }
    end++;
  }
  // trim fenced code block markers if necessary
  if (editor.document.lineAt(start).text.trim().startsWith("```")) {
    start++;
  }
  if (editor.document.lineAt(end).text.trim().startsWith("```")) {
    end--;
  }
  return new vscode.Selection(
    new vscode.Position(start, 0),
    new vscode.Position(end, editor.document.lineAt(end).text.length)
  );
}

function dedent(text: string) {
  let min = Infinity;
  for (let line of text.split("\n")) {
    if (!line.trim()) continue;
    const leadingSpaces = line.length - line.trimStart().length;
    if (leadingSpaces < min) min = leadingSpaces;
  }
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return "";
      return line.slice(min);
    })
    .join("\n");
}
