import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
    user: false,
    token: false,
    notifications: [],
    connectedCount: 0,
    resolving: {
        user: false,
        notifications: false
    },
    modal: {
        signin: false
    }
};

export function model(actions, accountModal) {

    /**
     * HTTP write effects including:
     * - User info from token stream.
     */
    const requestUser$ = actions.token$.filter(token => token !== false)
        .map(token => ({
                url: Anzu.layer + 'user/my', 
                category: 'me',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
        );

    const requestNotifications$ = actions.openNotifications$
        .compose(sampleCombine(actions.token$))
        .map(([event, token]) => ({
            url: Anzu.layer + 'notifications',
            category: 'notifications',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }));

    const http$ = xs.merge(requestUser$, requestNotifications$, accountModal.HTTP);

    /**
     * LocalStorage write effects including:
     * - Auth token reset
     * - New auth token persistence 
     */
    const storage$ = xs.merge(

        // Received new token from login dataflow.
        accountModal.token.map(token => ({key: 'id_token', value: token})),

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

    const openNotificationsR$ = requestNotifications$
        .map(r => state => ({
            ...state, 
            resolving: {
                ...state.resolving,
                notifications: true
            },
        }));

    const notificationsR$ = actions.notifications$
        .map(notifications => state => ({
            ...state, 
            resolving: {
                ...state.resolving,
                notifications: false
            },
            user: {
                ...state.user,
                notifications: 0,
            },
            notifications
        }));

    const incomingNotificationR$ = actions.userChan$.filter(ev => ev.fire == 'notification')
        .map(ev => state => ({
            ...state, 
            resolving: {
                ...state.resolving,
                user: false
            },
            user: {
                ...state.user,
                notifications: ev.count
            }
        }));

    const logoutR$ = actions.logoutLink$.map(() => state => ({
        ...state,
        user: false,
        token: false
    }));

    const onlineR$ = actions.online$.map(count => state => ({...state, connectedCount: count}));

    const state$ = xs.merge(tokenR$, userR$, logoutR$, modalR$, notificationsR$, openNotificationsR$, incomingNotificationR$, onlineR$)
        .fold((state, action) => action(state), DEFAULT_STATE);

    const ng$ = xs.merge(
        // Links that will be processed by angular's router
        actions.ngLink$.map(path => ({type: 'location', path})),

        // User has logged in
        accountModal.token.map(token => ({type: 'token', token})),

        // User has logged out
        actions.logoutLink$.map(() => ({type: 'token', token: ''}))
    );

    const beep$ = actions.userChan$.filter(ev => ev.fire == 'notification' && ev.count > 0);
    const socket$ = actions.ngLink$.filter(href => href !== '/chat').map(path => (['chat disconnect']));

    return {
        state$,
        http$,
        storage$,
        ng$,
        beep$,
        socket$
    };
}