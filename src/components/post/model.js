import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import delay from 'xstream/extra/delay';
import merge from 'lodash/merge';
import mergeWith from 'lodash/mergeWith';

const CLEARED_UI = {
    reply: '',
    replyTo: false,
    commenting: false,
    commentingType: false,
    commentingId: false,
    updating: false,
    post: false,
};

export const DEFAULT_STATE = {
    resolving: false,
    post: false,
    error: false,
    voting: false,
    comments: {
        missing: 0,
        resolving: false,
        list: false,
        map: {},
    },
    ui: CLEARED_UI,
    toasts: [],
    votes: {},
};

export const LENSED_STATE = {
    shared: { user: false },
    own: { ...DEFAULT_STATE },
};

export function model(actions) {
    const update = (state, fields) => ({
        ...state,
        own: mergeWith(
            state.own,
            fields,
            (obj, source) => (Array.isArray(obj) ? source : undefined)
        ),
    });
    const lastSentReply$ = actions.sentReply$
        .filter(res => 'id' in res)
        .map(res => res.id)
        .startWith(false);

    /**
     * Http write effects, including:
     * - votes requests
     * - comments requests
     */
    const http$ = xs.merge(
        // New votes
        actions.voting$
            .compose(sampleCombine(actions.authToken$))
            .map(([{ type, intent, id }, withAuth]) => ({
                method: 'POST',
                type: 'application/json',
                url: `${Anzu.layer}vote/${type}/${id}`,
                category: 'vote',
                send: { direction: intent },
                headers: withAuth({}),
            })),

        // Replies sent
        actions.reply$
            .compose(sampleCombine(actions.replyContent$, actions.authToken$))
            .map(([{ type, id }, content, withAuth]) => ({
                method: 'POST',
                type: 'application/json',
                url: `${Anzu.layer}comments/${id}?type=${type}`,
                category: 'reply',
                send: { content },
                headers: withAuth({}),
            })),

        // Post actions.
        actions.postActions$
            .filter(({ action }) => action === 'delete')
            .compose(sampleCombine(actions.authToken$))
            .map(([{ id }, withAuth]) => ({
                method: 'DELETE',
                type: 'application/json',
                url: `${Anzu.layer}posts/${id}`,
                category: 'post.delete',
                headers: withAuth({}),
            })),

        // Load more comments
        actions.loadMore$
            .compose(sampleCombine(actions.authToken$, actions.state$))
            .map(([params, withAuth, state]) => ({
                method: 'GET',
                url: Anzu.layer + 'comments/' + state.own.post.id,
                category: params.before ? 'comments.before' : 'comments.recent',
                query: {
                    limit: params.count,
                    offset: 0,
                    sort: 'reverse',
                    before: 'before' in params ? params.before : '',
                },
                headers: withAuth({}),
            })),
        // Post update
        actions.edit$
            .compose(sampleCombine(actions.authToken$, actions.state$))
            .map(([params, withAuth, state]) => ({
                method: 'PUT',
                url: Anzu.layer + 'posts/' + state.own.post.id,
                category: 'post.update',
                send: {
                    kind: 'post',
                    ...state.own.ui.post,
                },
                headers: withAuth({}),
            }))
    );

    /**
     * Set of reducers based on happening actions, including:
     * - Loading latest post into state.
     * - Setting loading state accordingly.
     * - Voting loading state.
     */
    const commentFocusR$ = actions.commentFocus$.map(event => state =>
        update(state, {
            ui: {
                commenting: event.focus,
                commentingType:
                    'type' in event ? event.type : state.own.ui.commentingType,
                commentingId:
                    'id' in event ? event.id : state.own.ui.commentingId,
                replyTo: event.focus == false ? false : state.own.ui.replyTo,
            },
        })
    );

    const replyToR$ = actions.replyTo$.map(event => state => {
        const { shared } = state;

        // Check if user is authenticated.
        if (shared.user === false) {
            return {
                ...state,
                shared: {
                    ...shared,
                    modal: { ...shared.modal, active: true, modal: 'account' },
                },
            };
        }

        return update(state, { ui: { replyTo: event.id, commenting: false } });
    });

    const votingR$ = actions.voting$.map(voting => state => {
        const { shared } = state;

        // Check if user is authenticated.
        if (shared.user === false) {
            return {
                ...state,
                shared: {
                    ...shared,
                    modal: { ...shared.modal, active: true, modal: 'account' },
                },
            };
        }

        return update(state, { voting });
    });

    const postR$ = actions.post$.map(p => state => {
        const set = p.comments.set.reduce(
            (acc, c) => ({ ...acc, [c.id]: c }),
            {}
        );
        const post = {
            ...p,
            comments: {
                ...p.comments,
                list: p.comments.set.map(c => c.id),
                set,
            },
        };
        return update(state, {
            post,
            resolving: false,
            ui: { commentFocus: false },
        });
    });

    const postLoadingR$ = actions.fetchPost$.map(() => state =>
        update(state, { resolving: true, comments: { resolving: true } })
    );

    const voteErr$ = actions.vote$.filter(res => res.status == 'error');
    const voteFailR$ = voteErr$.map(({ err }) => state =>
        update(state, {
            voting: false,
            toasts: state.own.toasts.concat([
                { type: 'error', content: traduceErr(err) },
            ]),
        })
    );

    const voteFailDismissR$ = voteErr$.compose(delay(5000)).map(() => state =>
        update(state, {
            toasts:
                state.own.toasts.length > 0 ? state.own.toasts.slice(1) : [],
        })
    );

    const reducers$ = xs.merge(
        xs.of(state => merge(LENSED_STATE, state)),
        postR$,
        postLoadingR$,
        commentFocusR$,
        votingR$,
        voteFailR$,
        voteFailDismissR$,
        replyToR$,

        // Incoming vote effects.
        actions.vote$
            .filter(res => 'action' in res)
            .compose(sampleCombine(actions.voting$))
            .compose(delay(500))
            .map(([status, vote]) => state => {
                const value = status.action == 'create' ? 1 : -1;

                return update(state, {
                    voting: false,
                    comments: {
                        map: {
                            [vote.id]: {
                                votes: {
                                    up:
                                        state.own.comments.map[vote.id].votes
                                            .up +
                                        (vote.intent == 'up' ? value : 0),
                                    down:
                                        state.own.comments.map[vote.id].votes
                                            .down +
                                        (vote.intent == 'down' ? value : 0),
                                },
                            },
                        },
                    },
                    votes: {
                        [vote.id]:
                            status.action == 'create'
                                ? vote.intent == 'up'
                                    ? 1
                                    : -1
                                : false,
                    },
                });
            }),

        // Root sent reply virtual appending...
        actions.sentReply$
            .filter(res => 'id' in res && res.reply_type == 'post')
            .map(res => state => {
                const { id } = res;
                const list = state.own.comments.list.concat(id);
                return update(state, {
                    ui: { ...CLEARED_UI },
                    comments: {
                        list,
                        map: {
                            [id]: { ...res, author: { ...state.shared.user } },
                        },
                    },
                });
            }),

        // Nested sent reply virtual appending...
        actions.sentReply$
            .filter(res => 'id' in res && res.reply_type == 'comment')
            .map(res => state => {
                const reply = { ...res, author: { ...state.shared.user } };
                const changes = state.own.comments.list
                    .filter(id => id == res.reply_to)
                    .map(id => {
                        const comment = state.own.comments.map[id];
                        const replies = comment.replies || {};
                        const list = replies.list || [];
                        const count = replies.count || 0;

                        return {
                            id,
                            replies: {
                                count: count + 1,
                                list: list.concat(reply),
                            },
                        };
                    })
                    .reduce(
                        (map, comment) => ({ ...map, [comment.id]: comment }),
                        {}
                    );

                return update(state, {
                    ui: { ...CLEARED_UI },
                    comments: {
                        map: {
                            ...changes,
                            [reply.id]: reply,
                        },
                    },
                });
            }),

        // New list of comments.
        actions.comments$
            .filter(comments => comments.type == 'initial')
            .map(({ res }) => state =>
                update(state, {
                    comments: {
                        list: res.list,
                        resolving: false,
                        map: res.hashtables.comments,
                    },
                })
            ),

        // Recent comments append.
        actions.comments$
            .filter(comments => comments.type == 'recent')
            .map(({ res }) => state =>
                update(state, {
                    comments: {
                        missing: 0,
                        list: state.own.comments.list.concat(
                            res.list.reverse()
                        ),
                        map: res.hashtables.comments,
                        resolving: false,
                    },
                })
            ),

        // Recent comments prepend.
        actions.comments$
            .filter(comments => comments.type == 'before')
            .map(({ res }) => state =>
                update(state, {
                    comments: {
                        missing: 0,
                        list: res.list
                            .reverse()
                            .concat(state.own.comments.list),
                        resolving: false,
                        map: res.hashtables.comments,
                    },
                })
            ),

        // Reply content.
        actions.replyContent$.map(reply => state =>
            update(state, { ui: { reply } })
        ),

        // Post editing
        actions.postActions$
            .filter(({ action }) => action === 'update' || action === 'cancel')
            .map(({ action }) => state =>
                update(state, {
                    ui: {
                        updating: action === 'update',
                        post: { ...state.own.post },
                    },
                })
            ),

        actions.editPostFields$.map(updates => state =>
            update(state, {
                ui: {
                    post: {
                        [updates.field]: updates.value,
                    },
                },
            })
        ),

        actions.edit$.mapTo(state =>
            update(state, {
                ui: { updating: false },
                post: {
                    ...state.own.ui.post,
                },
            })
        ),

        // Incoming comments from remote.
        actions.postGlue$
            .filter(event => event.action == 'new-comment')
            .compose(sampleCombine(lastSentReply$))
            .filter(
                ([event, lastSent]) =>
                    lastSent === false || event.comment_id !== lastSent
            )
            .map(() => state =>
                update(state, {
                    comments: { missing: state.own.comments.missing + 1 },
                })
            )
    );

    return {
        fractal: reducers$,
        HTTP: http$,
    };
}

function traduceErr(err) {
    switch (err.status) {
        case 401:
            return 'Necesitas iniciar sesión en tu cuenta para calificar.';
        case 412:
            return 'Necesitas 15 puntos de reputación para poder votar.';
        default:
            return 'Pasados 15 minutos ya no es posible cambiar tu voto en este comentario.';
    }
}
