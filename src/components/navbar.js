import {LoginModal} from './modal/login';
import {AccountModal} from './modal/account';
import {intent} from './navbar/intent';
import {model} from './navbar/model';
import {view} from './navbar/view';
import xs from 'xstream';

export function Navbar({DOM, HTTP, storage, fractal}) {
    const actions = intent(DOM, HTTP, storage);
    const account = AccountModal({DOM, HTTP, props: {openLink$: actions.modalLink$}})
    const effects = model(actions, account);
    const vdom$ = view(effects, account, fractal);

    return {
        DOM: vdom$,
        HTTP: xs.merge(effects.HTTP, account.HTTP),
        storage: effects.storage$,
        beep: effects.beep$
    };
}