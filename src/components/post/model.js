import xs from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import delay from 'xstream/extra/delay'
import merge from 'lodash/merge'
import mergeWith from 'lodash/mergeWith'

const CLEARED_UI = {
    reply: '',
    replyTo: false,
    commenting: false,
    commentingType: false,
    commentingId: false
}

export const DEFAULT_STATE = {
    resolving: false,
    post: false,
    error: false,
    voting: false,
    comments: {
        missing: 0,
        resolving: false,
        list: false,
        map: {}
    },
    ui: CLEARED_UI,
    toasts: [],
    votes: {}
}

export const LENSED_STATE = {shared: {user: false}, own: {...DEFAULT_STATE}}

export function model(actions) {   
    const update = (state, fields) => ({...state, own: mergeWith(state.own, fields, (obj, source) => Array.isArray(obj) ? source : undefined)})
    const lastSentReply$ = actions.sentReply$
        .filter(res => ('id' in res))
        .map(res => (res.id))
        .startWith(false)

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
                headers: withAuth({})
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
                headers: withAuth({})
            })),
        
        // Post actions.
        actions.postActions$
            .filter(({ action }) => (action === 'delete'))
            .compose(sampleCombine(actions.authToken$))
            .map(([{ id }, withAuth]) => ({
                method: 'DELETE',
                type: 'application/json',
                url: `${Anzu.layer}posts/${id}`,
                category: 'post.delete',
                headers: withAuth({})
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
                    before: 'before' in params ? params.before : ''
                },
                headers: withAuth({})
            }))
    )

    /**
     * Set of reducers based on happening actions, including:
     * - Loading latest post into state.
     * - Setting loading state accordingly.
     * - Voting loading state.
     */
    const commentFocusR$ = actions.commentFocus$.map(event => state => update(state, {
        ui: {
            commenting: event.focus, 
            commentingType: 'type' in event ? event.type : state.own.ui.commentingType,
            commentingId: 'id' in event ? event.id : state.own.ui.commentingId,
            replyTo: event.focus == false ? false : state.own.ui.replyTo
        }
    }))

    const replyToR$ = actions.replyTo$.map(event => state => { 
        const { shared, owned } = state
        
        // Check if user is authenticated.
        if (shared.user === false) {
            return {...state, shared: {...shared, modal: {...shared.modal, active: true, modal: 'account'}}}
        }
        
        return update(state, { ui: { replyTo: event.id, commenting: false } })
    })

    const postR$ = actions.post$
        .map(p => state => {
            const set = p.comments.set.reduce((acc, c) => ({...acc, [c.id]: c}), {});
            const post = {...p, comments: {...p.comments, list: p.comments.set.map(c => c.id), set}}
            return update(state, {
                post, 
                resolving: false, 
                ui: {commentFocus: false}
            })
        })

    const postLoadingR$ = actions.fetchPost$
        .map(_ => state => update(state, {resolving: true, comments: {resolving: true}}))

    const votingR$ = actions.voting$
        .map(v => state => update(state, {voting: v}))

    const voteErr$ = actions.vote$
        .filter(res => res.status == 'error')

    const voteFailR$ = voteErr$.map(({ err }) => state => update(state, {
        voting: false, 
        toasts: state.own.toasts.concat([
            { type: 'error', content: err.status === 412 ? 'No cuentas con tributo suficiente para calificar =(' : 'Pasados 15 minutos ya no es posible cambiar tu voto en este comentario.'}
        ])
    }))

    const voteFailDismissR$ = voteErr$
        .compose(delay(5000))
        .map(_ => state => update(state, {toasts: state.own.toasts.length > 0 ? state.own.toasts.slice(1) : []}))

    const voteR$ = actions.vote$
        .filter(res => ('action' in res))
        .compose(sampleCombine(actions.voting$))
        .map(([status, vote]) => state => {
            const value = status.action == 'create' ? 1 : -1

            return update(state, {
                voting: false,
                comments: {
                    map: {
                        [vote.id]: {
                            votes: {
                                up: state.own.comments.map[vote.id].votes.up + (vote.intent == 'up' ? value : 0),
                                down: state.own.comments.map[vote.id].votes.down + (vote.intent == 'down' ? value : 0)
                            }
                        }
                    }
                },
                votes: {
                    [vote.id]: status.action == 'create' ? (vote.intent == 'up' ? 1 : -1) : false
                }
            })
        })

    const reducers$ = xs.merge(
        xs.of(state => merge(LENSED_STATE, state)),
        postR$,
        postLoadingR$,
        commentFocusR$,
        votingR$,
        voteFailR$,
        voteFailDismissR$,
        voteR$,
        replyToR$,

        // Root sent reply virtual appending...
        actions.sentReply$
            .filter(res => ('id' in res && res.reply_type == 'post'))
            .map(res => state => update(state, { ui: { ...CLEARED_UI }, comments: { list: state.own.comments.list.concat([{ ...res, author: { ...state.shared.user } }]) } })),
        
        // Nested sent reply virtual appending...
        actions.sentReply$
            .filter(res => ('id' in res && res.reply_type == 'comment'))
            .map(res => state => {
                const reply = {...res, author: { ...state.shared.user }}

                return update(state, { 
                    ui: { ...CLEARED_UI }, 
                    comments: { 
                        list: state.own.comments.list.map(comment => {
                            if (comment.id !== res.reply_to) {
                                return comment
                            }
                            const replies = comment.replies || {}
                            const list = replies.list || []
                            const count = replies.count || 0

                            return { ...comment, replies: { ...replies, list: list.concat(reply), count: count + 1 }}
                        })
                    }
                })
            }),

        // New list of comments.
        actions.comments$
            .filter(comments => (comments.type == 'initial'))
            .map(comments => state => update(state, { comments: { list: comments.list, resolving: false } })),

        // Recent comments append.
        actions.comments$
            .filter(comments => (comments.type == 'recent'))
            .map(comments => state => update(state, { comments: { missing: 0, list: state.own.comments.list.concat(comments.list.reverse()), resolving: false } })),

        // Recent comments prepend.
        actions.comments$
            .filter(comments => (comments.type == 'before'))
            .map(comments => state => update(state, { comments: { missing: 0, list: comments.list.reverse().concat(state.own.comments.list), resolving: false } })),

        // Reply content.
        actions.replyContent$
            .map(reply => state => update(state, { ui: { reply } })),

        // Incoming comments from remote.
        actions.postGlue$
            .filter(event => (event.action == 'new-comment'))
            .compose(sampleCombine(lastSentReply$))
            .filter(([event, lastSent]) => (lastSent === false || event.comment_id !== lastSent))
            .map(event => state => update(state, { comments: { missing: state.own.comments.missing + 1 } }))
    )

    return {
        fractal: reducers$,
        HTTP: http$
    };
}