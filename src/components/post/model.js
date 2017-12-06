import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import delay from 'xstream/extra/delay';
import merge from 'lodash/merge';

export const DEFAULT_STATE = {
    resolving: false,
    post: false,
    error: false,
    voting: false,
    comments: {
        resolving: false,
        list: false
    },
    ui: {
        replyTo: false,
        commenting: false,
        commentingType: false,
        commentingId: false
    },
    toasts: []
};

export const LENSED_STATE = {shared: {user: false}, own: {...DEFAULT_STATE}};

export function model(actions) {   
    const update = (state, fields) => ({...state, own: merge(state.own, fields)});

    /**
     * Http write effects, including:
     * - votes requests
     * - comments requests
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

    const http2$ = actions.reply$
        .compose(sampleCombine(actions.replyContent$, actions.authToken$));

    http2$.addListener({
      next: i => console.log(i),
      error: err => console.error(err),
      complete: () => console.log('completed')
    })

    /**
     * Set of reducers based on happening actions, including:
     * - Loading latest post into state.
     * - Setting loading state accordingly.
     * - Voting loading state.
     */
    const commentsR$ = actions.comments$.map(comments => state => update(state, {comments: {list: comments, resolving: false}}));
    const commentFocusR$ = actions.commentFocus$.map(event => state => update(state, {
        ui: {
            commenting: event.focus, 
            commentingType: 'type' in event ? event.type : state.own.ui.commentingType,
            commentingId: 'id' in event ? event.id : state.own.ui.commentingId,
            replyTo: event.focus == false ? false : state.own.ui.replyTo
        }
    }));

    const replyToR$ = actions.replyTo$.map(c => state => update(state, {ui: {replyTo: c.id, commenting: false}}));
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
        xs.of(state => merge(LENSED_STATE, state)),
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