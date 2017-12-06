import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import merge from 'lodash/merge';

const DEFAULT_STATE = {
    list: [],
    offset: 0,
    loading: false,
    error: false,
    subcategories: false,
};

export const LENSED_STATE = {
    shared: {
        user: false
    },
    own: {
        ...DEFAULT_STATE
    }
};

export function model(actions) {
    const update = (state, fields) => ({...state, own: merge(state.own, fields)});

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
    const postsLoadingR$ = actions.fetch$.map(res => state => update(state, {loading: true}));
    const postsR$ = actions.posts$.map(res => state => update(state, {list: state.own.list.concat(res.feed), loading: false}));
    const subcategoriesR$ = actions.subcategories$.map(subcategories => state => update(state, {subcategories}));

    const reducers$ = xs.merge(
        xs.of(state => merge(LENSED_STATE, state)),
        postsR$,
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