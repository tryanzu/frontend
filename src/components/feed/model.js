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

    const fetchPost$ = actions.linkPost$.map(link => ({
        method: 'GET',
        url: Anzu.layer + 'posts/' + link.id, 
        category: 'post'
    }));

    const http$ = xs.merge(
        xs.of({
            method: 'GET',
            url: Anzu.layer + 'category', 
            category: 'categories',
        }), 
        fetchPosts$, 
        fetchPost$,
    );

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
    const postsLoadingR$ = actions.fetch$.map(res => state => ({...state, loading: true}));
    const postsR$ = actions.posts$.map(res => state => ({...state, list: state.list.concat(res.feed), loading: false}));
    const postR$ = actions.post$.map(res => state => ({...state, post: res, loadingPost: false}));
    const subcategoriesR$ = actions.subcategories$.map(subcategories => state => ({...state, subcategories}));
    
    /**
     const fieldsR$ = actions.fields$.map(([email, password]) => state => ({...state, email, password}));
     const sentR$ = actions.sent$.map(sent => state => ({...state, resolving: sent, error: false}));
     const forgotR$ = actions.forgot$.map(show => state => ({...state, showForgotPassword: show}));
     const tokenR$ = actions.token$.map(res => state => {
        return {
            ...state, 
            resolving: false,
            error: res instanceof Error ? res : false
        };
     });
    const recoverR$ = actions.recover$.map(res => state => ({...state, sentRecover: true}));
    */

    const state$ = xs.merge(
        postsR$,
        postR$,
        postsLoadingR$,
        subcategoriesR$
    ).fold((state, action) => action(state), DEFAULT_STATE);
    
    return {
        state$,
        HTTP: http$,
        history: routeTo$,
        linkPost$: actions.linkPost$  
    };
}