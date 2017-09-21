import {intent} from './signup/intent';
import {model} from './signup/model';
import {view} from './signup/view';

export function SignupModal({DOM, HTTP}) {
    const actions = intent(DOM, HTTP);
    const model$ = model(actions);
    const view$ = view(model$.state$);

    return {
        DOM: view$,
        HTTP: model$.HTTP,
        token: model$.token$
    };
};