import {intent} from './chat/intent';
import {model} from './chat/model';
import {view} from './chat/view';

export function Chat(sources) {
    const actions$ = intent(sources.DOM, sources.socketIO, sources.history);
    const model$ = model(actions$);
    const vtree$ = view(model$.state$);

    return {
        DOM: vtree$,
        socketIO: model$.socket$,
        history: model$.history$
    };
};