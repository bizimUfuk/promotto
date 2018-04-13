const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({type: 'proc', exec: require('ipfs') })

let node

const startDaemon = (ipfsd) => {
	ipfsd.start((err, api)=>{
		if(err) { throw err }
		if(ipfsd.started){ 
			node = api; 
			testCatGet( (err) => {
				console.log("Err: ", err);
				ipfsd.stop(()=>console.log("IPFS Daemon is stopped! ")) 
			})
		}
	})
}

f.spawn({ disposable: false , repoPath: "./.ipfsdctlrepo"},(err, ipfsd) => {
    if (err) { throw err }

    if (ipfsd.initialized){
	startDaemon(ipfsd);
	
    }else{
	ipfsd.init((err)=>{
		if(err) { throw err }
		startDaemon(ipfsd);
	})
    }
})


function testCatGet (cb){
	//get test
	node.files.cat("QmRdKfihZKweeWKz4EWtJREHh8WjXqdiPp6beidSuXQQUG/index.html", function (err, res) {
	    if (err) { cb(err) }

	    console.log("response to cat: ", res.toString('utf-8'))

	    //Add test
	    node.files.add(Buffer.from('hello'), function (err, res) {
		if (err) { cb(err) }
		console.log("response to add: hash-  ", res[0].hash)
		
		cb(null)
	    })//add test closure

	}) //get test closure
}
