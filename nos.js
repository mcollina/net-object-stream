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

function getCodec (opts) {
  var codec = jsonCodec
  if (opts && opts.codec) {
    codec = opts.codec
  }
  return codec
}

function encoder (opts) {
  var writable = through2.obj(encode)
  writable._codec = getCodec(opts)
  return writable
}

function decoder (opts) {
  var readable = through2.obj(decode)
  readable._codec = getCodec(opts)
  readable._bl = bl()
  readable._leftToRead = 0

  return readable
}

function netObjectStream (source, opts) {

  var readable = decoder(opts)
  var writable = encoder(opts)

  pump(source, readable)
  pump(writable, source)

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

netObjectStream.encoder = encoder
netObjectStream.decoder = decoder

module.exports = netObjectStream
