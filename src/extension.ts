import * as vscode from 'vscode';
import { exists } from 'fs';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
		{ language: "asp" }, new ASPDocumentSymbolProvider()
	));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider(
		{ language: "asp" }, new ASPDefinitionProvider()
	));
}

class ASPDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
		return new Promise((resolve, reject) => {
			var symbols = [];
			var functionSinglePrefix = [
				"function",
				"sub",
			];
			
			var functionDoublePrefix = [
				"public function",
				"private function",
				"public sub",
				"private sub"
			];

			for (var i = 0; i < document.lineCount; i++) {
				var line = document.lineAt(i);
				var trimmedText = line.text.trim().toLowerCase();
				if (trimmedText.startsWith("class")) {
					for (var j = i; j < document.lineCount; j++) { 
						var innerLine = document.lineAt(j);
						var trimmedInnerText = innerLine.text.trim().toLowerCase();
						if (trimmedInnerText.startsWith(("end class"))) { 
							symbols.push(new vscode.SymbolInformation(
								line.text.trim().split(" ").slice(1).join(),
								vscode.SymbolKind.Class,
								line.text.trim().split(" ").slice(1).join(),
								new vscode.Location(document.uri, new vscode.Range(new vscode.Position(i, 0), new vscode.Position(j, 0)))
							));
							break;
						}
						continue;
					}
					continue;
				}
				for (var prefix of functionSinglePrefix) { 
					if (trimmedText.startsWith(prefix)) { 
						for (var j = i; j < document.lineCount; j++) {
							var innerLine = document.lineAt(j);
							var trimmedInnerText = innerLine.text.trim().toLowerCase();
							if (trimmedInnerText.startsWith(("end " + prefix))) {
								symbols.push(new vscode.SymbolInformation(
									line.text.trim().split(" ").slice(1).join(" "),
									vscode.SymbolKind.Function,
									line.text.trim(),
									new vscode.Location(document.uri, new vscode.Range(new vscode.Position(i, 0), new vscode.Position(j, 0)))
								));
								break;
							}
							continue;
						}
						continue;
					}
				}

				for (var prefix of functionDoublePrefix) {
					if (trimmedText.startsWith(prefix)) {
						for (var j = i; j < document.lineCount; j++) {
							var innerLine = document.lineAt(j);
							var trimmedInnerText = innerLine.text.trim().toLowerCase();
							if (trimmedInnerText.startsWith(("end " + prefix.split(" ")[1]))) {
								symbols.push(new vscode.SymbolInformation(
									line.text.trim().split(" ").slice(2).join(" "),
									vscode.SymbolKind.Function,
									line.text.trim(),
									new vscode.Location(document.uri, new vscode.Range(new vscode.Position(i, 0), new vscode.Position(j, 0)))
								));
								break;
							}
							continue;
						}
						continue;
					}
				}
			}

			resolve(symbols);
		});
	}
}

class ASPDefinitionProvider implements vscode.DefinitionProvider {
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
				"function ",
				"sub "
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
