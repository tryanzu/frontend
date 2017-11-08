import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import {view} from './post/view';
import merge from 'lodash/merge';

const DEFAULT_STATE = {
    loading: false,
    error: false,
    post: false,
    voting: false,
};

function intent({DOM, HTTP, props}) {
    const {fetchPost$} = props;

    const voting$ = DOM.select('a.vote').events('click')
        .map(({currentTarget}) => ({id: currentTarget.dataset.id, intent: currentTarget.dataset.intent, type: currentTarget.dataset.type}));

    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const vote$ = HTTP.select('vote')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);
        
    return {
        post$, 
        fetchPost$, 
        vote$,
        voting$,
        authToken$: props.authToken$
    }; 
}

function model(actions) {   

    /**
     * Http write effects.
     */
     const http$ = actions.voting$
        .debug()
        .compose(sampleCombine(actions.authToken$))
        .map(([{type, intent, id}, withAuth]) => ({
            method: 'POST',
            type: 'application/json',
            url: `${Anzu.layer}vote/${type}/${id}`, 
            category: 'vote',
            send: {direction: intent},
            headers: withAuth({})
        }));

    /**
     * Set of reducers based on happening actions, including:
     * - Loading latest post into state.
     * - Setting loading state accordingly.
     * - Voting loading state.
     */
    const postR$ = actions.post$
        .map(p => state => {
            const set = p.comments.set.reduce((acc, c) => ({...acc, [c.id]: c}), {});
            const post = {...p, comments: {...p.comments, list: p.comments.set.map(c => c.id), set}};
            return ({...state, post, loading: false});
        });
    const postLoadingR$ = actions.fetchPost$
        .map(_ => state => ({...state, loading: true}))
    const votingR$ = actions.voting$
        .map(v => state => ({...state, voting: v}));
    const voteR$ = actions.vote$
        .compose(sampleCombine(actions.voting$))
        .map(([status, vote]) => state => (merge(state, {
            voting: false, 
            post: {
                comments: {
                    set: {
                        [vote.id]: {
                            votes: {
                                up: state.post.comments.set[vote.id].votes.up + (vote.intent == 'up' ? 1 : 0),
                                down: state.post.comments.set[vote.id].votes.down + (vote.intent == 'down' ? 1 : 0)
                            }
                        }
                    }
                }
            }
        })));

    const state$ = xs.merge(
        postR$,
        postLoadingR$,
        votingR$,
        voteR$,
    ).fold((state, action) => action(state), DEFAULT_STATE);

    return {
        state$,
        HTTP: http$
    };
}

export function Post({DOM, HTTP, props}) {
	const actions = intent({DOM, HTTP, props});
    const effects = model(actions);
    const vtree$ = view(effects.state$)

    return {
        DOM: vtree$,
        HTTP: effects.HTTP,
    };
};