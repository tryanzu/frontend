import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import delay from 'xstream/extra/delay';
import {intent} from './post/intent';
import {model} from './post/model';
import {view} from './post/view';
import merge from 'lodash/merge';

export function Post({DOM, HTTP, fractal, props}) {
	const actions = intent({DOM, HTTP, props});
    const effects = model(actions);
    const vtree$ = view(fractal.state$)

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
        fractal: effects.fractal
    };
};