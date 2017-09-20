import {intent} from './login/intent';
import {model} from './login/model';
import {view} from './login/view';

export function LoginModal({DOM, HTTP, props}) {
    const actions = intent(props, DOM, HTTP);
    const model$ = model(actions);
    const view$ = view(model$.state$);

    return {
        DOM: view$,
        HTTP: model$.HTTP,
        token: model$.token$
    };
};