import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import merge from 'lodash/merge';

const DEFAULT_STATE = {
    list: [],
    offset: 0,
    loading: false,
    error: false,
    subcategories: false,
    subcategoriesBySlug: false,
    endReached: false,
    category: false
};

export const LENSED_STATE = {
    shared: {
        user: false,
        postId: false
    },
    own: {
        ...DEFAULT_STATE
    }
};

export function model(actions) {
    const update = (state, fields) => ({...state, own: {...state.own, ...fields}});

    /**
     * History write effects including:
     * - Open new posts url.
     */
    const routeTo$ = actions.linkPost$
        .map(link => ({type: 'push', pathname: link.path, state: {}}));

    /**
     * HTTP write effects including:
     * - Fetch new posts.
     * - Categories fetching.
     */

    const paginate$ = xs.merge(

        // Bottom scroll will acumulate the offset.
        actions.scroll$
            .filter(event => (event.bottom === true))
            .mapTo({ type: 'next' }),
        
        // New page fetch requests will reset the offset.
        actions.fetch$.mapTo({ type: 'reload' })

    ).fold((offset, event) => (event.type == 'next' ? offset + 15 : 0), 0).drop(1)

    const fetchPosts$ = paginate$
        .compose(sampleCombine(actions.fetch$))
        .map(([offset, event]) => ({
            method: 'GET',
            url: Anzu.layer + 'feed', 
            category: 'posts',
            query: {
                limit: 15, 
                category: 'category' in event ? event.category : '',
                offset
            }
        }))
        .remember()

    const http$ = fetchPosts$

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
    const reducers$ = xs.merge(
        xs.of(state => merge(LENSED_STATE, state)),
        
        // Post loading
        actions.fetch$
            .map(event => state => update(state, { loading: true, list: [], category: 'category' in event ? event.category : state.category})),
        
        // Posts fetch loaded
        actions.posts$
            .map(res => state => update(state, { list: state.own.list.concat(res.feed), endReached: res.feed.length === 0, loading: false })),

        // New remote comments on feed posts.
        actions.feedGlue$
            .filter(event => (event.fire == 'new-comment'))
            .map(event => state => {
                const key = state.shared.postId == event.id ? 'count' : 'newCount'
                const list = state.own.list.map(post =>
                    post.id != event.id
                        ? post
                        : { ...post, comments: { ...post.comments, [key]: parseInt(post.comments[key] || 0) + 1 } }
                )

                return update(state, { list })
            })
    );
    
    return {
        HTTP: http$,
        history: routeTo$,
        fractal: reducers$,
        linkPost$: actions.linkPost$  
    };
}