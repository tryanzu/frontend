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
            list: false,
            map: {}
        },

        // Current user votes map with values.
        votes: {} 
    },
    feed: {
        category: false,
        list: [],
        offset: 0,
        loading: false,
        loadingPost: false,
        error: false,
        subcategories: false,
        post: false,
        counters: {
            posts: 0,
            recent: {}, // Recent new comments.
            missed: {}, // Comments in other posts. 
        }
    }
}

export function model(actions) {
    const router$ = actions.routePath$
        .map(({ route, location }) => ({ ...route.value, location}))

    const postRoute$ = actions.routePath$
        .map(({ route }) => route.value)
        .filter(action => action.page == 'post')
        .compose(sampleCombine(actions.authToken$))
        .remember()
    
    const publishRoute$ = actions.routePath$
        .map(({ route }) => route.value)
        .filter(action => action.page == 'publish')
    
    const categoryRoute$ = actions.routePath$
        .map(({ route }) => route.value)
        .filter(action => action.page == 'category')

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
                query: {
                    limit: 10,
                    sort: 'reverse'
                },
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
            .map(([action]) => state => {
                const { id } = action.post
                const recent = state.feed.counters.recent[id] || 0
                const missed = state.feed.counters.missed[id] || 0

                return merge(state)({
                    page: 'board',
                    post: {
                        resolving: true,
                        postId: id,
                        comments: { resolving: true }
                    },
                    feed: {
                        counters: {
                            recent: {
                                [id]: recent + missed
                            },
                            missed: {
                                [id]: 0
                            }
                        }
                    }
                })
            }),
        publishRoute$
            .map(() => state => merge(state)({page: 'publish'})),
        actions.categories$
            .map(categories => state => merge(state)({ 
                categories, 
                feed: { 
                    subcategories: subcategoriesBy(categories, 'id'), 
                    subcategoriesBySlug: subcategoriesBy(categories, 'slug')
                }
            })),  
        actions.user$
            .map(user => state => merge(state)({user: {user, resolving: false}})),
        actions.post$
            .map(post => state => merge(state)({post: {post, resolving: false}})),
        
        // Comment list stream events. Reverse is needed for because of UI reversed order (asc comments) 
        actions.comments$
            .map(stuff => state => ({ 
                ...state, 
                post: { 
                    ...state.post, 
                    votes: stuff.hashtables.votes, 
                    comments: { 
                        ...state.post.comments, 
                        list: stuff.list.reverse(), 
                        map: {
                            ...state.post.comments.map, 
                            ...stuff.hashtables.comments
                        },
                        resolving: false,
                    }
                }
            })),
        actions.logout$
            .mapTo(state => merge(state)({user: {user: false, resolving: false}})),
    )
        
    return {
        router$,
        HTTP: http$,
        storage: storage$,
        fractal: reducers$,
        glue: glue$,
    }
}

function subcategoriesBy(categories, field) {
    return categories
        .map(category => category.subcategories)
        .reduce((kvmap, subcategories) => {
            for (let k in subcategories) {
                kvmap[subcategories[k][field]] = subcategories[k]
            }

            return kvmap
        }, {})
}