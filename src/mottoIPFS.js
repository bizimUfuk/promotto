
'use strict';
var u = require("./mottoUtils");


const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({ type: 'proc', exec: require('ipfs')})

const startDaemon = (ipfsd, cb) => {
	ipfsd.start((err, api)=>{
		if(err) { throw err }
		if( ipfsd.started ){ 
			cb( api ); 
		}
	})
}

function spawnNode(rp, cb){
	f.spawn({ disposable: false, repoPath: rp}, (err, ipfsd) => {
		if (err) {	throw err;  }

		if (ipfsd.initialized){
			u.logdebug("ipfsd: already initialized. starting ipfsd>");
			startDaemon(ipfsd, (node) => cb(node) );
		}else{
			u.logdebug("ipfsd: not initialized. initializing>");
			ipfsd.init((err)=>{
				if(err) { throw err }
				u.logdebug("ipfsd: initialized now. starting ipfsd>");
				startDaemon(ipfsd, (node) => cb(node) );
			})
		}
	});
}

const mottoIPFS = {
	spawnNode: spawnNode,
	ipfsPUT: ipfsPUT,
	ipfsCAT: ipfsCAT,
	ipfsLS: ipfsLS,
	swarmPeers: swarmPeers,
};

///IPFS FUNCTIONS
function ipfsCAT(nd, path, goback){

	u.logdebug("ipfsCAT path:", path);
	var pieces = path.split("/");
	var ipfspiece = pieces.indexOf("ipfs");	

	if ( isValidHash(pieces[ipfspiece+1]) === false ) goback("Err: Not valid hash", null);
								
	ipfsLS(nd, path, (err, subItem)=> {

		if (err || subItem === null) goback("Err: ipfsLS error in ipfsCAT. path: " + path.toString(), null );
		
		if (subItem && subItem.length > 0) {
			u.logdebug("Path- %s is a directory dag. Rolling out %d links!", path, subItem.length); 
			let specFileIndex = -1;
			subItem.forEach((itm, ind)=>{if ( isSpecFile(itm.name) ) specFileIndex = ind; })

			if (specFileIndex >= 0){
				if(path.slice(-1) !== "/") path = path + "/";
				ipfsCAT(nd, path + subItem[specFileIndex].name, (err, res) => goback(err, res) );

			}else{ ///no html file inside

				let itemlist = "<html><body><ul>";
				subItem.forEach((it)=> itemlist += "<li><a href='" + path + it.name + "'>" + it.name + "</a></li>\n")
				itemlist += "</ul></body></html>";
				goback( null, itemlist);
			}
		}else if (subItem && subItem.length === 0 ){
			u.logdebug("Catching file type dag > %s", path); 
			nd.files.cat(path, (err, res) =>{
				u.logdebug("\t %s cat result: ", path, err ? "Fail!" : "Success");
				goback(null, res);
			});
		}else{
			console.log("subItem not null but > : ", subItem); 
			goback( "Err -> subItem.type: " + typeof subItem + ".", null);
		}
	
	});
}

function ipfsLS(nd, dag, goback){
	//if (dag === "QmUNLLsPACCz1vL9QVkXqqLX5R1X345qqfHbsf67hvA3Nn") goback(null, null);
	nd.ls(dag, (err, subItem) => {
		goback(err, subItem)
	});
} 

function ipfsPUT(nd, prevDir, data, goback){
	var aData = [];  				/// temporary collection to push the content of the prevDir
	var newData = {content: data.filebuffer, path: "./" + data.filename };  /// new data do add into prevDir

	ipfsLS(nd, prevDir, (err, pfiles)=>{ 		///check whether the prevDir is a Directory (wrapper hash) or something else (empty dir, any hash) 
		if (err) throw err;

		if (pfiles.length !== 0){		///prevDir has pfiles inside

			pfiles.forEach((pfile)=>{
				nd.files.cat(pfile.hash, (err, res) => {

					if (err) throw err;

					aData.push({content: res, path: "./"+pfile.name})

					if (aData.length == pfiles.length) {

						aData.push(newData);

						nd.files.add(aData, [{wrapWithDirectory: true, recursive: true}] , function (err, addedfiles){
							if (err) goback("Error in ipfsPUT. pfiles.length !==0 >> "+err, null);
							u.logdebug("FilesAdded into prev Dir DAG: ", addedfiles);
							let returnhash = addedfiles[addedfiles.findIndex(isWrapper)].hash;
							if (!isValidHash(returnhash)){
								u.logdebug("Err: returnhash-%s is not a valid hash", returnhash.toString());
								goback("Err: returnhash is not a valid hash!", null);
							}else{
								goback(null, returnhash);
							}
						});
					}	
				}); ///nd.files.cat closure
			});
		}else if (JSON.stringify(pfiles) === "[]"){		///prevDir is either emptyDir, or some other thing to ignore

			nd.files.add([newData], [{wrapWithDirectory: true, recursive: true}],(err, addedfiles)=>{
				if (err) goback("Error in ipfsPUT. pfiles === [] >>"+err.toString(), null);

				u.logdebug("FilesAdded into a new Dir DAG: ", addedfiles);
				let returnhash = addedfiles[addedfiles.findIndex(isWrapper)].hash;
				if (!isValidHash(returnhash)){
					u.logdebug("Err: returnhash-%s is not a valid hash", returnhash.toString());
					goback("Err: returnhash is not a valid hash!", null);
				}else{
					goback(null, returnhash);
				}
			});
		}else{
			u.logdebug("ipfsPUT: pfiles not null, neither has length property! Check whats wrong. \n\t pfiles: %O \n\t err: %O", pfiles, err);
			goback("ipfsLS error. prevDir: " + prevDir.toString(), null);
		} //if pfiles.len>0 closure



	}); ///ipfsLS closure
} ///ipfsPUT



function isInDir(sub, dir){
	let isIn = false
	dir.forEach((item)=>{
		if (sub == item.name) isIn = true;
	})
	return isIn
}

function isSpecFile(filename){
	let fileList = ["index.html", "index.htm", "index.shtml"]
	return Boolean(fileList.indexOf(filename) >= 0)
}

function isValidHash(h){
	return h.toString().length === 46 && h.toString().slice(0,2) === "Qm" 
}

function isWrapper(h){
	return h.path == '.';
}



///SWARM FUNCTIONS
function swarmPeers(nd, phash, cb){
	u.logdebug("-->in mottoIPFS.swarmPeers");
	var peerList = [];
	var type = phash['type'];
	var peerhash = phash['peerhash'];

	switch (type){
		case "bootstrap":
			u.logdebug("-->bootstrapping");
			u.readfromtxtfile("./utils/bootstrapnodes.txt", (lst)=>{
				lst.forEach((peer)=>{
					if(peer && (peer !== "--end--")) nd.swarm.connect(peer, (err)=>{
						u.logdebug(err? err: "Connected to: " + peer.toString())
					})
				})
				cb("bootstrap initiated!");
			});
			break;
		case "connect":
			if(peerhash !== 'undefined' ){
				nd.swarm.connect(peerhash, (err)=>{
					u.logdebug(err?"Couldnt connect to: ":"Connected to: ", phash);
					cb(err?"Failed to connect to peer!" : "Connected to peer");
				});
			}
			break;

		case "peers":
			nd.swarm.peers( function(err, peerInfos){
				peerInfos.forEach(function(p){ 
					peerList.push(p.peer.id._idB58String);
					if (peerInfos.length === peerList.length){
						var ret= peerList.reduce( function(acc,cur, ind){
							var temp = {};
							temp['hash']=cur;
							acc.push(temp);
							return acc;
						}, []);
						cb(ret);
					}
				});

			});
			break;
	}
 }

module.exports = mottoIPFS;
