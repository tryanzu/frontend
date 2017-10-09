import {LoginModal} from './modal/login';
import {AccountModal} from './modal/account';
import {intent} from './navbar/intent';
import {model} from './navbar/model';
import {view} from './navbar/view';
import xs from 'xstream';

export function Navbar({DOM, HTTP, storage, socketIO, socketIOChat}) {
    const actions = intent(DOM, HTTP, storage, socketIO, socketIOChat);
    const account = AccountModal({DOM, HTTP, props: {openLink$: actions.modalLink$}})
    const effects = model(actions, account);
    const vdom$ = view(effects, account);

    return {
        DOM: vdom$,
        HTTP: effects.http$,
        storage: effects.storage$,
        angular: effects.ng$,
        beep: effects.beep$,
        socketIOChat: effects.socket$
    };
}