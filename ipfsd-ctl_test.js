// Start a remote disposable node, and get access to the api
// print the node id, and stop the temporary daemon

const IPFSFactory = require('ipfsd-ctl')
const f = IPFSFactory.create({port: 9091, type: 'proc', exec: require('ipfs')})

f.spawn((err, ipfsd) => {
  if (err) { throw err }

  var node = ipfsd.api

//get test
  node.files.cat("QmX3VWtJQn5EKSRHwzG9QX52NZs4sFyXDSWemsUcse3Ljs/index.html", 
  function (err, res) {
    if (err) { throw err }
    console.log("response to cat: ", res.toString('utf-8'))
  })

//Add test
  node.files.add(Buffer.from('hello'),
  function (err, res) {
    if (err) { throw err }
    var response = JSON.stringify(res);
    console.log("response to add: hash-  ", res[0].hash)
  })
})
