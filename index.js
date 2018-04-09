const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({port: 9091, type: 'proc', exec: require('ipfs')})

const express = require('express')
var bodyParser = require('body-parser');

const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool, Client } = require('pg');

const connection = {
  connectionString: process.env.DATABASE_URL,
  ssl: true,
}


var hash = "";
let ipfsd
let mottoArea


f.spawn((err, ipfsd) => {
  if (err) {
	console.log("Error: ", err);
	throw err; 
  }

  var node = ipfsd.api; //QmcPgf7ktvpAKLy3AGBZ75zsMKZs9FLd4y8NEAfp7ekGYJ main ipfessay path
  
express()
  .use(express.static(path.join(__dirname, 'public')))
  //.use(bodyParser.json()) //for parsing application/json
 // .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
 // .use(bodyParser.text({ type: 'text/html' }))
  .use(bodyParser.raw({inflate: true, limit: '100kb', type: 'text/html'}))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', function (req, res){
	console.log("Node started: ", ipfsd.started);
	ipfsDaemonInstance("GET", node, "QmcPgf7ktvpAKLy3AGBZ75zsMKZs9FLd4y8NEAfp7ekGYJ/index.html",'', function (err, extract){
		if (err){ res.render('pages/index', {mottoArea: "Error: Ipfs version of index.html couldnt be retriewed!" })};
		res.render('pages/index', {mottoArea: extract });
	});
  })
  .get('/cool', (req, res) => res.render('pages/cool', {coolface: cool()} ))
  .get('/db', function (request, response){
    var client = new Client(connection);
    client.connect();
    client.query('SELECT * FROM hashes', function(err, result) {
      if(err){
	console.error(err);
	response.send("3- Error " + err);
      }else{
	response.render('pages/db', {results: result.rows});
	response.send("yyy");
      }
      client.end();
    });
  })
  .get('/ipfs/:hash/', function (req, res){
    console.log("Got a hash: " + req.params['hash'] + " with GET method");
    const text = "INSERT INTO hashes (hash) \
		VALUES ('" + req.params['hash'] + "') RETURNING hash";

    pgInteraction(text, (fetch) => res.render('pages/db', {results: fetch.rows}));
  })
  .put('/ipfs/:hash/:filename', function (req, res){
    ipfsDaemonInstance("PUT", node, "/ipfs/"+ req.params.hash + "/" + req.params.filename, req.body, function(error, response){
	if (error) {
		console.log("Error this: ", error);
	}
	res.setHeader("Ipfs-Hash", response[0].hash);
	console.log("responseee: ", response);	
	res.send();
    	//const text = "INSERT INTO hashes (hash) \
	//	VALUES ('" + hash + "') RETURNING hash";
    });
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
  f.stop();
});

///DAEMON FUNCTION
function ipfsDaemonInstance(method, nd, path, data, callb ){
	console.log("in ipfsDaemonInstance. Method: %s", method);

	  switch (method){
		case "GET":
			nd.files.cat(path, function (err, res) {
				if (err) { throw err }
				mottoArea = res.toString('utf-8');
				console.log("mottoArea len: ", mottoArea.lenght);
				callb(null, mottoArea);
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
	if(err){ callback("4- Error " + err) };
	client.end();
	callback(res);
    });
}
