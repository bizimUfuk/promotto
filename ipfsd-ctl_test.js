const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({type: 'proc', exec: require('ipfs') })

f.spawn({ disposable: false , repoPath: "./.ipfsdctlrepo"},(err, ipfsd) => {
  if (err) { throw err }

console.log("IpfsRepo path: ", ipfsd.repo.path);

    ipfsd.init({directory: ipfsd.repo.path},(_) => {
      ipfsd.start((_) => {
        ipfsd.api.id((_, id) => {
          if (err) {
            throw err
          }
          console.log('alice')
          console.log(id)
          //ipfsd.stop()
        })
      })
    })
})


/*
var node = ipfsd.api

//get test
  node.files.cat("QmRdKfihZKweeWKz4EWtJREHh8WjXqdiPp6beidSuXQQUG/index.html", 
  function (err, res) {
    if (err) { throw err }
    console.log("response to cat: ", res.toString('utf-8'))
//Add test
  node.files.add(Buffer.from('hello'),
  function (err, res) {
    if (err) { throw err }
    var response = JSON.stringify(res);
    console.log("response to add: hash-  ", res[0].hash)
	ipfsd.stop(() => {
			console.log("Stopping Ipfsd instance");
			console.log("IPFS Started 4: ", ipfsd.initialized);
		})	
  })	

  })
		
		})
	})

*/

