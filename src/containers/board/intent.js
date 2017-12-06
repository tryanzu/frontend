import xs from 'xstream';
import switchPath from 'switch-path';

const Routes = {
    '/': false,
    '/p/:slug/:id': (slug, id) => ({type: 'goTo', page: 'post', post: {id, slug}})
};

export function intent({history, storage, HTTP}) {
    const routePath$ = history
        .map(location => switchPath(location.pathname, Routes))
        .filter(route => route.value != false);

    const authToken$ = storage.local.getItem('id_token')
        .filter(token => token !== null && String(token).length > 0)
        .startWith(false)
        .map(token => {
            if (token != false) {
                return headers => ({...headers, Authorization: 'Bearer ' + token});
            }

            return f => f
        });

    const fetchUser$ = authToken$
        .filter(withAuth => {
            const headers = {},
                x = withAuth(headers);
            return x != headers;
        });

    /**
     * HTTP read effects.
     */
    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const comments$ = HTTP.select('comments')
        .map(response$ => response$.replaceError(err => xs.of({status: 'error', err})))
        .flatten()
        .filter(r => !('err' in r))
        .map(r => 'err' in r ? r : r.body);

    const user$ = HTTP.select('me')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const unauthorized$ = HTTP
        .filter(req => {
            return 'headers' in req && 'Authorization' in req.headers;
        })
        .select() // This fetches all happening requests having the Auth header present.
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => res instanceof Error && res.message == 'Unauthorized');

    return { routePath$, authToken$, unauthorized$, user$, post$, comments$, fetchUser$ };
}