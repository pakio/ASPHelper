import * as vscode from 'vscode';
import { exists } from 'fs';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
		{ language: "vbscript" }, new VBSDocumentSymbolProvider()
	));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider(
		{ language: "vbscript" }, new VBSDefinitionProvider()
	));
}

class VBSDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
		return new Promise((resolve, reject) => {
			var symbols = [];
			var functionPrefix = [
				"function",
				"public function",
				"private function",
				"sub",
				"public sub",
				"private sub"
			];

			for (var i = 0; i < document.lineCount; i++) {
				var line = document.lineAt(i);
				var trimmedText = line.text.trim().toLowerCase();
				if (trimmedText.startsWith("class")) {
					symbols.push(new vscode.SymbolInformation(
						line.text.trim().split(" ").slice(1).join(),
						vscode.SymbolKind.Class,
						line.text.trim().split(" ").slice(1).join(),
						new vscode.Location(document.uri, line.range)
					));
					continue;
				}
				for (var prefix of functionPrefix) { 
					if (trimmedText.startsWith(prefix)) { 
						symbols.push(new vscode.SymbolInformation(
							line.text.replace(prefix, "").trim(),
							vscode.SymbolKind.Function,
							line.text.replace(prefix, "").trim(),
							new vscode.Location(document.uri, line.range)
						));
						continue;
					}
				}
			}

			resolve(symbols);
		});
	}
}

class VBSDefinitionProvider implements vscode.DefinitionProvider {
	public provideDefinition(document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken): Thenable<vscode.Definition> {
		return new Promise((resolve, reject) => {
			const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_]+/);
			if (!wordRange) {
				reject(['No word here.']);
				return;
			}

			const currentWord = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
			var functionPrefix = [
				"function",
				"sub"
			];
			var matchedLine = -1;
			for (var i = 0; i < document.lineCount; i++) {
				var line = document.lineAt(i);
				var trimmedText = line.text.trim().toLowerCase();
				for (var prefix of functionPrefix) {
					if (trimmedText.startsWith(prefix)) {
						var functionNameCandidate = trimmedText.split(" ").slice(1, 2).join(" ");
						if (functionNameCandidate.substr(0, currentWord.length) === currentWord.toLowerCase() && functionNameCandidate[currentWord.length] === "(") {
							matchedLine = i;
							break;
						}
					}
					if (trimmedText.startsWith("public " + prefix) || trimmedText.startsWith("private " + prefix)) {
						var functionNameCandidate = trimmedText.split(" ").slice(2, 3).join(" ");
						if (functionNameCandidate.substr(0, currentWord.length) === currentWord.toLowerCase() && functionNameCandidate[currentWord.length] === "(") {
							matchedLine = i;
							break;
						}
					}
				}
			}

			if (matchedLine < 0) {
				reject(['not matched']);
				return;
			}


			resolve(new vscode.Location(document.uri, new vscode.Position(matchedLine, 4)));
		});
	}
}

// this method is called when your extension is deactivated
export function deactivate() { }
