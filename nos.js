'use strict'

var empty = new Buffer(0)
var duplexify = require('duplexify')
var through2 = require('through2')
var bl = require('bl')
var pump = require('pump')
var varint = require('varint')

var jsonCodec = {
  encode: function (obj) {
    return new Buffer(JSON.stringify(obj))
  },
  decode: function (buf) {
    return JSON.parse(buf)
  }
}

function netObjectStream (source, opts) {
  opts = opts || {}

  var readable = through2.obj(decode)
  var writable = through2.obj(encode)

  pump(source, readable)
  pump(writable, source)

  readable._codec = opts.codec || jsonCodec
  writable._codec = readable._codec

  readable._bl = bl()
  readable._leftToRead = 0

  return duplexify.obj(writable, readable)
}

function decode (buf, enc, callback) {
  this._bl.append(buf)

  if (this._leftToRead === 0) {
    this._leftToRead = varint.decode(this._bl.slice(0, 4)) || 0
    this._bl.consume(varint.decode.bytes)
  } else if (this._bl.length >= this._leftToRead) {
    this.push(this._codec.decode(this._bl.slice(0, this._leftToRead)))
    this._bl.consume(this._leftToRead)
    this._leftToRead = 0
  }

  if (this._bl.length > 0) {
    this._transform(empty, null, callback)
  } else {
    callback()
  }
}

function encode (obj, enc, callback) {
  var toWrite = this._codec.encode(obj)
  this.push(new Buffer(varint.encode(toWrite.length)))
  this.push(toWrite)
  callback()
}

module.exports = netObjectStream
