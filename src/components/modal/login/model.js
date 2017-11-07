import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    showForgotPassword: false,
    sentRecover: false,
    resolving: false,
    email: '',
    password: '',
    rememberMe: false,
    error: false
};

export function model(actions) {

    /**
     * HTTP write effects including:
     * - User info from token stream.
     */
    const requestToken$ = actions.sent$.filter(name => name == 'login')
        .compose(sampleCombine(actions.fields$))
        .map(([sent, [email, password]]) => ({
                method: 'POST',
                url: Anzu.layer + 'auth/get-token', 
                category: 'token',
                query: {email, password}
            })
        );

    const requestPassword$ = actions.sent$.filter(name => name == 'forgot')
        .compose(sampleCombine(actions.fields$))
        .map(([_, [email]]) => ({
            method: 'GET',
            url: Anzu.layer + 'auth/lost-password',
            category: 'recover-password',
            query: {email}
        }));

    const http$ = xs.merge(requestToken$, requestPassword$);

    const token$ = actions.token$.filter(res => !(res instanceof Error))
        .map(res => res.body.token);

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
     const fieldsR$ = actions.fields$.map(([email, password]) => state => ({...state, email, password}));
     const sentR$ = actions.sent$.map(sent => state => ({...state, resolving: sent, error: false}));
     const forgotR$ = actions.forgot$.map(show => state => ({...state, showForgotPassword: show}));
     const rememberMeR$ = actions.rememberMe$.map(active => state => ({...state, rememberMe: active}));
     const tokenR$ = actions.token$.map(res => state => {
        return {
            ...state, 
            resolving: false,
            error: res instanceof Error ? res : false
        };
     });
    const recoverR$ = actions.recover$.map(res => state => ({...state, sentRecover: true}));

    const state$ = xs.merge(
        fieldsR$, 
        sentR$, 
        tokenR$, 
        forgotR$, 
        rememberMeR$,
        recoverR$
    ).fold((state, action) => action(state), DEFAULT_STATE);

    return {
        state$,
        token$,
        HTTP: http$,
    };
}