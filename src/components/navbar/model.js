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
    const requestNotifications$ = actions.openNotifications$
        .compose(sampleCombine(actions.token$))
        .map(([event, token]) => ({
            url: Anzu.layer + 'notifications',
            category: 'notifications',
            headers: {
                Authorization: `Bearer ${token}`
            }
        }));

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

    const state$ = xs.merge(
        tokenR$, 
        logoutR$, 
        modalR$, 
        notificationsR$, 
        openNotificationsR$, 
        incomingNotificationR$, 
    ).fold((state, action) => action(state), DEFAULT_STATE);

    const beep$ = actions.userChan$.filter(ev => ev.fire == 'notification' && ev.count > 0);

    return {
        state$,
        storage$,
        beep$,
        HTTP: requestNotifications$,
    };
}