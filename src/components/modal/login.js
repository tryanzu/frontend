import {intent} from './login/intent';
import {model} from './login/model';
import {view} from './login/view';

export function LoginModal({DOM, HTTP}) {
    const actions = intent(DOM, HTTP);
    const effects = model(actions);
    const view$ = view(effects.state$);

    return {
        DOM: view$,
        HTTP: effects.HTTP,
        token: effects.token$
    };
};