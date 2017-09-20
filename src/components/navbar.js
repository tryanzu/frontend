import {LoginModal} from './modal/login';
import {intent} from './navbar/intent';
import {model} from './navbar/model';
import {view} from './navbar/view';

export function Navbar({DOM, HTTP, storage}) {
    const actions = intent(DOM, HTTP, storage);
    const login = LoginModal({DOM, HTTP, props: actions.modalLink$});
    const effects = model(actions, login);
    const vdom$ = view(effects, login);

    return {
        DOM: vdom$,
        HTTP: effects.http$,
        storage: effects.storage$
    };
}