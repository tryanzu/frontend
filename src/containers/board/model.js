import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    user: {
        resolving: false,
        user: false
    },
    post: {
        resolving: false,
        post: false,
        comments: {
            resolving: false,
            list: false
        }
    }
};

export function model(actions) {
    const postRoute$ = actions.routePath$
        .map(route => route.value)
        .filter(action => action.page == 'post')
        .compose(sampleCombine(actions.authToken$))
        .remember();

    const fetchUser$ = actions.fetchUser$.remember();

    /**
     * Compute HTTP & storage write effects.
     */
    const storage$ = actions.unauthorized$.map(res => ({key: 'id_token', action: 'removeItem'}));
    const http$ = xs.merge(
        // Fetch fresh user data whenever authToken$ gets a value.
        fetchUser$.map(withAuth => ({
            url: Anzu.layer + 'user/my', 
            category: 'me',
            headers: withAuth({})
        })),

        // Post loading route action transformed into http requests.
        postRoute$.map(([action, withAuth]) => xs.of(
            {
                method: 'GET',
                url: Anzu.layer + 'posts/' + action.post.id, 
                category: 'post',
                headers: withAuth({})
            },
            {
                method: 'GET',
                url: Anzu.layer + 'comments/' + action.post.id, 
                category: 'comments',
                headers: withAuth({})
            }
        )).flatten(),
    );

    const reducers$ = xs.merge(
        // Default root state.
        xs.of(state => DEFAULT_STATE),

        // Mapping some reducers into the main chain.
        fetchUser$.mapTo(state => ({...state, user: {...state.user, user: false, resolving: true}})),
        postRoute$.mapTo(state => ({...state, post: {...state.post, resolving: true, comments: {...state.post.comments, resolving: true}}})),
        actions.user$.map(user => state => ({...state, user: {...state.user, user, resolving: false}})),
        actions.post$.map(post => state => ({...state, post: {...state.post, post, resolving: false}})),
        actions.comments$.map(comments => state => ({...state, post: {...state.post, comments: {...state.post.comments, list: comments, resolving: false}}})),
    );
        
    return {
        HTTP: http$,
        storage: storage$,
        fractal: reducers$
    };
}