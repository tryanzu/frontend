import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const CONFIG = {
    serverVersion: '0.1.6',
    newVersion: false,
    viewer: {
        title: 'Charla Buldariana',
        subtitle: '',
        youtubePlayer: false,
        youtubeVideo: '',
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
    const user$ = actions.signature$.startWith(GUEST_USER);
    const configR$ = actions.config$
        .map(config => state => ({
            ...state,
            config: {
                ...state.config, 
                ...config, 
                newVersion: state.config.serverVersion != config.serverVersion
            }
        }));
    const scrollR$ = actions.scroll$
        .startWith({lock: true})
        .map(status => state => ({
            ...state,
            lock: status.lock,
            missing: status.lock === true ? 0 : state.missing
        }));

    const userR$ = user$.map(user => state => ({...state, user}));
    const highlightR$ = actions.rhighlighted$.map(item => state => ({...state, highlighted: item}));
    const messageR$ = actions.msg$.map(message => state => ({...state, message: message.sent ? '' : message.payload}));
    const onlineR$ = actions.online$.map(list => state => ({...state, online: list}));

    /**
     * Transform sent messages to packed list of actual commands.
     *
     * @type {Stream<U>|Stream}
     */
    const sent$ = actions.msg$.filter(message => message.sent)
        .compose(sampleCombine(user$))
        .map(([msg, user]) => message(cmessage(user, msg, new Date())));

    const sentLists$ = sent$.map(message => list(message));
    const messagesR$ = xs.merge(actions.messages$, sentLists$)
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
    const state$ = xs.merge(
        configR$, 
        userR$, 
        highlightR$, 
        messagesR$, 
        messageR$, 
        scrollR$, 
        onlineR$
    ).fold((state, action) => action(state), DEFAULT_STATE);

    const socket$ = xs.merge(

        // Get user data....
        xs.of(['user me']),

        // Whenever channel changes we need to write out a socket command to update the list of messages.
        xs.of(['chat update-me']), 

        // User messages that got sent.
        sent$.map(sent => (['send', sent.data.content])),

        // Direct actions to be written.
        actions.idActions$.map(action => ([action.type, action.id])),
        
        // Live streaming config.
        actions.videoId$.map(video => (['chat update-video', video])), 
        
        // Live streaming config.
        actions.videoPlayer$.map(active => (['chat video', active])), 

        // Live streaming toggle...
        actions.videoLive$.map(live => (['chat live', live]))
    );

    return {
        state$,
        socket$
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