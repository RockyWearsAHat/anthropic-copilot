// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { addGhostText, closeGhostText } from "./ghostText";

const apiKey = "sk-***";

const anthropic = new Anthropic({
  apiKey
});

const generateCode = async (
  editor: vscode.TextEditor,
  prompt: string = "",
  fileCode: string = ""
) => {
  const fileType = vscode.window.activeTextEditor?.document.languageId;

  let systemPrompt = `VERY VERY IMPORTANT: MAKE IT PURE CODE, NO here you go, NO this is what it is, NO explination, NO how to run this code, 2ND VERY IMPORTANT: DO NOT WRAP IT IN A CODE TYPE \`\`\`languagename, IMPORTANT: JUST THE CODE, NO LANGUAGE, NO EXPLINATION, in language ${fileType}, ALSO IMPORTANT: DO NOT CHANGE WHAT TYPE THE CODE IS BEING WRITTEN IN, FOR A JS FILE DO NOT GENERATE TS, FOR IMPORTS DO NOT GENERATE REQUIRES, AND SO ON SO FOURTH FOR THE LANGUAGE BEING USED, TRY TO STAY WITHIN THE RULES THE CODER IS CODING IN`;

  if (fileCode != "") {
    const cursorPos = editor.selection.active;
    systemPrompt += ` suggest the best code/AUTOCOMPLETION you can think of for this file given the context, the user's cursor is at line ${
      cursorPos.line + 1
    } position ${
      cursorPos.character + 1
    }, the code is as follows: \n\n${fileCode}`;
  }

  console.log("Generating");
  const stream = anthropic.messages
    .stream({
      max_tokens: 4028,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "claude-3-opus-20240229"
    })
    .on("text", text => {
      console.log(text);
    });

  const message = await stream.finalMessage();

  if (message.stop_reason === "max_tokens") {
    console.log("Max tokens reached");
    return;
  }

  const fileContentSplit = fileCode.split("\n");
  let beginingFileContent = "";
  let endFileContent = "";
  fileContentSplit.forEach((line, index) => {
    if (index <= editor.selection.active.line)
      beginingFileContent += line + "\n";
    else if (index == editor.selection.active.line) {
      beginingFileContent += line.slice(
        0,
        editor.selection.active.character + 1
      );
      endFileContent +=
        line.slice(editor.selection.active.character + 1) + "\n";
    } else endFileContent += line + "\n";
  });

  let messageContent = "";
  message.content.forEach(async content => {
    messageContent += content.text + "\n";
  });

  console.log(messageContent);

  //Assemble
  let wholeFileContents = "";
  if (beginingFileContent.trim() != "")
    wholeFileContents += beginingFileContent.trim() + "\n\n";
  wholeFileContents += messageContent.trim() + "\n\n";
  if (endFileContent.trim() != "")
    wholeFileContents += endFileContent.trim() + "\n\n";

  wholeFileContents = wholeFileContents.trim() + "\n";

  console.log(wholeFileContents);

  fs.writeFileSync(
    vscode.window.activeTextEditor!.document.uri.fsPath,
    wholeFileContents
  );

  // console.log(
  //   beginingFileContent + "\n" + message.content[0].text + "\n" + endFileContent
  // );
};

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "anthropic-copilot.generateCode",
    async () => {
      const filePath = vscode.window.activeTextEditor?.document.uri.fsPath;
      const editor = vscode.window.activeTextEditor;
      if (!filePath || !editor) {
        return;
      }

      // await addGhostText(editor, "this is some text");

      const userInput = await vscode.window.showInputBox({
        prompt: "Enter your input"
      });
      if (!userInput) {
        return;
      }

      const message = await generateCode(
        editor,
        userInput,
        // "generate me a suggestion",
        fs.readFileSync(filePath, "utf8")
      );
    }
  );
  context.subscriptions.push(disposable);

  let closeGhostTextDisposable = vscode.commands.registerCommand(
    "anthropic-copilot.closeGhostText",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      await closeGhostText(editor);
    }
  );
  context.subscriptions.push(closeGhostTextDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
