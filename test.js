'use strict'

var test = require('tape')
var through2 = require('through2')
var duplexify = require('duplexify')
var msgpack = require('msgpack5')
var pump = require('pump')
var nos = require('./')

function genPair () {
  var aIn = through2()
  var aOut = through2()
  var bIn = through2()
  var bOut = through2()

  pump(aOut, bIn)
  pump(bOut, aIn)

  return {
    a: duplexify.obj(aOut, aIn),
    b: duplexify.obj(bOut, bIn)
  }
}

test('converts a binary stream in an object stream', function (t) {
  t.plan(2)

  var pair = genPair()
  var first = nos(pair.a)
  var second = nos(pair.b)
  var msg1 = { hello: 'world' }
  var msg2 = { hello: 'matteo' }

  first.write(msg1)
  second.on('data', function (data) {
    t.deepEqual(data, msg1, 'msg1 matches')
  })
  second.write(msg2)
  first.on('data', function (data) {
    t.deepEqual(data, msg2, 'msg2 matches')
  })
})

test('sends multiple messages', function (t) {
  t.plan(2)

  var pair = genPair()
  var first = nos(pair.a)
  var second = nos(pair.b)
  var msg1 = { hello: 'world' }
  var msg2 = { hello: 'matteo' }

  first.write(msg1)
  second.once('data', function (data) {
    t.deepEqual(data, msg1, 'msg1 matches')

    process.nextTick(first.write.bind(first, msg2))

    second.once('data', function (data) {
      t.deepEqual(data, msg2, 'msg2 matches')
    })
  })
})

test('supports a different codec', function (t) {
  t.plan(2)

  var pair = genPair()
  var first = nos(pair.a, { codec: msgpack() })
  var second = nos(pair.b, { codec: msgpack() })

  // Buffers can be encoded in msgpack, but not in JSON
  var msg1 = { hello: new Buffer('world') }
  var msg2 = { hello: new Buffer('matteo') }

  first.write(msg1)
  second.on('data', function (data) {
    t.deepEqual(data, msg1, 'msg1 matches')
  })
  second.write(msg2)
  first.on('data', function (data) {
    t.deepEqual(data, msg2, 'msg2 matches')
  })
})

test('allows half open streams', function (t) {
  t.plan(2)

  var pair = genPair()
  var first = nos(pair.a)
  var second = nos(pair.b)
  var msg1 = { hello: 'world' }

  second.end()

  // let's put first on flowing mode
  first.on('data', function () {})

  first.on('end', function () {
    t.pass('first ends')

    second.on('data', function (data) {
      t.deepEqual(data, msg1, 'msg1 matches')
    })

    first.write(msg1)
  })
})

test('without duplexify', function (t) {
  t.plan(2)

  var channel = through2()
  var encoder = nos.encoder()
  var decoder = nos.decoder()
  var msg = { 'hello': 'world' }

  encoder.pipe(channel).pipe(decoder)

  encoder.end(msg)
  decoder.on('data', function (data) {
    t.deepEqual(data, msg, 'msg1 matches')
  })

  decoder.on('end', function () {
    t.pass('ended')
  })
})
