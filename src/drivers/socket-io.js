import xs from 'xstream';
import {adapt} from '@cycle/run/lib/adapt';

function makeOn(client) {
    return function (event) {
        const stream$ = xs.createWithMemory({
            eventListener: null,
            start(listener) {
                this.eventListener = client.on(event, args => listener.next(args));
            },
            stop() {
                client.removeListener(event, this.eventListener)
            }
        });

        return stream$;
    };
}

export function makeSocketIODriver(socket) {
    function get(eventName, { multiArgs = false } = {}) {
        const socketStream$ = xs.create({
            start(listener) {
                this.eventListener = multiArgs
                    ? (...args) => listener.next(args)
                    : arg => listener.next(arg);

                console.log(eventName + ' is being listened.');
                socket.on(eventName, args => {
                    console.log(eventName, args)
                    this.eventListener(args);
                });
            },
            stop() {
                socket.removeListener(eventName, this.eventListener);
            },
            eventListener: null,
        });

        return adapt(socketStream$);
    }

    return function socketIODriver(outgoing$) {
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
            dispose: socket.destroy.bind(socket)
        }
    };
}