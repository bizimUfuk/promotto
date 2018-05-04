
const u = require("./mottoUtils");



'use strict';

///DATABASE SECTION: POSTGRESQL
const { Pool, Client } = require('./../node_modules/pg');

const connection = {
  connectionString: process.env.DATABASE_URL || "postgres://test2:postgres@localhost:5432/test2" ,
  ssl: true,
}

function pgDB(text, callback){
    var client = new Client(connection);    
    client.connect();
    client.query(text, (err,res) => {
	u.logdebug("Error pgDB:", err);

	if(err){ 
		callback("Error: Database operation failed!", new Object());
	}else{
		callback(null, res);
	}

	client.end();
    });
}
///POSTGRESQL END


function mottoQry (text, cb) {
	pgDB (text, (err, fetch) => {
		return cb(err, fetch);
	})
}

function mottoVote(req, goback) {
	var body = JSON.parse(req.body);
	text = "UPDATE hashes SET shill=shill"+body.v+"1, life=life+1 WHERE did="+ body.did;

	mottoQry(text, (err, fetch) => {
		if (err) console.log("Error update vote: \n", text);
		u.logdebug("Recorded vote %s 1 for did: %d !", body.v, body.did);
		goback (err ? err : "OK"+body.v+body.did);
	})
}

module.exports = {
	mottoQry: mottoQry,
	mottoVote: mottoVote,
};
