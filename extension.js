const vscode = require('vscode');
const cp = require('child_process');
let speakTimeout;

function speak(text) {
	const platform = process.platform;
	if (platform === 'darwin') {
		cp.spawn('say', [text]);
	} else if (platform === 'win32') {
		cp.spawn('python', ['-c', `import pyttsx3; e=pyttsx3.init('sapi5'); e.say("${text}"); e.runAndWait()`]);
	} else {
		vscode.window.showErrorMessage('Text-to-speech is not supported on this platform.');
	}
}

function getIndentLevel(line) {
	const match = line.match(/^(\s*)/);
	if (!match) return 0;
	const spaces = match[1].replace(/\t/g, '    '); 
	return Math.floor(spaces.length / 4);
}

function simplifyLine(line) {
	const trimmed = line.trim();

	if (trimmed === '') return 'blank line';

	const rules = [
		{ starts: ['//', '#'], label: 'comment' },
		{ starts: ['function ', 'def'], label: 'function definition' },
		{ starts: ['class'], label: 'class definition' },
		{ starts: ['if ', 'if('], label: 'if statement' },
		{ starts: ['for ', 'for('], label: 'for loop' },
		{ starts: ['return '], label: 'return statement' },
		{ starts: ['import ', 'from '], label: 'import statement' },
		{ starts: ['while ', 'while('], label: 'while loop' },
	];

	for (const rule of rules) {
		if (rule.starts.some(start => trimmed.startsWith(start))) {
			return `${rule.label}: ${trimmed}`;
		}
	}

	return trimmed;
}

function activate(context) {
	vscode.window.showInformationMessage('Narrativ activated: Speak code lines on cursor move.');

	const result = cp.spawnSync('python3', ['--version'], { encoding: 'utf8' });

	vscode.window.showInformationMessage('Python: ' + result.stdout.toString() + result.stderr.toString());

	let lastLine = -1;

	speak('Narrativ is ready');

	const disposable = vscode.window.onDidChangeTextEditorSelection(event => {
		const editor = event.textEditor;
		const position = editor.selection.active;
		const lineNumber = position.line;

		if (lineNumber === lastLine) return;
		lastLine = lineNumber;

		const lineText = editor.document.lineAt(lineNumber).text;
		const indentLevel = getIndentLevel(lineText);
		const simplified = simplifyLine(lineText);

		let message = '';
		if (indentLevel > 0) {
			message = `indent level ${indentLevel}: ${simplified}`;
		}
		else {
			message = simplified;
		}

		clearTimeout(speakTimeout);
		speakTimeout = setTimeout(() => speak(message), 300);
	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
};