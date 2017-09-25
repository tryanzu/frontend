import xs from 'xstream';

const CONFIG = {
    serverVersion: '0.1.5',
    newVersion: false,
    defaultChannel: 'general',
    channels: {
        'general': {
            name: 'General',
            youtubePlayer: false,
            youtubeVideo: '',
            headline: ''
        },
        'dia-de-hueva': {
            name: 'Día de hueva',
            youtubePlayer: false,
            youtubeVideo: ''
        }
    }
};

const GUEST_USER = {
    _id: false,
    username: 'guest',
    image: '',
    role: 'guest'
};

const DEFAULT_STATE = {
    config: CONFIG,
    list: [],
    online: [],
    highlighted: false,
    message: '',
    lock: true,
    channel: 'general',
    player: false,
    missing: 0,
    user: GUEST_USER
};

/**
 *
 * @param actions$
 * @returns {{state$: *, socket$: (*), history$: Function}}
 */
export function model(actions) {
    const currentUser$ = actions.signature$.startWith(GUEST_USER);
    const remoteConfig$ = actions.config$
        .map(config => {
            return state => ({
                ...state,
                config: {...state.config, ...config, newVersion: state.config.serverVersion != config.serverVersion}
            });
        });

    const scroll$ = actions.scroll$
        .startWith({lock: true})
        .map(status => {
            return state => Object.assign({}, state, {
                lock: status.lock,
                missing: status.lock === true ? 0 : state.missing
            });
        });

    const channel$ = actions.pathname$
        .map(path => path == '' ? CONFIG.defaultChannel : path);

    const channelReducer$ = channel$
        .map(channel => {
            return state => ({...state, channel, list: [], lock: true});
        });

    const userReducer$ = currentUser$.map(user => {
        return state => ({...state, user});
    });

    const highlightReducer$ = actions.rhighlighted$.map(item => {
        return state => ({...state, highlighted: item});
    })

    const message$ = actions.msg$
        .map(message => {
            return state => Object.assign({}, state, {message: message.sent ? '' : message.payload})
        });

    const onlineUsers$ = actions.online$
        .map(list => {
            return state => ({...state, online: list});
        });

    /**
     * Transform sent messages to packed list of actual commands.
     *
     * @type {Stream<U>|Stream}
     */
    const sent$ = xs.combine(currentUser$, actions.msg$.filter(m => m.sent))
        .map(data => {
            const [user, msg] = data;

            return message(cmessage(user, msg, new Date()));
        });

    const packedSent$ = sent$.map(message => list(message));
    const messages$ = xs.merge(actions.messages$, packedSent$)
        .map(packed => state => {
            const channel = packed.channel || false;
            let list = channel == false || state.channel == channel || channel === 'log' ? state.list.concat(packed.list) : state.list;

            if ((channel == false || state.channel == channel || channel === 'log') && state.lock) {
                list = list.slice(-100);
            } 

            return {...state, list: list, missing: state.lock === false ? state.missing + packed.list.length : state.missing};
        });

    /**
     * Merge all reducers to compute state.
     *
     * @type {*}
     */
    const state$ = xs.merge(remoteConfig$, userReducer$, channelReducer$, highlightReducer$, messages$, message$, scroll$, onlineUsers$)
        .fold((state, action) => action(state), DEFAULT_STATE)
        .startWith(DEFAULT_STATE);

    const socketSend$ = sent$.map(sent => (['send', sent.data.content]));
    const socketChannel$ = channel$.map(channel => (['chat update-me', channel]));
    const adminActions$ = actions.idActions$.map(action => ([action.type, action.id]));
    const videoConfig$ = actions.videoConfig$.map(video => (['chat update-video', video]));
    const videoLive$ = actions.videoLive$.map(live => (['chat update-live', live]));
    const socket$ = xs.merge(socketChannel$, socketSend$, adminActions$, videoConfig$, videoLive$);

    return {
        state$,
        socket$,
        history$: actions.channel$
    };
}

function list(...messages) {
    return {list: messages};
}

function message(data) {
    return {type: 'MESSAGE', data};
}

function cmessage(user, message, date) {
    return {
        content: message.payload.trim(),
        user_id: user._id,
        username: user.username,
        image: user.image,
        role: user.role,
        timestamp: date.getTime()
    };
}