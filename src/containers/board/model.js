import xs from 'xstream'
import sampleCombine from 'xstream/extra/sampleCombine'
import merge from 'lodash/fp/merge'

const DEFAULT_STATE = {
    page: 'board',
    user: {
        resolving: false,
        user: false
    },
    categories: false,
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
}

export function model(actions) {
    const postRoute$ = actions.routePath$
        .map(route => route.value)
        .filter(action => action.page == 'post')
        .compose(sampleCombine(actions.authToken$))
        .remember()
    
    const publishRoute$ = actions.routePath$
        .map(route => route.value)
        .filter(action => action.page == 'publish')

    const fetchUser$ = actions.fetchUser$.remember()

    /**
     * Compute HTTP & storage write effects.
     */
    const storage$ = actions.unauthorized$.map(res => ({key: 'id_token', action: 'removeItem'}))
    const glue$ = actions.rawToken$.map(token => {
        if (token) {
            return {event: 'auth', params: {token}}
        }

        return {event: 'auth:clean', params: {}}
    })

    // HTTP write effects.
    const http$ = xs.merge(
        // Fetch categories data first.
        xs.of({
            method: 'GET',
            url: Anzu.layer + 'category',
            category: 'categories',
        }),

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
    )

    const reducers$ = xs.merge(
        // Default root state.
        xs.of(state => DEFAULT_STATE),

        // Mapping some reducers into the main chain.
        fetchUser$
            .mapTo(state => merge(state)({user: {user: false, resolving: true}})),
        postRoute$
            .map(([action]) => state => merge(state)({page: 'board', post: {resolving: true, postId: action.post.id, comments: {resolving: true}}})),
        publishRoute$
            .map(() => state => merge(state)({page: 'publish'})),
        actions.categories$
            .map(categories => state => merge(state)({categories, feed: {subcategories: subcategories(categories)}})),  
        actions.user$
            .map(user => state => merge(state)({user: {user, resolving: false}})),
        actions.post$
            .map(post => state => merge(state)({post: {post, resolving: false}})),
        actions.comments$
            .map(list => state => ({...state, post: {...state.post, comments: {...state.post.comments, list, resolving: false}}})),
        actions.logout$
            .mapTo(state => merge(state)({user: {user: false, resolving: false}})),
    )
        
    return {
        HTTP: http$,
        storage: storage$,
        fractal: reducers$,
        glue: glue$
    }
}

function subcategories(categories) {
    return categories
        .map(category => category.subcategories)
        .reduce((kvmap, subcategories) => {
            for (let k in subcategories) {
                kvmap[subcategories[k].id] = subcategories[k]
            }

            return kvmap
        }, {})
}