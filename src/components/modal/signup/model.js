import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    resolving: false,
    email: '',
    username: '',
    password: '',
    error: false,
    done: false,
};

export function model(actions) {
    /**
     * HTTP write effects including:
     * - User signup from token stream.
     */
    const requestToken$ = actions.sent$
        .filter(sent => sent === true)
        .compose(sampleCombine(actions.fields$))
        .map(params => {
            const [email, username, password] = params[1];
            return {
                method: 'POST',
                url: Anzu.layer + 'user',
                category: 'signup',
                send: { email, password, username },
            };
        });

    const token$ = actions.token$
        .filter(res => !(res instanceof Error))
        .map(res => res.body.token);

    /**
     * Reducers.
     * Streams mapped to reducer functions.
     */
    const fieldsR$ = actions.fields$.map(
        ([email, username, password]) => state => ({
            ...state,
            email,
            username,
            password,
        })
    );
    const sentR$ = actions.sent$.map(sent => state => ({
        ...state,
        resolving: sent,
    }));
    const tokenR$ = actions.token$.map(res => state => ({
        ...state,
        resolving: false,
        error: res instanceof Error ? res : false,
        done: !(res instanceof Error),
    }));

    const state$ = xs
        .merge(fieldsR$, sentR$, tokenR$)
        .fold((state, action) => action(state), DEFAULT_STATE);

    return {
        state$,
        token$,
        HTTP: requestToken$,
    };
}
