import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import delay from 'xstream/extra/delay';
import {view} from './post/view';
import merge from 'lodash/merge';

const DEFAULT_STATE = {
    shared: {
        user: false
    },
    own: {
        resolving: false,
        post: false,
        error: false,
        voting: false,
        comments: {
            resolving: false,
            list: false
        },
        ui: {
            commenting: false,
            commentingType: false,
            commentingId: false
        },
        toasts: []
    }
};

function intent({DOM, HTTP, props}) {
    const voting$ = DOM.select('a.vote').events('click')
        .map(({currentTarget}) => ({id: currentTarget.dataset.id, intent: currentTarget.dataset.intent, type: currentTarget.dataset.type}));

    const commentFocus$ = xs.merge(
        DOM.select('textarea.replybox').events('focus').map(event => ({focus: true})),
        DOM.select('button#cc').events('click').map(event => ({focus: false}))
    );

    const replyTo$ = DOM.select('.reply-to').events('click')
        .map(({currentTarget}) => ({id: currentTarget.dataset.id}));

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

    const comments$ = HTTP.select('comments')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .map(r => 'err' in r ? r : r.body);
    
    return {
        user$,
        post$, 
        fetchPost$, 
        vote$,
        voting$,
        comments$,
        commentFocus$,
        replyTo$,
        authToken$: props.authToken$
    }; 
}

function model(actions) {   
    const update = (state, fields) => ({...state, own: merge(state.own, fields)});

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
    const commentsR$ = actions.comments$.map(comments => state => update(state, {comments: {list: comments, resolving: false}}));
    const commentFocusR$ = actions.commentFocus$.debug().map(event => state => update(state, {
        ui: {
            ...state.ui, 
            commenting: event.focus, 
            replyTo: event.focus == false ? false : state.ui.replyTo
        }
    }));

    const replyToR$ = actions.replyTo$.map(c => state => update(state, {ui: {replyTo: c.id}}));
    const postR$ = actions.post$
        .map(p => state => {
            const set = p.comments.set.reduce((acc, c) => ({...acc, [c.id]: c}), {});
            const post = {...p, comments: {...p.comments, list: p.comments.set.map(c => c.id), set}};
            return update(state, {
                post, 
                resolving: false, 
                ui: {commentFocus: false}
            });
        });

    const postLoadingR$ = actions.fetchPost$
        .map(_ => state => update(state, {resolving: true, comments: {resolving: true}}));

    const votingR$ = actions.voting$
        .map(v => state => update(state, {voting: v}));

    const voteErr$ = actions.vote$
        .filter(res => res.status == 'error')
        .debug();

    const voteFailR$ = voteErr$.map(res => state => update(state, {
        voting: false, 
        toasts: state.own.toasts.concat([
            {type: 'error', content: 'Pasados 15 minutos ya no es posible cambiar tu voto en este comentario.'}
        ])
    }));

    const voteFailDismissR$ = voteErr$
        .compose(delay(5000))
        .map(_ => state => update(state, {toasts: state.own.toasts.length > 0 ? state.own.toasts.slice(1) : []}));

    const voteR$ = actions.vote$
        .filter(res => res.status == 'okay')
        .compose(sampleCombine(actions.voting$))
        .map(([status, vote]) => state => (update(state, {
            voting: false, 
            post: {
                comments: {
                    set: {
                        [vote.id]: {
                            votes: {
                                up: state.own.post.comments.set[vote.id].votes.up + (vote.intent == 'up' ? 1 : 0),
                                down: state.own.post.comments.set[vote.id].votes.down + (vote.intent == 'down' ? 1 : 0)
                            }
                        }
                    }
                }
            }
        })));

    const reducers$ = xs.merge(
        xs.of(state => merge(DEFAULT_STATE, state)),
        postR$,
        postLoadingR$,
        commentsR$,
        commentFocusR$,
        votingR$,
        voteFailR$,
        voteFailDismissR$,
        voteR$,
        replyToR$,
    );

    return {
        fractal: reducers$,
        HTTP: http$
    };
}

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