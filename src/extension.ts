// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  var _ = undefined;
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectDoubleQuote', singleSelect.bind(_, { char: '"', multiline: true })));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectDoubleQuoteBack', singleSelect.bind(_, { char: '"', multiline: true, back:true })));
	
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectSingleQuote', singleSelect.bind(_, { char: "'" })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectEitherQuote', selectEitherQuote.bind(_, { back: false})));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectEitherQuoteBack', selectEitherQuote.bind(_, { back: true})));
	
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectBackTick', singleSelect.bind(_, { char: "`", multiline: true })));
	
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectParenthesis', matchingSelect.bind(_, { start_char: "(", end_char: ")", multiline:true})));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectParenthesisBack', matchingSelect.bind(_, { start_char: "(", end_char: ")", multiline:true, back:true})));

  context.subscriptions.push(vscode.commands.registerCommand('extension.selectSquareBrackets', matchingSelect.bind(_, { start_char: "[", end_char: "]" })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectCurlyBrackets', matchingSelect.bind(_, { start_char: "{", end_char: "}" })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectParenthesisOuter', matchingSelect.bind(_, { start_char: "(", end_char: ")", outer: true })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectSquareBracketsOuter', matchingSelect.bind(_, { start_char: "[", end_char: "]", outer: true })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectCurlyBracketsOuter', matchingSelect.bind(_, { start_char: "{", end_char: "}", outer: true })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectAngleBrackets', matchingSelect.bind(_, { start_char: "<", end_char: ">" })));
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectInTag', matchingSelect.bind(_, { start_char: ">", end_char: "<" })));
}

// Replacables
const starters = ['"', "'", "`", "(", "[", '{'];
const enders = ['"', "'", "`", ")", "]", '}'];

function findOccurances(doc: vscode.TextDocument, line: number, char: string): Array<number> {
  var content = doc.lineAt(line);
  var matches = (content.text + "hack").split(char).reduce((acc, p) => {
    var len = p.length + 1;
    if (acc.length > 0) {
      len += acc[acc.length - 1];
    }
    acc.push(len);
    return acc;
  }, []);
  matches.pop();
  return matches;
}

function findNext(doc: vscode.TextDocument, line: number, char: string, start_index: number = 0, nest_char: string = undefined, nested: number = 0): vscode.Position {
  if (line === doc.lineCount) { return undefined };
  var occurances = findOccurances(doc, line, char).filter(n => n >= start_index);
  var nests = nest_char ? findOccurances(doc, line, nest_char).filter(n => n >= start_index) : [];
  var occurance_index = 0;
  var nests_index = 0;
  while ((occurance_index < occurances.length || nests_index < nests.length) && nested >= 0) {
    if (occurances[occurance_index] < nests[nests_index] || !nests[nests_index]) {
      if (nested === 0) {
        return new vscode.Position(line, occurances[occurance_index]);
      }
      nested--
      occurance_index++;
    } else if (nests[nests_index] < occurances[occurance_index] || !occurances[occurance_index]) {
      nested++;
      nests_index++;
    }
  }
  return findNext(doc, ++line, char, 0, nest_char, nested);
}


function findPrevious(doc: vscode.TextDocument, line: number, char: string, start_index?: number, nest_char: string = undefined, nested: number = 0): vscode.Position {
  if (line === -1) { return undefined };
  if (start_index === undefined) { start_index = doc.lineAt(line).text.length; }
  var occurances = findOccurances(doc, line, char).filter(n => n <= start_index);
  var nests = nest_char ? findOccurances(doc, line, nest_char).filter(n => n <= start_index) : [];
  var occurance_index = occurances.length - 1;
  var nests_index = nests.length - 1;
  while ((occurance_index > -1 || nests_index > -1) && nested >= 0) {
    if (occurances[occurance_index] > nests[nests_index] || !nests[nests_index]) {
      if (nested === 0) {
        return new vscode.Position(line, occurances[occurance_index]);
      }
      nested--
      occurance_index--;
    } else if (nests[nests_index] > occurances[occurance_index] || !occurances[occurance_index]) {
      nested++;
      nests_index--;
    }
  }
  return findPrevious(doc, --line, char, undefined, nest_char, nested);
}



function findSingleSelect(s: vscode.Selection, doc: vscode.TextDocument, char: string, outer?: boolean, multiline?: boolean, back?:boolean) {
	
	let line;
	let character;
	if(!back){
		line = s.active.line;
		character = s.active.character;
	}
	else{
		line = s.anchor.line;
		character = s.anchor.character;
	}
	
  let matches = findOccurances(doc, line, char);
  //let next = matches.find(a => a > character);
	let next;
	if(!back) next = matches.find(a => a > character + 1);
	else{
		matches.reverse();
		next = matches.find(a => a < character);
		matches.reverse();
	}
	
  let next_index = matches.indexOf(next);
	let offset = outer ? char.length : 0;
	console.log("findSingleSelect outer : "+outer+", back : "+back+", char : "+char+", s.anchor : "+tracepos(s.anchor)+", s.end : "+tracepos(s.end)+", s.active : "+tracepos(s.active));
	console.log("matches "+matches);
	console.log("next : "+next);
	
  if (matches.length > 1 && matches.length % 2 === 0 && next_index != -1 && next != undefined) {
		console.log("next_index : "+next_index);
    // Jump inside the next matching pair
    if (next === -1) { return s }
    if (next_index % 2 !== 0) {
      next_index--;
		}
		
		console.log("next_index : "+next_index+", len : "+matches.length);
		//0, 1, 2, 3
		
		return new vscode.Selection(
			new vscode.Position(line, matches[next_index] - offset),
			new vscode.Position(line, matches[next_index + 1] - 1 + offset)
		);
			
  } else if (multiline) {
		
		let start_pos;
		let end_pos: vscode.Position;
		console.log("multiline, character : "+character);
		
		if(!back){
			start_pos = findNext(doc, line, char, character + 2) || new vscode.Position(line, matches[next_index])
			if (!start_pos) { return s };		
			end_pos = findNext(doc, start_pos.line, char, start_pos.character + 1);
		}
		else{
			end_pos = findPrevious(doc, line, char, character - 1)
			console.log("end_pos: "+tracepos(end_pos));
			if (!end_pos) { return s };			
			start_pos = findPrevious(doc, end_pos.line, char, end_pos.character - 1);
			console.log("start_pos : "+tracepos(start_pos));
		}
			
		
		
		//Automatically grow to outer selection
		console.log("2. start_pos : "+tracepos(start_pos));
		console.log("2. end_pos :"+tracepos(end_pos));
		
    if (start_pos && end_pos) {
      start_pos = new vscode.Position(start_pos.line, start_pos.character - offset);
      end_pos = new vscode.Position(end_pos.line, end_pos.character - 1 + offset);
      return new vscode.Selection(start_pos, end_pos)
    }
  }
  return s;

}

interface SingleSelectOptions { char: string; outer?: boolean, multiline?: boolean, back?:boolean }
function singleSelect({char, outer = false, multiline = false, back = false}: SingleSelectOptions) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
  let sel = editor.selections
  editor.selections = sel.map(s => findSingleSelect(s, doc, char, outer, multiline, back))
}



function selectEitherQuote({back = false}) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
  let sel = editor.selections
  editor.selections = sel.map((s: vscode.Selection) => {
    let singleQuotes = findSingleSelect(s, doc, "'", false, true, back)
    let doubleQuotes = findSingleSelect(s, doc, '"', false, true, back)
    if (singleQuotes === s) { return doubleQuotes }
    if (doubleQuotes === s) { return singleQuotes }
    let insideSingle = singleQuotes.start.isBeforeOrEqual(s.start) && singleQuotes.end.isAfterOrEqual(s.end)
    let insideDouble = doubleQuotes.start.isBeforeOrEqual(s.start) && doubleQuotes.end.isAfterOrEqual(s.end)
    if (insideSingle && !insideDouble) { return singleQuotes }
    if (insideDouble && !insideSingle) { return doubleQuotes }
    if (singleQuotes.start.isBefore(doubleQuotes.start)) { return doubleQuotes; }
    return singleQuotes;
  })
}






interface MatchingSelectOptions { start_char: string, end_char: string, outer?: boolean, multiline?:boolean, back?:boolean }
function matchingSelect({start_char, end_char, outer = false, multiline = true, back = false}: MatchingSelectOptions) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
  let sel = editor.selections
	let success = false;
	//console.log("outer : "+outer);
  let start_offset = outer ? start_char.length : 0;
	let end_offset = outer ? end_char.length : 0;
	
  editor.selections = sel.map(s => {
    let {line, character} = s.anchor;
    let starts = findOccurances(doc, line, start_char);
		let ends = findOccurances(doc, line, end_char);
		console.log("_________________________________________");
		console.log("matchingSelect("+start_char+","+end_char+", outer : "+outer+", multiline : "+multiline+", back : "+back);
		console.log("s.anchor : "+tracepos(s.anchor)+", s.end"+tracepos(s.end)+", s.active : "+tracepos(s.active));
		console.log("character : "+character);
		
		console.log("starts : "+starts);
		console.log("ends : "+ends);
		
		//works as expected
		let pos_previous:vscode.Position = findPrevious(doc, line, start_char, character);
		let pos_next:vscode.Position = findNext(doc, line, end_char, character);
		console.log("pos_previous : "+tracepos(pos_previous)+", pos_next : "+tracepos(pos_next));
		
		
		/*
		faut détecter des matching pairs
		ptet chopper ds tous le document, la liste des start/end (2 Position[])
		ensuite, un moyen de les classes ensemble
		
		les starts font office de vérité sur la position
		1235
		4678
		
		doit devenir :
		1235
		8746
		
		{1
			{2
				{3}4
				{5}6
			}7
		}8
		
		du coup, ou cherche t-on le premier
		le racine pas pertinent
		
		forward : chercher le next start en partant d'anchor
		backward : chercher le prev start en partant d'anchor

		1er call un peu différent (si no selection)
			chopper l'interval ds lequel je suis (forward et backward)
		
		au lieu de traiter des Position, pour simplifier les comparaisons,
		on peut faire : line * multiplicator + character
		multiplicator vaudra 1000 pour le dev (lisible) puis passer a 200 pour la prod
		
		modifs
		
		
		function(){
			
			//blabla
			if(){
				[cursor]
			}
		}
		
		
		*/
		
    let start = starts.find(a => a > character);
    let end = ends.find(a => a > character + 1);
		
		console.log("start : "+start+", end : "+end);
		
		let start_index = starts.indexOf(start);
		let end_index = ends.indexOf(end);
		console.log("start_index : "+start_index+", end_index : "+end_index);
		
    let start_pos: vscode.Position = findPrevious(doc, line, start_char, character, end_char) || new vscode.Position(line, starts[start_index]);
    if (!start_pos) { return s };
		let end_pos: vscode.Position = findNext(doc, start_pos.line, end_char, start_pos.character + 1, start_char);
		
    if (start_pos && end_pos) {
			success = true;
			
			start_pos = new vscode.Position(start_pos.line, start_pos.character - start_offset);
      end_pos = new vscode.Position(end_pos.line, end_pos.character - 1 + end_offset);
      return new vscode.Selection(start_pos, end_pos)
    }
    return s;
  })
  if (success && start_char === "<") {
    vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch")
  }
}

function tracepos(pos:vscode.Position):string
{
	return "["+pos.line+","+pos.character+"]";
}