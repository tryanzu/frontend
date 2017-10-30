import xs from 'xstream';
import {view} from './post/view';

const DEFAULT_STATE = {
    loading: false,
    error: false,
    post: false
};

export function Post({DOM, HTTP}) {

	// INTENTS...
	const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    // MODEL
    const postR$ = post$.map(res => state => ({...state, post: res}));

    const state$ = xs.merge(
        postR$,
    ).fold((state, action) => action(state), DEFAULT_STATE);

    //const actions = intent(sources);
    //const effects = model(actions);
    const vtree$ = view(state$.debug());
    
    return {
        DOM: vtree$,
    };
};