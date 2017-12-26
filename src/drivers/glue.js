import {glue} from './ext/glue';
import xs from 'xstream';
import {adapt} from '@cycle/run/lib/adapt';
import { arch } from 'os';

function makeOn(client) {
    return function (event) {
        const stream$ = xs.createWithMemory({
            eventListener: null,
            start(listener) {
                this.eventListener = client.onMessage(args => {
                    listener.next(JSON.parse(args))
                });
            },
            stop() {
                client.removeListener(event, this.eventListener)
            }
        });

        return stream$;
    };
}

export function makeGlueDriver(host = '', options = {}) {
    const socket = glue(host, options);

    return function glueDriver(outgoing$) {
        outgoing$.addListener({
            next: event => {
                console.log(event);
                socket.emit.apply(socket, event);
            },
            error: err => console.error(err),
            complete: () => console.log('completed'),
        })

        return {
            get: makeOn(socket),
            dispose: socket.close.bind(socket)
        }
    };
}