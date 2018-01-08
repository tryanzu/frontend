import xs from 'xstream'
import switchPath from 'switch-path'
import dropRepeats from 'xstream/extra/dropRepeats'

const Routes = {
    '/': false,
    '/p/:slug/:id': (slug, id) => ({ type: 'goTo', page: 'post', post: { id, slug } }),
    '/publicar': { type: 'goTo', page: 'publish' },
    '/c/:slug': slug => ({ type: 'goTo', page: 'category', category: { slug } }),
}

export function intent({ history, storage, HTTP, fractal }) {
    const routePath$ = history
        .map(location => switchPath(location.pathname, Routes))
        .filter(route => route.value != false)
        .remember()

    const rawToken$ = storage.local.getItem('id_token')
        .map(token => token !== undefined && token !== null && String(token).length > 0 ? token : false)
        .startWith(false)

    const authToken$ = rawToken$.map(token => {
            if (token != false) {
                return headers => ({...headers, Authorization: 'Bearer ' + token})
            }

            return f => f
        })

    const logout$ = storage.local.getItem('id_token')
        .filter(token => token == undefined || token == null)
        .mapTo(true)

    const fetchUser$ = authToken$
        .filter(withAuth => {
            const headers = {},
                x = withAuth(headers)
            return x != headers
        })

    const page$ = fractal.state$
        .map(state => state.page)
        .compose(dropRepeats())

    /**
     * HTTP read effects including:
     * 
     * - Post fetch data.
     * - New comments
     * - User data
     * - Unauthorized api calls.
     */
    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)

    const comments$ = HTTP.select('comments')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .filter(r => !('err' in r))
        .map(r => 'err' in r ? r : r.body)

    const user$ = HTTP.select('me')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)
    
    const categories$ = HTTP.select('categories')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)

    const unauthorized$ = HTTP
        .filter(req => {
            return 'headers' in req && 'Authorization' in req.headers
        })
        .select() // This fetches all happening requests having the Auth header present.
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => res instanceof Error && res.message == 'Unauthorized')

    return { page$, routePath$, authToken$, unauthorized$, user$, post$, comments$, categories$, fetchUser$, logout$, rawToken$ }
}