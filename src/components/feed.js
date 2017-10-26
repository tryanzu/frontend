import {intent} from './feed/intent';
import {model} from './feed/model';
import {view} from './feed/view';

export function Feed(sources) {
	console.log('shit happens', sources);
    const actions = intent(sources);
    const effects = model(actions);
    const vtree$ = view(effects.state$);

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        router: actions.router$
    };
};