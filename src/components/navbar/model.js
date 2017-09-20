import xs from 'xstream';

const DEFAULT_STATE = {
    user: false,
    token: false,
    resolving: {
        user: false
    },
    modal: {
        signin: false
    }
};

export function model(actions, loginModal) {

    /**
     * HTTP write effects including:
     * - User info from token stream.
     */
    const requestUser$ = actions.token$.filter(token => token !== false)
        .map(token => ({
                url: 'http://localhost:3200/v1/user/my', 
                category: 'me',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        );

    const http$ = xs.merge(requestUser$, loginModal.HTTP);

    /**
     * LocalStorage write effects including:
     * 
     */
    const storage$ = xs.merge(

        // Received new token from login dataflow.
        loginModal.token.map(token => ({key: 'id_token', value: token})),

        // Logout link.
        actions.logoutLink$.map(() => ({key: 'id_token', value: ''}))
    ); 

    /**
     * Reducers.
     * 
     * Intent translated to state using reducers.
     */
    const modalR$ = actions.modalLink$.map(ev => state => ({
        ...state,
        modal: {
            ...state.modal,
            [ev.modal]: !state.modal[ev.modal]
        }
    }));

    const tokenR$ = actions.token$.map(token => state => ({
        ...state, 
        resolving: {
            ...state.resolving,
            user: token !== false
        },
        token
    }));

    const userR$ = actions.user$.map(data => state => ({
        ...state, 
        resolving: {
            ...state.resolving,
            user: false
        },
        user: data
    }));

    const logoutR$ = actions.logoutLink$.map(() => state => ({
    	...state,
    	user: false,
    	token: false
    }));

    const state$ = xs.merge(tokenR$, userR$, logoutR$, modalR$)
        .fold((state, action) => action(state), DEFAULT_STATE);

    return {
        state$,
        http$,
        storage$
    };
}