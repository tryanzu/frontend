import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import merge from 'lodash/fp/merge';

const DEFAULT_STATE = {
    user: {
        resolving: false,
        user: false
    },
    post: {
        resolving: false,
        postId: false,
        post: false,
        comments: {
            resolving: false,
            list: false
        }
    },
    feed: {
        list: [],
        offset: 0,
        loading: false,
        loadingPost: false,
        error: false,
        subcategories: false,
        post: false
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
        fetchUser$
            .mapTo(state => merge(state)({user: {user: false, resolving: true}})),
        postRoute$
            .map(([action]) => state => merge(state)({post: {resolving: true, postId: action.post.id, comments: {resolving: true}}})),
        actions.user$
            .map(user => state => merge(state)({user: {user, resolving: false}})),
        actions.post$
            .map(post => state => merge(state)({post: {post, resolving: false}})),
        actions.comments$
            .map(list => state => ({...state, post: {...state.post, comments: {...state.post.comments, list, resolving: false}}})),
    );
        
    return {
        HTTP: http$,
        storage: storage$,
        fractal: reducers$
    };
}