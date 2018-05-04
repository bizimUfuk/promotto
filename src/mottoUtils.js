'use strict';

const mottoConfig = require("./mottoConfig.json");
const DEBUG = mottoConfig.DEBUG;

const fs = require('fs');


///FILESYSTEM FUNCTIONS
function readfromtxtfile(pathtofile, cb){
	logdebug("in pathtofile");
	let list = fs.readFileSync(pathtofile).toString().split("\n");
	cb(list);	
}

///debugger
function logdebug(){
	var args = Array.prototype.slice.call(arguments);
	if (DEBUG) console.log.apply(console, args);
	return;
}


/// temporary solution to fix relative path issue
function pathfix(t, from="src=\"", to="src=\"/", offset = 0){
	t=t.toString();
	let i= t.slice(offset).indexOf(from);
	if (i === -1) return t ;
	let pre = t.slice(0, i);
	let pos = t.slice(i);

	if(pos.slice(5, 12) !== "http://" && pos.slice(5, 6) !== "/") {
		pos = pos.replace(from, to);
		return pre + pathfix(pos, i + 3);
	}
}


module.exports = {
	logdebug: logdebug,
	readfromtxtfile: readfromtxtfile,
	pathfix: pathfix,
};


