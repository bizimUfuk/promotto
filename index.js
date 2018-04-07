var mottoArea

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({port: 9091, type: 'proc', exec: require('ipfs')})

///DAEMON FUNCTION
function ipfsDaemonInstance(method, path, data, callb ){
	console.log("in ipfsDaemonInstance. Method: %s", method);
	f.spawn((err, ipfsd) => {
	  if (err) {
		console.log("Error: ", err);
		throw err; 
	  }
	  var node = ipfsd.api //QmcPgf7ktvpAKLy3AGBZ75zsMKZs9FLd4y8NEAfp7ekGYJ main ipfessay path

	  switch (method){
		case "GET":
			node.files.cat(path, function (err, res) {
				if (err) { throw err }
				mottoArea = res.toString('utf-8');
				console.log("mottoArea len: ", mottoArea.lenght);
			});
			
			break;
		case "PUT":
//new Buffer.from(data.toString())
			node.files.add([{content: data, path: path}],[{wrapWithDirectory: true, recursive: true}], function (err, res) {
				if (err) { 
					return callb(new Error("Errrr: " + err));
				}
				callb(null, res);
			});
			break;
	  }
	});
}

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
var mottoArea = ipfsDaemonInstance("GET", "QmcPgf7ktvpAKLy3AGBZ75zsMKZs9FLd4y8NEAfp7ekGYJ/index.html")

express()
  .use(express.static(path.join(__dirname, 'public')))
  //.use(bodyParser.json()) //for parsing application/json
 // .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
 // .use(bodyParser.text({ type: 'text/html' }))
  .use(bodyParser.raw({inflate: true, limit: '100kb', type: 'text/html'}))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index', {mottoArea: mottoArea }))
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
  .get('/ipfs/:hash', function (req, res){
    var hash = req.params['hash'];

    console.log("Got a hash: " + hash + " with GET method");

    var client = new Client(connection);
    client.connect();
    const text = "INSERT INTO hashes (hash) \
		VALUES ('" + hash + "') RETURNING hash";

    client.query(text, (err,fetch) => {
      if(err){
        console.error(err);
	res.send("4- Error " + err);
      }else{
	res.render('pages/db', {results: fetch.rows});
      }
      client.end();
    });
  })
  .put('/ipfs/:hash/:filename', function (req, res){
    ipfsDaemonInstance("PUT", "/ipfs/"+ req.params.hash + "/" + req.params.filename, req.body, function(error, response){
	if (error) {
		console.log("Error this: ", error);
	}
	res.setHeader("Ipfs-Hash", response[0].hash);
	console.log("responseee: ", response);	
	res.send();
    });
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

