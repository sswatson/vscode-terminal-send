
# Terminal Send

This is a very simple extension that makes it easy to send blocks of text to the Terminal. This setup turns any REPL into an incremental file execution environment.

Similar functionality exists for language-specific VS Code extensions, but this extension is language-agnostic.

## Basic Usage

Begin by opening a new Terminal in VS Code and preparing the environment to receive commands from an editor. This might involve starting a REPL. For example, to start a Python REPL, you might run `python3` in the terminal.

Finally, select the command "Terminal Send: Send Selection to Terminal" from the command palette. This will send the selected text to the terminal, and it will execute the text in the terminal. This command is also available using the keyboard shortcut `shift+enter`.

## Advanced Usage

The extension associates each editor with a specific terminal, so that you send code from different editors to different terminals. If you want to change this assignment, you can use the command "Terminal Send: Set Terminal for Current Editor" from the command palette.