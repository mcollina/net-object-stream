# net-object-stream&nbsp;&nbsp;[![Build Status](https://travis-ci.org/mcollina/net-object-stream.png)](https://travis-ci.org/mcollina/net-object-stream)

Turn any binary stream into an object stream, with multiple codec support

## Example

```js
'use strict'

var net = require('net')
var nos = require('net-object-stream')
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
```

## `netObjectStream(stream, [opts])`

Wraps `stream` into a Duplex object stream, recognized opts:

* `codec`: an object with a `encode` and `decode` method, which will
  be used to encode messages. Valid encoding libraries are
  [protocol-buffers](http://npm.im/protocol-buffers) and
  [msgpack5](http://npm.im/msgpack5). The default one is JSON.

## `netObjectStream.encoder([opts])`

Creates an encoder for the `netObjectStream` protocol, recognized opts:

* `codec`: an object with a `encode` and `decode` method, which will
  be used to encode messages. Valid encoding libraries are
  [protocol-buffers](http://npm.im/protocol-buffers) and
  [msgpack5](http://npm.im/msgpack5). The default one is JSON.

## `netObjectStream.decoder([opts])`

Creates a decoder for the `netObjectStream` protocol, recognized opts:

* `codec`: an object with a `encode` and `decode` method, which will
  be used to encode messages. Valid encoding libraries are
  [protocol-buffers](http://npm.im/protocol-buffers) and
  [msgpack5](http://npm.im/msgpack5). The default one is JSON.

## `netObjectStream.parser([opts])`

Creates a parser for the `netObjectStream` protocol, recognized opts:

* `codec`: an object with a `encode` and `decode` method, which will
  be used to encode messages. Valid encoding libraries are
  [protocol-buffers](http://npm.im/protocol-buffers) and
  [msgpack5](http://npm.im/msgpack5). The default one is JSON.

The parser have a `parser.parse(buf)` function to add data to id.
It will emit `'message'` events when it is able to parse an object.

## `netObjectStream.writeToStream(msg, [opts], stream)`

Write `msg` to the given `stream`, recognized options:

* `codec`: an object with a `encode` and `decode` method, which will
  be used to encode messages. Valid encoding libraries are
  [protocol-buffers](http://npm.im/protocol-buffers) and
  [msgpack5](http://npm.im/msgpack5). The default one is JSON.

## Acknowledgements

This project is kindly sponsored by [nearForm](http://nearform.com).

## License

MIT
