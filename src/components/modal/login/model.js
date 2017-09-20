import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    active: false,
    resolving: false,
    email: '',
    password: '',
    error: false
};

export function model(actions) {

    /**
     * Write side effects.
     */
    const requestToken$ = actions.sent$.filter(sent => sent === true)
        .compose(sampleCombine(actions.fields$))
        .map(([sent, [email, password]]) => ({
                method: 'POST',
                url: 'http://localhost:3200/v1/auth/get-token', 
                category: 'token',
                query: {email, password}
            })
        );

    const token$ = actions.token$.filter(res => !(res instanceof Error))
        .map(res => res.body.token);

    const opened$ = xs.merge(actions.activeLogin$, token$.mapTo(false));

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
     const activeR$ = opened$.map(active => state => ({...state, active}));
     const fieldsR$ = actions.fields$.map(([email, password]) => state => ({...state, email, password}));
     const sentR$ = actions.sent$.map(sent => state => ({...state, resolving: sent}));
     const tokenR$ = actions.token$.map(res => state => {
        return {
            ...state, 
            resolving: false,
            error: res instanceof Error ? res : false
        };
     });

    const state$ = xs.merge(activeR$, fieldsR$, sentR$, tokenR$)
        .fold((state, action) => action(state), DEFAULT_STATE);

    return {
        state$,
        token$,
        HTTP: requestToken$,
    };
}