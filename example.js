'use strict'

var net = require('net')
var nos = require('./')
var through2 = require('through2')
var pump = require('pump')

var server = net.createServer(function (original) {
  var stream = nos(original)
  pump(stream, through2.obj(), stream)
})

server.listen(4200, function () {
  var stream = nos(net.connect(4200))
  stream.end({ hello: 'world' })
  stream.on('data', console.log)
  stream.on('end', server.close.bind(server))
})
