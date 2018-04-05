// Start a disposable node, and get access to the api
// print the node id, and stop the temporary daemon
console.log("starting \n")
const IPFSFactory = require('ipfsd-ctl')
console.log("IPFSFactory defined \n")
const f = IPFSFactory.create({port: 9090, type: 'proc', exec: require('ipfs') })
console.log("here ", f.version)
console.log("here agan")
f.spawn(function (err, ipfsd) {
console.log("in f.spawn")
  if (err) { throw err }
  console.log("no error here")
  ipfsd.api.id(function (err, id) {
    if (err) { throw err }
    console.log("soon id \n")
    console.log(id)
    //ipfsd.stop()
  })
})
