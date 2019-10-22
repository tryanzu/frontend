import {
    pipe,
    filter,
    merge,
    fromObs,
    map,
    scan,
    fromPromise,
} from 'callbag-basics';
import { channelToObs } from './board/utils';
import { debounce } from 'callbag-debounce';
import subscribe from 'callbag-subscribe';

export function streamChatChannel({ realtime, chan }, next) {
    const types = ['listen:ready', 'boot', 'message', 'log', 'delete', 'star'];
    // Transform this reactive structure into what we finally need (list of messages)
    return pipe(
        // Stream of chat's channel messages from glue socket.
        merge(
            fromObs(channelToObs(realtime, 'chat:' + chan)),
            fromObs(channelToObs(realtime)),
            fromPromise(Promise.resolve({ event: 'boot' }))
        ),
        // Flattening of object params & type
        map(msg => ({ ...msg.params, type: msg.event })),
        // Filtering known messages, just in case.
        filter(msg => types.includes(msg.type)),
        // Merging into single list
        scan(
            (prev, msg) => {
                switch (msg.type) {
                    case 'delete':
                        return {
                            ...prev,
                            list: prev.list.filter(m => m.id !== msg.id),
                        };
                    case 'star':
                        return {
                            ...prev,
                            starred: [msg].concat(prev.starred),
                        };
                    case 'log':
                    case 'message':
                        return {
                            ...prev,
                            list: prev.list.concat(msg),
                        };
                    case 'boot':
                        return {
                            ...prev,
                            starred: [],
                            list: [],
                        };
                    case 'listen:ready':
                        if (chan === msg.chan) {
                            return {
                                ...prev,
                                starred: [],
                                list: [],
                            };
                        }
                        return prev;
                }
            },
            { list: [], starred: [] }
        ),
        debounce(60),
        subscribe({ next })
    );
}
