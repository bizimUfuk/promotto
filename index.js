
var u = require('./src/mottoUtils');

var mottoDB = require('./src/mottoDB');
var mottoIPFS = require('./src/mottoIPFS');

const express = require('express')
var bodyParser = require('body-parser');

const path = require('path')
const PORT = process.env.PORT || 5000

var app = express();
var hash = "";
var node;

const repoPath = path.join(__dirname, 'mottoRepo');
console.log("repoPath: ", repoPath)

mottoIPFS.spawnNode(repoPath, (api)=>{ //initialize node
	node = api;
	app.use(express.static(path.join(__dirname, 'public')))
	  //.use(bodyParser.json()) //for parsing application/json
	 // .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
	 // .use(bodyParser.text({ type: 'text/html' }))
	  .use(bodyParser.raw({inflate: true, limit: '100kb', type: 'text/html'}))
	  .set('views', path.join(__dirname, 'views'))
	  .set('view engine', 'ejs')
	  .get('*',(req, res, next)=>{
		console.log("requested--> method: %s \t url: %s \t path: %s \t orgUrl: %s", req.method, req.url, req.path, req.originalUrl );
		next();
	  })
	  .get('/', function (req, res){		//original url: QmdMnYXQ8xH5bxkAN41mR3g9YzB9N1zZhTzGxR1qk9WUyQ
		mottoIPFS.ipfsCAT(node, "/ipfs/QmdMnYXQ8xH5bxkAN41mR3g9YzB9N1zZhTzGxR1qk9WUyQ/index.html", function (err, extract){ 
			res.render('pages/index', { mottoArea: (err ? err : extract) });
		});
	  })
	  .get('/liveline(\/:hash)?(\/:sub)?', liveline)
	  .post('/vote', function (req, res){ mottoDB.mottoVote(req, (fetch) => res.send(fetch) );  })
	  .get('/db/(:hash)?', function (req, res){ 
		const cond = typeof req.params['hash'] === 'undefined' ? '':"WHERE hash='" + req.params['hash'] + "'";
		var text = "SELECT * FROM hashes " + cond + " ORDER BY did";
		if (req.params.hash === "live_hashes") text = "SELECT * FROM live_hashes()";
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
		let path = "/ipfs/" + hash + "/" + sub;
		mottoIPFS.ipfsCAT(node, path, function (err, extract) {
			res.render('pages/motto', {extract : (err ? err : extract) } );
		});
	  })
	  .put('/ipfs(/:hash)?((/)?:filename)?', function (req, res){
		mottoIPFS.ipfsPUT(node, req.params.hash, {filename: req.params.filename, filebuffer: req.body}, function(error, response){
			if(error) res.status(500).send("Failed to put IPFS hash")
			u.logdebug("response from ipfsPUT for %s: %o",  req.params.hash, response);
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

	  .get('/ipfsd/node', (req, res) => node.repo.stat((e,s)=>res.send(s))  )


	  .listen(PORT, () => console.log(`Listening on ${ PORT }`)
	  )//express() closure

}); //spawnNode closure


function liveline (request, response){
	const cond = typeof request.params.hash === 'undefined' ? '' : "WHERE hash = '" + request.params.hash + "' ";
 	const text = "SELECT * FROM live_hashes() " + cond;

	mottoDB.mottoQry(text, function (err, fetch) {

		const liveHashes = fetch.rows.slice();

		if(err || (Object.keys(liveHashes).length === 0 && liveHashes.constructor === Array) ) response.render('pages/liveline', { alivemottos: (err ? err : []) })

		var mottos = [];		//collection to hold the mottos with extract property
		var counter = 0;

		for (let i = 0; i < liveHashes.length; i++){

			let tempObj = Object.assign({}, liveHashes[i]);

			//convert life to remaining minutes
			tempObj.shill = tempObj['shill']*60000 + new Date(tempObj.mtime).getTime();
			let mottopath = "/ipfs/" + tempObj.hash + "/index.html";
			mottoIPFS.ipfsCAT(node, mottopath, function (err, extract) {

				counter ++;
				if (err) return;

				extract = u.pathfix(extract, "src=\"", "src=\"/ipfs/" + tempObj.hash + "/"); 	///TODO: Fix this workaround for relative paths in index.html files 

				tempObj["extract"] = extract;
				
				if(!err) mottos.push(tempObj);

				if (counter === liveHashes.length) {
					response.render('pages/liveline', { alivemottos : mottos.sort(function(a,b){return b["shill"]-a["shill"]}) });
				}
			});

		} ///for closure
       }); ///mottoQry closure
}


