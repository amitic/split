//filter will reemit the data if cb(err,pass) pass is truthy

// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has received 'end'


const through = require('through')
const Decoder = require('string_decoder').StringDecoder

module.exports = split

//TODO pass in a function to map across the lines.

function split(matcher, mapper, options) {
  let encoding = options && typeof options.encoding !== 'undefined' ? options.encoding : undefined
  let decoder = new Decoder(encoding)
  let soFar = ''
  let maxLength = options && options.maxLength;
  let trailing = options && options.trailing === false ? false : true
  if ('function' === typeof matcher)
    mapper = matcher, matcher = null
  if (!matcher)
    matcher = /\r?\n/

  function queue(stream, piece) {
    stream.queue(Buffer.from(piece, encoding))
  }

  function emit(stream, piece) {
    if (mapper) {
      try {
        piece = mapper(piece)
      } catch (err) {
        return stream.emit('error', err)
      }
      if ('undefined' !== typeof piece)
        queue(stream, piece)
    } else
      queue(stream, piece)
  }

  function next(stream, buffer) {
    let pieces = ((soFar != null ? soFar : '') + buffer).split(matcher)
    soFar = pieces.pop()

    if (maxLength && soFar.length > maxLength)
      return stream.emit('error', new Error('maximum buffer reached'))

    for (let i = 0; i < pieces.length; i++) {
      let piece = pieces[i]
      emit(stream, piece)
    }
  }

  return through(function (b) {
      next(this, decoder.write(b))
    },
    function () {
      if (decoder.end)
        next(this, decoder.end())
      if (trailing && soFar != null)
        emit(this, soFar)
      this.queue(null)
    })
}