import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    list: [],
    offset: 0,
    loading: false,
    loadingPost: false,
    error: false,
    subcategories: false,
    post: false
};

export function model(actions) {

    /**
     * History write effects including:
     * - Open new posts url.
     */
    const routeTo$ = actions.linkPost$
        .map(link => link.path);

    /**
     * HTTP write effects including:
     * - Fetch new posts.
     * - Categories fetching.
     */
    const fetchPosts$ = actions.fetch$
        .fold((offset, event) => event.type == 'next' ? offset + 8 : 0, 0)
        .map(offset => ({
            method: 'GET',
            url: Anzu.layer + 'feed', 
            category: 'posts',
            query: {limit: 15, offset}
        }));

    const http$ = xs.merge(
        xs.of({
            method: 'GET',
            url: Anzu.layer + 'category', 
            category: 'categories',
        }), 
        fetchPosts$, 
    );

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
    const postsLoadingR$ = actions.fetch$.map(res => state => ({...state, loading: true}));
    const postsR$ = actions.posts$.map(res => state => ({...state, list: state.list.concat(res.feed), loading: false}));
    const postR$ = actions.post$.map(res => state => ({...state, post: res, loadingPost: false}));
    const subcategoriesR$ = actions.subcategories$.map(subcategories => state => ({...state, subcategories}));

    const reducers$ = xs.merge(
        xs.of(state => DEFAULT_STATE),
        postsR$,
        postR$,
        postsLoadingR$,
        subcategoriesR$
    );
    
    return {
        HTTP: http$,
        history: routeTo$,
        fractal: reducers$,
        linkPost$: actions.linkPost$  
    };
}