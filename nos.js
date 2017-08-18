'use strict'

var duplexify = require('duplexify')
var through2 = require('through2')
var bl = require('bl')
var pump = require('pump')
var varint = require('varint')
var nextTick = require('process-nextick-args')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Buffer = require('safe-buffer').Buffer

var jsonCodec = {
  encode: function (obj) {
    return JSON.stringify(obj)
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
  readable._parser = new Parser(opts)
  readable._parser.on('message', function (msg) {
    readable.push(msg)
  })

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
  this._parser.parse(buf)
  callback()
}

function Parser (opts) {
  if (!(this instanceof Parser)) {
    return new Parser(opts)
  }

  this._codec = getCodec(opts)
  this._bl = bl()
  this._leftToRead = 0

  this._states = [
    '_parseHeader',
    '_parsePayload'
  ]
  this._stateCounter = 0
}

inherits(Parser, EventEmitter)

Parser.prototype.parse = function (buf) {
  if (!buf || buf.length === 0) {
    return
  }

  this._bl.append(buf)

  while (this._bl.length > 0 && this[this._states[this._stateCounter]]()) {
    this._stateCounter++

    if (this._stateCounter >= this._states.length) {
      this._stateCounter = 0
    }
  }

  return this._bl.length
}

Parser.prototype._parseHeader = function () {
  var result = varint.decode(this._bl.slice(0, 8)) || 0
  if (result !== undefined) {
    this._leftToRead = result
    this._bl.consume(varint.decode.bytes)
    return true
  } else {
    return false
  }
}

Parser.prototype._parsePayload = function () {
  if (this._bl.length >= this._leftToRead) {
    this.emit('message', this._codec.decode(this._bl.slice(0, this._leftToRead)))
    this._bl.consume(this._leftToRead)
    this._leftToRead = -1
    return true
  }
  return false
}

function encode (obj, enc, callback) {
  var toWrite = this._codec.encode(obj)
  this.push(new Buffer(varint.encode(calcLength(toWrite))))
  this.push(toWrite)
  callback()
}

netObjectStream.encoder = encoder
netObjectStream.decoder = decoder

function uncork (stream) {
  stream.uncork()
}

var defaultOpts = {
  codec: jsonCodec
}

function calcLength (obj) {
  if (typeof obj === 'string') {
    return Buffer.byteLength(obj)
  } else {
    return obj.length
  }
}

function writeToStream (msg, opts, stream, callback) {
  if (!stream) {
    stream = opts
    opts = defaultOpts
  }

  if (stream.cork) {
    stream.cork()
    nextTick(uncork, stream)
  }
  var encode = opts.codec.encode
  var toWrite = encode(msg)

  stream.write(Buffer.from(varint.encode(calcLength(toWrite))))
  return stream.write(toWrite, callback)
}

netObjectStream.parser = Parser
netObjectStream.writeToStream = writeToStream

module.exports = netObjectStream
