const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({ type: 'proc', exec: require('ipfs')})

const express = require('express')
var bodyParser = require('body-parser');

const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool, Client } = require('pg');

const connection = {
  connectionString: process.env.DATABASE_URL || "postgres://test2:postgres@localhost:5432/test2" ,
  ssl: true,
}

var hash = "";
let node;

const startDaemon = (ipfsd) => {
	ipfsd.start((err, api)=>{
		if(err) { throw err }
		if(ipfsd.started){ 
			console.log("ipfsd started: ", ipfsd.started);
			node = api; 
		}
	})
}


f.spawn({ disposable: false , repoPath: "./.ipfsdctlrepo"}, (err, ipfsd) => {
  if (err) {	throw err;  }

    if (ipfsd.initialized){
	startDaemon(ipfsd);
	
    }else{
	ipfsd.init((err)=>{
		if(err) { throw err }
		startDaemon(ipfsd);
	})
    }

var server = express()
  .use(express.static(path.join(__dirname, 'public')))
  //.use(bodyParser.json()) //for parsing application/json
 // .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
 // .use(bodyParser.text({ type: 'text/html' }))
  .use(bodyParser.raw({inflate: true, limit: '100kb', type: 'text/html'}))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', function (req, res){
	ipfsDaemonInstance("GET", node, "QmcPgf7ktvpAKLy3AGBZ75zsMKZs9FLd4y8NEAfp7ekGYJ/index.html",'', function (err, extract){
		if (err){ res.render('pages/index', {mottoArea: "Error: Ipfs version of index.html couldnt be retriewed!" })};
		res.render('pages/index', {mottoArea: extract });
	});
  })
  .get('/cool', (req, res) => res.render('pages/cool', {coolface: cool()} ))
  .get('/liveline', function (request, response){
    let mottoHashes
    const text = "SELECT * FROM live_hashes() ORDER BY shill";
    pgInteraction(text, function (err, fetch) {
	if(err){
		console.log("Error is here in getting pgInteraction", err);
	}else{	
		
		mottoHashes = fetch.rows;

		let mottos = []
		for (i = 0; i < mottoHashes.length; i++){

//convert life to remaining minutes
			mottoHashes[i]['shill'] = mottoHashes[i]['shill']*60000 + new Date(mottoHashes[i].mtime).getTime();
			let tempObj = Object.assign({}, mottoHashes[i]);
			ipfsDaemonInstance("GET", node, mottoHashes[i].hash+"/index.html", '', function (err, extract){
				if (err){throw err;}
				tempObj["extract"] = extract;
				if (tempObj.hasOwnProperty("extract")) { mottos.push(tempObj);}

				if (mottos.length === mottoHashes.length){
console.log(mottos);
					response.render('pages/liveline', { alivemottos : mottos.sort(function(a,b){return b["shill"]-a["shill"]}) });
				}
			});
		}
	}
    });
  })
  .post('/vote', function (req, res){ 
	var body = JSON.parse(req.body);
	text = "UPDATE hashes SET shill=shill"+body.v+"1, life=life+1 WHERE did="+ body.did;

	pgInteraction(text, (err, fetch) => res.send("OK"+body.v+body.did))
  })
  .get('/ipfs/(:hash(Qm*))?', function (req, res){ 
	const cond = typeof req.params['hash'] === 'undefined' ? '':"WHERE hash='" + req.params['hash'] + "'";
	const text = "SELECT * FROM hashes " + cond + " ORDER BY did";

	pgInteraction(text, (err, fetch) => res.render('pages/db', {results: fetch.rows}) ); 
  })
  .get('/motto/(:hash(Qm*))?', function (req, res){
	ipfsDaemonInstance("GET", node, "/ipfs/" + req.params.hash + "/index.html", "", (err, extract) => res.render('pages/motto', {extract: extract}) ) 
  })
  .put('/ipfs/:hash/:filename', function (req, res){
    ipfsDaemonInstance("PUT", node, "/ipfs/"+ req.params.hash + "/" + req.params.filename, req.body, function(error, response){
	if (error) {
		console.log("Error this: ", error);
	}else{

		res.setHeader("Ipfs-Hash", response[0].hash);
		res.send();

	    	const text = "INSERT INTO hashes (hash) VALUES ('" + response[0].hash + "') ON CONFLICT DO NOTHING RETURNING hash";
		pgInteraction(text, (err, fetch) => console.log('Successfully inserted hash into hashes db'));
	}
    });
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`)
  )//express() closure

}); //f.spawn closure

///DAEMON FUNCTION
function ipfsDaemonInstance(method, nd, path, data, callb ){
	  switch (method){
		case "GET":
			nd.files.cat(path, function (err, res) {
				if (err) { res=''; }
				callb(null, res.toString('utf-8'));
			});
			break;
		case "PUT":
			nd.files.add([{content: data, path: path}],[{wrapWithDirectory: true, recursive: true}], function (err, res) {
				if (err) { 
					return callb(new Error("Errrr: " + err));
				}
				callb(null, res);
			});
			break;
	  }
}

///DATABASE FUNCTION
function pgInteraction(text, callback){
    var client = new Client(connection);    
    client.connect();
    client.query(text, (err,res) => {
	if(err){ 
		callback("Error: Database operation failed!", null);
	}else{
		callback(null, res);
	}

	client.end();
    });
}

