import * as vscode from "vscode";

export let createdGhostText: vscode.TextEditorDecorationType | undefined;

export async function setGhostTextCreatedContext(value: boolean) {
  const config = vscode.workspace.getConfiguration("anthropic-copilot");
  await config.update("ghostTextCreated", value);
}

export function getGhostTextCreatedContext() {
  const config = vscode.workspace.getConfiguration("anthropic-copilot");
  config.get("ghostTextCreated", false);
}

export async function addGhostText(
  editor: vscode.TextEditor,
  ghostText: string
) {
  const cursorPos = editor.selection.active;
  const startPosition = new vscode.Position(
    cursorPos.line + 1,
    cursorPos.character + 1
  );
  const endPosition = new vscode.Position(cursorPos.line + 1, ghostText.length);
  const range = new vscode.Range(startPosition, endPosition);

  let ghostDecorationType = vscode.window.createTextEditorDecorationType({
    before: {
      contentText: ghostText,
      color: "#777"
    }
  });

  let ghostDecoration = {
    range: range,
    renderOptions: {
      before: {
        contentText: ghostText
      }
    }
  };

  // Apply decoration
  editor.setDecorations(ghostDecorationType, [ghostDecoration]);
  createdGhostText = ghostDecorationType;
  await setGhostTextCreatedContext(true);

  console.log(
    await vscode.workspace
      .getConfiguration("anthropic-copilot")
      .get("ghostTextCreated")
  );

  // Listen for text changes and update the decoration accordingly
  vscode.workspace.onDidChangeTextDocument(async event => {
    if (event.document === editor.document) {
      editor.setDecorations(ghostDecorationType, []);
      createdGhostText = undefined;
      await setGhostTextCreatedContext(false);
    }
  });

  vscode.window.onDidChangeTextEditorSelection(async event => {
    if (event.textEditor === editor) {
      editor.setDecorations(ghostDecorationType, []);
      createdGhostText = undefined;
      await setGhostTextCreatedContext(false);
    }
  });
}

export async function closeGhostText(editor: vscode.TextEditor) {
  if (!createdGhostText) return;

  editor.setDecorations(createdGhostText, []);
  await setGhostTextCreatedContext(false);
}
