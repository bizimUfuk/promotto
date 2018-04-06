var mottoArea

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({port: 9091, type: 'proc', exec: require('ipfs')})

///DAEMON FUNCTION
function ipfsDaemonInstance(method, path, callback){
	console.log("in ipfsDaemonInstance\n");
	f.spawn((err, ipfsd) => {
	  if (err) {
		console.log("Error: ", err);
		throw err; 
	  }else{
		var node = ipfsd.api //QmcMFLSSUwzQZxakBubCtnvwUuVJmcPvGNMKe8EFeFSxiB main ipfessay path
		switch (method){
			case "GET":
				console.log("in switch case:GET\n");
				node.files.cat("QmcMFLSSUwzQZxakBubCtnvwUuVJmcPvGNMKe8EFeFSxiB/index.html", function (err, res) {
					if (err) { throw err }
					mottoArea = res.toString('utf-8');
					console.log("mottoArea len: ", mottoArea.lenght);
				})
		}
	  }
	})	 
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
var mottoArea = ipfsDaemonInstance("GET")
express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json()) //for parsing application/json
  .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
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
  .put('/ipfs/', function (req, res){
    console.log("yaheyaaea aaaa ");
    
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

