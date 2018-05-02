
var u = require('./src/mottoUtils');

var mottoDB = require('./src/mottoDB');
var mottoIPFS = require('./src/mottoIPFS');

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({ type: 'proc', exec: require('ipfs')})

const express = require('express')
var bodyParser = require('body-parser');

const path = require('path')
const PORT = process.env.PORT || 5000

var hash = "";
var node;

const startDaemon = (ipfsd) => {
	ipfsd.start((err, api)=>{
		if(err) { throw err }
		if(ipfsd.started){ 
			node = api; 
		}
	})
}


f.spawn({ disposable: false, repoPath: "./.ipfsdctlrepo"}, (err, ipfsd) => {
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
.get('*',(req, res, next)=>{console.log("requested-->", req.originalUrl );
next();
})
.get("/testing", (req, res, next)=> {
	
})
  .get('/', function (req, res){
	mottoIPFS.ipfsCAT(node, "/ipfs/QmboGVKUDPJG2U1QYMtXoQ1EDWVxPAHZBYfHvpaV47NiT2/index.html", function (err, extract){
		res.render('pages/index', { mottoArea: (err ? err : extract) });
	});

  })
  .get('/liveline', function (request, response){

 	const text = "SELECT * FROM live_hashes() ORDER BY shill";
	mottoDB.mottoQry(text, function (err, fetch) {

		if(err || fetch.rows.length <=0) response.render('pages/liveline', { alivemottos: (err ? err : []) })

		let mottoHashes = fetch.rows;
		let mottos = []

		for (i = 0; i < mottoHashes.length; i++){
			let hashee = mottoHashes[i].hash;

			//convert life to remaining minutes
			mottoHashes[i]['shill'] = mottoHashes[i]['shill']*60000 + new Date(mottoHashes[i].mtime).getTime();

			let tempObj = Object.assign({}, mottoHashes[i]);

			mottoIPFS.ipfsCAT(node, mottoHashes[i].hash+"/index.html", function (err, extract){
				if (err){console.log("Cant get " + hashee + "! \n", err);}
				tempObj["extract"] = extract;
				if (tempObj.hasOwnProperty("extract")) { mottos.push(tempObj);}

				if (mottos.length === mottoHashes.length){

					response.render('pages/liveline', { alivemottos : mottos.sort(function(a,b){return b["shill"]-a["shill"]}) });
				}
			});
		}
       });
  })
  .post('/vote', function (req, res){ 
	mottoDB.mottoVote(req, (fetch) => res.send(fetch) );
  })
  .get('/db/(:hash(Qm*))?', function (req, res){ 
	const cond = typeof req.params['hash'] === 'undefined' ? '':"WHERE hash='" + req.params['hash'] + "'";
	const text = "SELECT * FROM hashes " + cond + " ORDER BY did";

	mottoDB.mottoQry(text, (err, fetch) => res.render('pages/db', {title: "Database Results", results: err ? err : fetch.rows}) ); 
  })
  .get('/ipfs.ls/(:path(Qm*)(/:sub)?)?', function (req, res){
	let pat  = req.params.sub  === undefined ? req.params.path : req.params.path + "/" + req.params.sub
	mottoIPFS.ipfsLS(node, pat, function (err, list){
		let rendering = '';
		list.forEach((lnk)=>{ rendering += "<br> >>>type: " + lnk.type + " hash: " + lnk.hash + " size: " + lnk.size + " name: " + lnk.name + "\n" } ); 
		res.send("OK\n"+ rendering)
	})
  })
  .get('/ipfs/:hash\/?(\/:sub)?', function (req, res){
	let hash = req.params.hash;
	let sub = typeof req.params.sub !== 'undefined' ? req.params.sub : "";

	mottoIPFS.ipfsCAT(node, "/ipfs/" + hash + "/" + sub, (err, extract) => res.end(err ? err : extract) );
  })
  .put('/ipfs(/:hash)?((/)?:filename)?', function (req, res){
	mottoIPFS.ipfsPUT(node, req.params.hash, {filename: req.params.filename, filebuffer: req.body}, function(error, response){
		if(error) res.status(500).send("Failed to put IPFS hash")

		res.setHeader("Ipfs-Hash", response)
		res.send("ipfsPUT:OK");
	});
  })
  .get('/ipfsDB/', (req, res)=>{
	let record = req.headers['wrapper'];
	let qry = "INSERT INTO hashes (hash) VALUES ('" + record + "') ON CONFLICT DO NOTHING RETURNING hash";
	mottoDB.mottoQry(qry, (err, dBres) => {
		u.logdebug('Successfully inserted %s into hashes db', record, dBres && dBres.rowCount);
		res.write("inserted", dBres & dBres.rowCount);
		res.send();
	})
  })
  .get('/swarm/:type(peers|connect|bootstrap)(\/)?(:peerhash(*))?', (request,response) => {
	mottoIPFS.swarmPeers(node, request.params, (pl)=>{	response.render('pages/db', {results: pl, title: "Peer List"})	})	  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`)
  )//express() closure

}); //f.spawn closure





