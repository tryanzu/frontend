import xs from 'xstream'
import { glue } from './ext/glue'
import { adapt } from '@cycle/run/lib/adapt'

function makeOn(client) {
    return function (event) {
        const stream$ = xs.createWithMemory({
            eventListener: null,
            start(listener) {
                client.send(JSON.stringify({event: 'listen', params: {chan: event}}))
                this.channel = client.channel(event)
                this.eventListener = this.channel.onMessage(args => {
                    listener.next(JSON.parse(args))
                })
            },
            stop() {
                client.send(JSON.stringify({ event: 'unlisten', params: { chan: event } }))
                this.channel = null
                this.eventListener = null
            }
        })

        return stream$
    }
}

export function makeGlueDriver(host = '', options = {}) {
    const socket = glue(host, options)

    return function glueDriver(outgoing$) {
        outgoing$.addListener({
            next: event => {
                socket.send(JSON.stringify(event))
            },
            error: err => console.error(err),
            complete: () => console.log('completed'),
        })

        return {
            get: makeOn(socket),
            dispose: socket.close.bind(socket)
        }
    }
}