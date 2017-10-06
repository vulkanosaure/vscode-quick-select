// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { listenerCount } from 'cluster';
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  var _ = undefined;
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectGroup', selectGroup.bind(_)));
	context.subscriptions.push(vscode.commands.registerCommand('extension.goToDeclaration2', goToDeclaration2.bind(_)));
	context.subscriptions.push(vscode.commands.registerCommand('extension.expandLineSelection2', expandLineSelection2.bind(_)));
	context.subscriptions.push(vscode.commands.registerCommand('extension.format2', actionExpandable.bind(_, "editor.action.formatSelection")));
	
	//copy, cut / no selection
	context.subscriptions.push(vscode.commands.registerCommand('extension.copy_no_selection', actionExpandable.bind(_, "editor.action.clipboardCopyAction")));
	context.subscriptions.push(vscode.commands.registerCommand('extension.cut_no_selection', actionExpandable.bind(_, "editor.action.clipboardCutAction")));
	
	
	
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectDoubleQuote', singleSelect.bind(_, { char: '"', multiline: true })));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectDoubleQuoteBack', singleSelect.bind(_, { char: '"', multiline: true, back:true })));
	
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectSingleQuote', singleSelect.bind(_, { char: "'" })));
	
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectEitherQuote', selectEitherQuote.bind(_, { back: false})));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectEitherQuoteBack', selectEitherQuote.bind(_, { back: true})));
	
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectBackTick', singleSelect.bind(_, { char: "`", multiline: true })));
	
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectParenthesis', matchingSelect.bind(_, { start_char: "(", end_char: ")", multiline:true})));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectParenthesisBack', matchingSelect.bind(_, { start_char: "(", end_char: ")", multiline:true, back:true})));

  context.subscriptions.push(vscode.commands.registerCommand('extension.selectSquareBrackets', matchingSelect.bind(_, { start_char: "[", end_char: "]" })));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectSquareBracketsBack', matchingSelect.bind(_, { start_char: "[", end_char: "]", back:true })));
	
  context.subscriptions.push(vscode.commands.registerCommand('extension.selectCurlyBrackets', matchingSelect.bind(_, { start_char: "{", end_char: "}" })));
	context.subscriptions.push(vscode.commands.registerCommand('extension.selectCurlyBracketsBack', matchingSelect.bind(_, { start_char: "{", end_char: "}", back:true })));
	
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

var lineMultiplicator:number = 1000;
function findOccurancesAllDoc(doc: vscode.TextDocument, char: string): Array<number> {
	
	let output:Array<number> = [];
	var len:number = doc.lineCount;
	for (var i = 0; i < len; i++) {
		let occurences:Array<number> = findOccurances(doc, i, char);
		let baseline:number = i * lineMultiplicator;
		occurences = occurences.map((v:number) => baseline + v);
		output = output.concat(occurences);
	}
	return output;
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
			console.log("_startpos : "+tracepos(start_pos));
			if(start_pos.character == undefined) start_pos = findNext(doc, 0, char, 1);
			
			if (!start_pos) { return s };
			end_pos = findNext(doc, start_pos.line, char, start_pos.character + 1);
		}
		else{
			console.log("ok "+line+", "+char+", "+(character - 1));
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



function actionExpandable(action:string):void
{
	expandLineSelection2();
	vscode.commands.executeCommand(action);	
}



function expandLineSelection2():void
{
	console.log("expandLineSelection2");
	
	let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
	let sel = editor.selections
	
  editor.selections = sel.map(s => {
		
		let pos_bottom:vscode.Position = (s.active.line >= s.anchor.line) ? s.active : s.anchor;
		let pos_top:vscode.Position = (s.active.line >= s.anchor.line) ? s.anchor : s.active;
		let {line, character} = pos_bottom;
		
		var directionDown:boolean = (s.active.line >= s.anchor.line);
		console.log(directionDown + " <= directionDown");
		
		
		var lineTop:string = doc.lineAt(pos_top.line).text;
		let index:number = lineTop.search(/\S/);
		console.log(lineTop + " <= lineTop");
		console.log(index + " <= index");
		
		var lineBottom:string = doc.lineAt(pos_bottom.line).text;
		
		console.log("anchor : "+tracepos(s.anchor));
		console.log("active : "+tracepos(s.active));
		
		if(index != -1){
			let pos_top2 = new vscode.Position(pos_top.line, index);
			let pos_bottom2 = new vscode.Position(pos_bottom.line, lineBottom.length);
			
			let pos_start = (directionDown) ? pos_top2 : pos_bottom2;
			let pos_end = (!directionDown) ? pos_top2 : pos_bottom2;
			
			s = new vscode.Selection(pos_start, pos_end);
		}
		
		return s;
	});
}




function goToDeclaration2():void
{
	console.log("goToDeclaration2");
	
	let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
	let sel = editor.selections
	
  editor.selections = sel.map(s => {
	
		//prev and next char must not be
		let currentLine:string = doc.lineAt(s.active.line).text;
		let prevchar:string = currentLine.charAt(s.active.character - 1);
		let nextchar:string = currentLine.charAt(s.active.character);
		
		// console.log(prevchar + " <= prevchar");
		// console.log(nextchar + " <= nextchar");
		
		let prevmatch:boolean = (prevchar.match(/\w/) != null);
		let nextmatch:boolean = (nextchar.match(/\w/) != null);
		console.log(prevmatch + " <= prevmatch");
		// console.log(nextmatch + " <= nextmatch");
		
		let isok:boolean = (!prevmatch && !nextmatch);
		
		if(isok){
			console.log("ok");
			let index:number = currentLine.search(/[\w+](\(.*\))/)
			console.log(index + " <= index");
			index++;
			
			let pos:vscode.Position = new vscode.Position(s.active.line, index);
			s = new vscode.Selection(pos, pos);
			
		}
		return s;
	});
	
	vscode.commands.executeCommand("editor.action.goToDeclaration");
	
}






function selectGroup({char, outer = false, multiline = false, back = false}: SingleSelectOptions) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
	let sel = editor.selections
	
	
  editor.selections = sel.map(s => {
		
		let {line, character} = s.active;
		
		var textActive:string = doc.lineAt(line).text;
		console.log(textActive + " <= textActive");
		
		if(textActive.match(/\{/)){
			console.log("ok match");
			line++;
		}
		let posActive2:vscode.Position = new vscode.Position(line, character);
		let activeHash:number = positionToHash(posActive2);
		
		//find first { without } before
		
		let allStarts = findOccurancesAllDoc(doc, "{");
		let allEnds = findOccurancesAllDoc(doc, "}");
		
		let allCombine = allStarts.slice(0);
		allCombine = allCombine.concat(allEnds);
		allCombine.sort((a, b) => (a > b) ? 1 : -1);
		
		let len:number = allStarts.length;
		let len2:number = allCombine.length;
		//re-order allEnds
		
		for (var i = 0; i < len; i++) {
			let ind_start:number = allCombine.indexOf(allStarts[i]) + 1;
			
			let count:number = 0;
			for (var j = ind_start; j < len2; j++) {
				
				var ind:number = allCombine[j];
				let isopen:boolean = allStarts.indexOf(ind) != -1;
				//console.log("-- ind : "+ind+", isopen : "+isopen);
				
				if(!isopen && count == 0) {
					allEnds[i] = ind;
					break;
				}
				count += isopen ? 1 : -1;
				
			}
		}
		
		console.log(allStarts + " <= allStarts");
		console.log(allEnds + " <= allEnds");
		console.log(allCombine + " <= allCombine");
		console.log(tracepos(s.active) + " <= tracepos(active)");
		
		let index:number = findIndex(allCombine, activeHash);
		let start:number = index - 1;
		let count:number = 0;
		
		
		for (var i = start; i >= 0; i--) {
			let val:number = allCombine[i];
			let isopen:boolean = allStarts.indexOf(val) != -1;
			console.log("- ind "+i+", isopen : "+isopen);
			if(isopen && count == 0){
				index = i;
				break;
			}
			count += isopen ? 1 : -1;
		}
		console.log(index + " <= index");
		
		let prev_pos_hash:number = allCombine[index];
		
		
		let prev_pos:vscode.Position = hashToPosition(prev_pos_hash);
		console.log("prev_pos : "+tracepos(prev_pos));
		
		let prev_pos2:vscode.Position = new vscode.Position(prev_pos.line, prev_pos.character - 1);
		
		let selection:vscode.Selection = getMatchingSelectPositions(doc, s, prev_pos2, "{", "}", false);
		
		// let selection:vscode.Selection = getMatchingSelectPositions(doc, s, s.active, "{", "}", true);
		console.log("selection : "+selection);
		
		//attention, doit aussi marcher avec 
		//function()
		//{
		
		
		var line_start = prev_pos2.line;
		let contentAnchor:string;
		var output:RegExpExecArray = null;
		
		while(output == null){
			
			contentAnchor = doc.lineAt(line_start).text;
			console.log("contentAnchor : "+contentAnchor);	//ok
		
			let regex: RegExp = /(\w+)/g;
			output = regex.exec(contentAnchor);
			console.log("match : " + output);
			
			line_start--;
		}
		
		line_start++;
		console.log("line_start : "+line_start);
		
		var regexstart:RegExp = /(\w+)/;
		var indexOf:number = contentAnchor.search(/(\w+)/);
		let char_start:number = indexOf;
		
		console.log("indexOf : "+indexOf);
		
		//determiner le charactere
		
		let anchor:vscode.Position = new vscode.Position(line_start, char_start);
		
		let active:vscode.Position = new vscode.Position(selection.active.line, selection.active.character + 1);
		
		let selection2:vscode.Selection = new vscode.Selection(anchor, active);
		
		s = selection2;
		
		return s;
	});
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




function positionToHash(pos:vscode.Position):number
{
	return pos.line * lineMultiplicator + pos.character;
}
function hashToPosition(hash:number):vscode.Position
{
	return new vscode.Position(Math.floor(hash / lineMultiplicator), hash % lineMultiplicator);
}



function getMatchingSelectPositions(doc, s:vscode.Selection, anchor:vscode.Position, start_char:string, end_char:string, back:boolean):vscode.Selection {
	
	let start_offset = 0;
	let end_offset = 0;
	
	console.log("_________________________________________");
	console.log("matchingSelect("+start_char+","+end_char+", back : "+back);
	console.log("s.anchor : "+tracepos(s.anchor)+", s.end"+tracepos(s.end)+", s.active : "+tracepos(s.active));
		
		
		//find all occurences (separated)
		
		let allStarts = findOccurancesAllDoc(doc, start_char);
		// console.log(allStarts + " <= allStarts");
		let allEnds = findOccurancesAllDoc(doc, end_char);
		// console.log(allEnds + " <= allEnds");
		
		let allCombine = allStarts.slice(0);
		allCombine = allCombine.concat(allEnds);
		allCombine.sort((a, b) => (a > b) ? 1 : -1);
		
		
		let len:number = allStarts.length;
		let len2:number = allCombine.length;
		//re-order allEnds
		
		for (var i = 0; i < len; i++) {
			let ind_start:number = allCombine.indexOf(allStarts[i]) + 1;
			
			let count:number = 0;
			for (var j = ind_start; j < len2; j++) {
				
				var ind:number = allCombine[j];
				let isopen:boolean = allStarts.indexOf(ind) != -1;
				//console.log("-- ind : "+ind+", isopen : "+isopen);
				
				if(!isopen && count == 0) {
					allEnds[i] = ind;
					break;
				}
				count += isopen ? 1 : -1;
				
			}
		}
		
		console.log(allStarts + " <= allStarts");
		console.log(allEnds + " <= allEnds");
		
		//get next index
		var anchorHash:number = positionToHash(anchor);
		console.log(anchorHash + " <= anchorHash");
		
		
		var index:number;
		
		if(!back){
			
			index = findIndex(allStarts, anchorHash);
			console.log(index + " <= index");
		
			if(index >= allStarts.length){
				anchorHash = 0;
				index = findIndex(allStarts, anchorHash);
			}
		}
		else{
			index = findIndex(allStarts, anchorHash - 1);
			index--;
			console.log(index + " <= index");
			if(index == -1) index = allStarts.length - 1;
		}
	
		
		if(index < allStarts.length){
		
			let start_hash:number = allStarts[index];
			let start_pos:vscode.Position = hashToPosition(start_hash);
			let end_hash:number = allEnds[index];
			let end_pos:vscode.Position = hashToPosition(end_hash);
			
			
			if (start_pos && end_pos) {
				start_pos = new vscode.Position(start_pos.line, start_pos.character - start_offset);
				end_pos = new vscode.Position(end_pos.line, end_pos.character - 1 + end_offset);
				return new vscode.Selection(start_pos, end_pos)
			}
		}
    return s;
}


interface MatchingSelectOptions { start_char: string, end_char: string, outer?: boolean, multiline?:boolean, back?:boolean }
function matchingSelect({start_char, end_char, outer = false, multiline = true, back = false}: MatchingSelectOptions) {
  let editor = vscode.window.activeTextEditor;
  if (!editor) { return; };
  let doc = editor.document
  let sel = editor.selections
	let success = false;
	//console.log("outer : "+outer);
  
	
  editor.selections = sel.map(s => {
		return getMatchingSelectPositions(doc, s, s.anchor, start_char, end_char, back);
		
  })
  if (success && start_char === "<") {
    vscode.commands.executeCommand("editor.action.addSelectionToNextFindMatch")
  }
}

//tab est ordonné
function findIndex(tab:Array<number>, value:number):number
{
	let len:number = tab.length;
	for (var i = 0; i < len; i++) {
		if(value < tab[i]) return i;
	}
	return len;
}

function tracepos(pos:vscode.Position):string
{
	return "["+pos.line+","+pos.character+"]";
}