import xs from 'xstream'
import { glue } from './ext/glue'
import { adapt } from '@cycle/run/lib/adapt'

function makeOn(client) {
    return function (event) {
        const stream$ = xs.createWithMemory({
            eventListener: null,
            start(listener) {
                const channel = client.channel(event)
                this.eventListener = channel.onMessage(args => {
                    listener.next(JSON.parse(args))
                })
            },
            stop() {
                client.removeListener(event, this.eventListener)
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
                socket.send(event)
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