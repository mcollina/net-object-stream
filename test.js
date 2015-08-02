'use strict'

var test = require('tape')
var through2 = require('through2')
var duplexify = require('duplexify')
var nos = require('./')

function genPair () {
  var aIn = through2()
  var aOut = through2()
  var bIn = through2()
  var bOut = through2()

  aOut.pipe(bIn)
  bOut.pipe(aIn)

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