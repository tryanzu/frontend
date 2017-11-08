import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import delay from 'xstream/extra/delay';
import {view} from './post/view';
import merge from 'lodash/merge';

const DEFAULT_STATE = {
    user: false,
    loading: false,
    error: false,
    post: false,
    voting: false,
    toasts: []
};

function intent({DOM, HTTP, props}) {

    const voting$ = DOM.select('a.vote').events('click')
        .map(({currentTarget}) => ({id: currentTarget.dataset.id, intent: currentTarget.dataset.intent, type: currentTarget.dataset.type}));

    const fetchPost$ = HTTP.select('post').mapTo(true);

    const user$ = HTTP.select('me')
            .map(response$ => response$.replaceError(err => xs.of(err)))
            .flatten()
            .filter(res => !(res instanceof Error))
            .map(res => res.body);

    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const vote$ = HTTP.select('vote')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .map(r => 'err' in r ? r : r.body)
        .debug();
    
    return {
        user$,
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
    const userR$ = actions.user$.map(user => state => ({...state, user}));

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

    const voteErr$ = actions.vote$
        .filter(res => res.status == 'error')
        .debug();

    const voteFailR$ = voteErr$.map(res => state => ({
        ...state, 
        voting: false, 
        toasts: state.toasts.concat([
            {type: 'error', content: 'Pasados 15 minutos ya no es posible cambiar tu voto en este comentario.'}
        ])
    }));

    const voteFailDismissR$ = voteErr$
        .compose(delay(5000))
        .map(_ => state => ({...state, toasts: state.toasts.length > 0 ? state.toasts.slice(1) : []}));

    const voteR$ = actions.vote$
        .filter(res => res.status == 'okay')
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
        voteFailR$,
        voteFailDismissR$,
        voteR$,
        userR$,
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