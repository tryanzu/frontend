import xs from 'xstream';
import {view} from './post/view';

const DEFAULT_STATE = {
    loading: false,
    error: false,
    post: false
};

export function Post({DOM, HTTP, props}) {

	// INTENTS...
	const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    // MODEL
    const postR$ = post$.map(res => state => ({...state, post: res, loading: false}));
    const postLoadingR$ = props.fetchPost$.map(res => state  => ({...state, loading: true}))
    const state$ = xs.merge(
        postR$,
        postLoadingR$
    ).fold((state, action) => action(state), DEFAULT_STATE);

    //const actions = intent(sources);
    //const effects = model(actions);
    const vtree$ = view(state$);
    
    return {
        DOM: vtree$,
    };
};