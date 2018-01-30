import xs from 'xstream'

export function intent({DOM, HTTP, glue, fractal, props}) {
    /**
     * DOM read effects including:
     */
    const voting$ = DOM.select('a.vote').events('click')
        .map(({currentTarget}) => ({id: currentTarget.dataset.id, intent: currentTarget.dataset.intent, type: currentTarget.dataset.type}))

    const commentFocus$ = xs.merge(
        DOM.select('textarea.replybox')
            .events('focus')
            .map(event => ({focus: true, type: event.target.dataset.type, id: event.target.dataset.id})),
        DOM.select('button#cc')
            .events('click')
            .map(event => ({focus: false}))
    )

    const replyTo$ = DOM.select('.reply-to').events('click')
        .map(({ currentTarget }) => ({ id: currentTarget.dataset.id }))

    const replyContent$ = DOM.select('form.reply-form textarea').events('input')
        .map(({ target }) => target.value)

    const reply$ = DOM.select('form.reply-form').events('submit', { preventDefault: true })
        .map(({ target }) => ({ type: target.dataset.type, id: target.dataset.id }))

    const postActions$ = DOM.select('.post-action')
        .events('click')
        .map(event => ({action: event.currentTarget.dataset.action, id: event.currentTarget.dataset.id}))

    const loadMore$ = DOM.select('a.load-more')
        .events('click')
        .map(event => (event.currentTarget.dataset.count))

    /**
     * HTTP read effects including: 
     * - new posts data
     * - voting data
     * - comments data
     */
    const fetchPost$ = HTTP.select('post').mapTo(true)

    const user$ = HTTP.select('me')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)

    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)

    const vote$ = HTTP.select('vote')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .map(r => 'err' in r ? r : r.body)

    const comments$ = HTTP.select('comments')
        .map(response$ => response$.replaceError(err => xs.of({ status: 'error', err })))
        .flatten()
        .map(r => 'err' in r ? r : r.body)
    
    const recentComments$ = HTTP.select('comments.recent')
        .map(response$ => response$.replaceError(err => xs.of({ status: 'error', err })))
        .flatten()
        .map(r => 'err' in r ? r : r.body)

    const sentReply$ = HTTP.select('reply')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .map(r => 'err' in r ? r : r.body)

    const postGlue$ = props.router$
        .filter(action => action.page == 'post')
        .map(action => (glue.get(`post.${action.post.id}`)))
        .flatten()
        .map(event => (event.p))
    
    return {
        user$,
        post$, 
        fetchPost$, 
        vote$,
        voting$,
        comments$,
        commentFocus$,
        replyTo$,
        replyContent$,
        reply$,
        sentReply$,
        postActions$,
        postGlue$,
        loadMore$,
        recentComments$,
        state$: fractal.state$,
        authToken$: props.authToken$
    } 
}