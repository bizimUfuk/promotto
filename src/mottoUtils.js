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

module.exports = {
	logdebug: logdebug,
	readfromtxtfile: readfromtxtfile,
};


