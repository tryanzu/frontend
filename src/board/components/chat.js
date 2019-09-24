import React, { useRef, useState, useEffect, useContext } from 'react';
import YouTube from 'react-youtube';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { injectState } from 'freactal';
import { channelToObs, MemoizedBasicMarkdown } from '../utils';
import {
    pipe,
    filter,
    merge,
    fromObs,
    map,
    scan,
    fromPromise,
} from 'callbag-basics';
import { debounce } from 'callbag-debounce';
import subscribe from 'callbag-subscribe';
import { t, translate } from '../../i18n';
import { format, subSeconds, isAfter } from 'date-fns';
import { Flag } from './actions';
import { AuthContext } from '../fractals/auth';
import { useSessionState, useTitleNotification } from '../../hooks';
import { adminTools } from '../../acl';
import { ChatChannelSettingsModal } from './actions';

const tags = helpers(h);
const { main, div, i, input, label } = tags;
const { figure, header, a, img, nav, section } = tags;
const { h1, h5, form, span } = tags;
const { h4, ul, li, p, small } = tags;

function Chat({ state, effects, match, history}) {
    const scrollLockRef = useRef(false);
    const soundRef = useRef(false);
    const [sound, setSound] = useState(false);
    const [lock, setLock] = useState('');
    const [hideVideo, setHideVideo] = useSessionState('hideVideo', false);
    const [chan, setChan] = useState(() => {
        if (match.params.chan && state.chat.channels.has(match.params.chan)) {
            return match.params.chan;
        }
        if (state.site.chat.length > 0) {
            return state.site.chat[0].name;
        }
        return 'general';
    });
    const [counters, setCounters] = useState({});
    const auth = useContext(AuthContext);
    const { chat } = state;

    useEffect(
        () => {
            if (match.params.chan && chat.channels.has(match.params.chan)) {
                setChan(match.params.chan);
            }
            if (!chat.channels.has(match.params.chan)) {
                history.push('/chat');
            }
        },
        [match.params.chan]
    );

    useEffect(
        () => {
            scrollLockRef.current = lock;
            soundRef.current = sound;
        },
        [lock, sound]
    );

    // Subscribe to counter updates.
    useEffect(() => counters$(state.realtime, setCounters), []);

    const byChannel = counters.channels || {};
    const online = byChannel['chat:' + chan] || 0;
    const channel = chat.channels.has(chan) && chat.channels.get(chan);

    return main('.chat.flex.flex-auto.relative', [
        div('#channels.flex-shrink-0.flex-ns.flex-column.dn', [
            div('.flex-auto.flex.flex-column', [
                header('.flex.items-center.ph3', [
                    h1('.f5.dib.v-mid', 'Canales'),
                ]),
                nav(
                    '.flex-auto',
                    state.site.chat
                        .map(channel =>
                            h(
                                Link,
                                {
                                    key: channel.name,
                                    to: `/chat/${channel.name}`,
                                    className: classNames('db pa2 ph3', {
                                        active: channel.name === chan,
                                    }),
                                },
                                `#${channel.name}`
                            )
                        )
                        .concat([
                            adminTools({ user: auth.auth.user }) &&
                                h('div.tc.mt2', {}, [
                                    h(
                                        ChatChannelSettingsModal,
                                        {
                                            channel: {
                                                name: '',
                                                description: '',
                                                youtubeVideo: '',
                                            },
                                            effects,
                                        },
                                        [
                                            span(
                                                '.btn.btn-sm.btn-primary',
                                                t`Agregar Canal`
                                            ),
                                        ]
                                    ),
                                ]),
                        ])
                ),
                section('.flex.flex-column.peers', [
                    header('.ph3.pv2', [
                        h4('.dib.v-mid.mb0', 'Conectados'),
                        a('.dib.btn-icon.ml4.dropdown-toggle', {}, [
                            span('.bg-green.br-100.dib.mr1', {
                                style: { width: 10, height: 10 },
                            }),
                            span('.online.b', String(online)),
                        ]),
                    ]),
                    nav(
                        '.flex-auto.overflow-y-scroll',
                        (counters.peers || []).map(([id, username], k) =>
                            a(
                                '.db.pa2.ph3',
                                {
                                    key: id + k,
                                },
                                [i('.icon-user.mr2'), `${username}`]
                            )
                        )
                    ),
                ]),
            ]),
        ]),
        div('.flex.flex-column.flex-auto', [
            div('.flex-auto.flex.flex-column', [
                header('.flex.items-center.ph3', [
                    div('.flex-auto', [
                        span('.f5.v-mid.mr2', '#'),
                        h1('.f5.dib.v-mid', channel.name || ''),
                        p(
                            '.dn.dib-ns.v-mid.ma0.ml2',
                            channel.description || ''
                        ),
                    ]),
                    div([
                        div('.dn-ns.dropdown.dropdown-right', [
                            a(
                                '.dib.btn-icon.ml2.dropdown-toggle',
                                { tabIndex: 0 },
                                ['Canales', i('.icon-down-open')]
                            ),
                            ul(
                                '.menu',
                                { style: { width: '200px' } },
                                state.site.chat.map(channel =>
                                    li(
                                        '.menu-item',
                                        {},
                                        h(
                                            Link,
                                            {
                                                key: channel.name,
                                                to: `/chat/${channel.name}`,
                                                className: classNames(
                                                    'db pa2 ph3',
                                                    {
                                                        active:
                                                            channel.name ===
                                                            chan,
                                                    }
                                                ),
                                            },
                                            `#${channel.name}`
                                        )
                                    )
                                )
                            ),
                        ]),
                        div('.dropdown.dropdown-right', [
                            a(
                                '.dib.btn-icon.ml2.dropdown-toggle',
                                { tabIndex: 0 },
                                i('.icon-cog')
                            ),
                            ul('.menu', { style: { width: '200px' } }, [
                                li('.menu-item', {}, [
                                    span('.b.db', t`Opciones`),
                                    label('.form-switch.normal', [
                                        input({
                                            type: 'checkbox',
                                            onChange: event =>
                                                setLock(event.target.checked),
                                            checked: lock,
                                        }),
                                        i('.form-icon'),
                                        t`Bloquear scroll`,
                                    ]),
                                    label('.form-switch.normal', [
                                        input({
                                            type: 'checkbox',
                                            onChange: event =>
                                                setHideVideo(
                                                    event.target.checked
                                                ),
                                            checked: hideVideo,
                                        }),
                                        i('.form-icon'),
                                        t`Desactivar video`,
                                    ]),
                                    label('.form-switch.normal', [
                                        input({
                                            type: 'checkbox',
                                            onChange: event =>
                                                setSound(
                                                    event.target.checked
                                                ),
                                            checked: sound,
                                        }),
                                        i('.form-icon'),
                                        t`Desactivar notificaciones`,
                                    ]),
                                    adminTools({ user: auth.auth.user }) &&
                                        h('.div', {}, [
                                            span('.b.db', t`Administración`),
                                            h(
                                                ChatChannelSettingsModal,
                                                {
                                                    channel,
                                                    effects,
                                                    onChannelUpdate: channel =>
                                                        setChan(channel.name),
                                                },
                                                span(
                                                    '.btn.btn-sm.btn-primary.btn-block.icon-edit.mt1',
                                                    t`Editar Canal`
                                                )
                                            ),
                                        ]),
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
                channel.youtubeVideo &&
                    hideVideo === false &&
                    div(
                        '.ph3#video',
                        {
                            style: {
                                minWidth: 515,
                                zIndex: 100,
                                top: 75,
                                right: 35,
                            },
                        },
                        [
                            h(
                                '.video-responsive.center',
                                { style: { maxWidth: '70%' } },
                                h(YouTube, {
                                    videoId: channel.youtubeVideo,
                                    opts: {
                                        playerVars: {
                                            // https://developers.google.com/youtube/player_parameters
                                            autoplay: 0,
                                        },
                                    },
                                })
                            ),
                        ]
                    ),
                h(ChatMessageList, {
                    state,
                    effects,
                    channel,
                    isOnline: counters.isOnline || false,
                    lockRef: scrollLockRef,
                    soundRef,
                }),
                h(ChatMessageInput, {
                    state,
                    effects,
                    chan,
                }),
            ]),
        ]),
    ]);
}

function glueEvent(event, params) {
    return JSON.stringify({ event, params });
}

const ChatMessageInput = React.memo(function({ state, effects, chan }) {
    const [message, setMessage] = useState('');
    function onSubmit(event) {
        event.preventDefault();
        if (message === '') {
            return;
        }
        state.realtime.send(glueEvent('chat:message', { msg: message, chan }));
        setMessage('');
    }
    return form('.pa3', { onSubmit }, [
        !state.authenticated &&
            div('.flex.flex-wrap.mb3', [
                p('.mb0.mh-auto', [
                    t`Para utilizar el chat `,
                    a(
                        '.link.modal-link.pointer',
                        {
                            onClick: () =>
                                effects.auth({
                                    modal: true,
                                    tab: 'login',
                                }),
                        },
                        t`inicia sesión`
                    ),
                    t`, o si aún no tienes una cuenta, `,
                    a(
                        '.link.modal-link.pointer',
                        {
                            onClick: () =>
                                effects.auth({
                                    modal: true,
                                    tab: 'signup',
                                }),
                        },
                        t`registrate`
                    ),
                ]),
            ]),
        input('.form-input', {
            disabled: false === state.authenticated,
            placeholder: t`Escribe aquí tu mensaje...`,
            value: message,
            type: 'text',
            autoFocus: true,
            onChange: event => setMessage(event.target.value),
        }),
    ]);
});

const ChatMessageList = React.memo(function(props) {
    const { state, channel, isOnline, lockRef, effects, soundRef } = props;
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);
    const [featured, setFeatured] = useState(false);
    const [, { pingNotification }] = useTitleNotification();
    const [loading, setLoading] = useState(false);
    const chan = channel.name;

    useEffect(
        () => {
            // This side effect will be executed every time a channel is load.
            // So in short it clears the message list state and subscribes to
            // the events stream.
            setList([]);
            setFeatured(false);
            setLoading(true);
            // Reactive message list from our chat source.
            const dispose = streamChatChannel(
                { realtime: state.realtime, chan },
                ({ list, starred }) => {
                    setList(lockRef.current ? list : list.slice(-50));
                    setFeatured(starred.length > 0 && starred[0]);
                    setLoading(false);
                    if (soundRef.current === false){                        
                        pingNotification();                        
                    }
                    if (lockRef.current) {
                        return;
                    }
                    window.requestAnimationFrame(() => {
                        if (bottomRef.current) {
                            bottomRef.current.scrollIntoView({});
                        }
                    });
                }
            );
            // Unsubscribe will be called at unmount.
            return dispose;
        },
        [chan]
    );

    return div('.flex-auto.overflow-y-scroll.relative', [
        loading && div('.loading.loading-lg.mt2'),
        featured &&
            isAfter(featured.at, subSeconds(new Date(), 15)) &&
            div(
                '.starred',
                {},
                div([
                    h5([i('.icon-star-filled.mr1'), 'Mensaje destacado:']),
                    div('.tile', [
                        div('.tile-icon', { style: { width: '2rem' } }, [
                            figure('.avatar', [
                                featured.avatar &&
                                    img({ src: featured.avatar }),
                                i('.avatar-presence', {
                                    className: classNames({
                                        online: isOnline,
                                    }),
                                }),
                            ]),
                        ]),
                        div('.tile-content', [
                            div('.tile-title.mb2', [
                                span('.text-bold.text-primary', featured.from),
                                span(
                                    '.text-gray.ml2',
                                    format(featured.at, 'HH:mm')
                                ),
                            ]),
                            div('.tile-subtitle', {}, [
                                h(MemoizedBasicMarkdown, {
                                    content: featured.msg,
                                    onImageLoad: () => false,
                                }),
                            ]),
                        ]),
                    ]),
                ])
            ),
        div(
            '.pv3',
            list.map((message, k) => {
                if (message.type === 'log') {
                    return h(ChatLogItem, {
                        key: message.id,
                        message,
                    });
                }

                return h(ChatMessageItem, {
                    key: message.id,
                    short:
                        list[k - 1] &&
                        list[k - 1].from === message.from &&
                        (!list[k - 10] ||
                            k % 10 != 0 ||
                            (list[k - 10] &&
                                list[k - 10].from !== message.from)),
                    message,
                    isOnline: isOnline && isOnline.has(message.userId),
                    bottomRef,
                    effects,
                    lockRef,
                    chan,
                });
            })
        ),
        div('#bottom', { ref: bottomRef }),
    ]);
});

const ChatMessageItem = React.memo(function(props) {
    const auth = useContext(AuthContext);
    const {
        message,
        short,
        isOnline,
        bottomRef,
        lockRef,
        chan,
        effects,
    } = props;
    function onImageLoad() {
        if (lockRef.current) {
            return;
        }
        window.requestAnimationFrame(() => {
            bottomRef.current.scrollIntoView({});
        });
    }
    const initial = message.from.substr(0, 2).toUpperCase();
    return div('.tile.mb2.ph3', [
        div('.tile-icon', { style: { width: '2rem' } }, [
            !short &&
                figure('.avatar', { dataset: { initial } }, [
                    message.avatar && img({ src: message.avatar }),
                    i('.avatar-presence', {
                        className: classNames({
                            online: isOnline,
                        }),
                    }),
                ]),
            short && small('.time', [format(message.at, 'HH:mm')]),
        ]),
        div('.tile-content', [
            !short &&
                div('.tile-title.pt2.mb2', [
                    h(
                        Link,
                        { to: `/u/${message.from}/${message.userId}` },
                        span('.text-bold.text-primary', message.from)
                    ),
                    span('.text-gray.ml2', format(message.at, 'HH:mm')),
                ]),
            div('.tile-subtitle', {}, [
                h(MemoizedBasicMarkdown, { content: message.msg, onImageLoad }),
            ]),
        ]),
        div('.tile-actions.self-center', {}, [
            adminTools({ user: auth.auth.user }) &&
                a(
                    {
                        onClick: () =>
                            auth.glue.send(
                                glueEvent('chat:star', {
                                    chan,
                                    message,
                                    id: message.id,
                                })
                            ),
                    },
                    [i('.mr1.icon-star-filled.pointer', { title: t`Destacar` })]
                ),
            adminTools({ user: auth.auth.user }) &&
                a(
                    {
                        onClick: () =>
                            auth.glue.send(
                                glueEvent('chat:ban', {
                                    userId: message.userId,
                                    id: message.id,
                                })
                            ),
                    },
                    [
                        i('.mr1.icon-cancel-circled.pointer', {
                            title: t`Banear usuario`,
                        }),
                    ]
                ),
            !auth.canUpdate(message.userId) &&
                h(
                    Flag,
                    {
                        title: t`Reportar un mensaje`,
                        message,
                        onSend: form =>
                            effects.requestFlag({
                                ...form,
                                related_id: message.id,
                                related_to: 'chat',
                            }),
                    },
                    i('.mr1.icon-warning-empty.pointer', { title: t`Reportar` })
                ),
            auth.canUpdate(message.userId) &&
                h(
                    'a',
                    {
                        onClick: () =>
                            auth.glue.send(
                                glueEvent('chat:delete', {
                                    reason: 'Message deleted by admin',
                                    chan,
                                    id: message.id,
                                })
                            ),
                    },
                    i('.mr1.icon-trash', { title: t`Borrar mensaje` })
                ),
        ]),
    ]);
});

const ChatLogItem = React.memo(function({ message }) {
    const i18nParams = message.i18n || [];
    const translated = i18nParams.map(item => t`${item}`);
    return div('.tile.mb2.ph3.log', { key: message.id }, [
        div('.tile-icon', { style: { width: '2rem' } }, [
            small('.time', [format(message.at, 'HH:mm')]),
        ]),
        div('.tile-content', [
            div('.tile-title', [
                small('.text-bold.text-gray', t`System message:`),
            ]),
            div(
                '.tile-subtitle.mb1.text-small',
                translate`${message.msg}`.fetch(...translated)
            ),
        ]),
    ]);
});

function streamChatChannel({ realtime, chan }, next) {
    const types = ['listen:ready', 'boot', 'message', 'log', 'delete', 'star'];
    // Transform this reactive structure into what we finally need (list of messages)
    return pipe(
        // Stream of chat's channel messages from glue socket.
        merge(
            fromObs(channelToObs(realtime, 'chat:' + chan)),
            fromObs(channelToObs(realtime)),
            fromPromise(Promise.resolve({ event: 'boot' }))
        ),

        // Flattening of object params & type
        map(msg => ({ ...msg.params, type: msg.event })),
        // Filtering known messages, just in case.
        filter(msg => types.includes(msg.type)),
        // Merging into single list
        scan(
            (prev, msg) => {
                switch (msg.type) {
                    case 'delete':
                        return {
                            ...prev,
                            list: prev.list.filter(m => m.id !== msg.id),
                        };
                    case 'star':
                        return {
                            ...prev,
                            starred: [msg].concat(prev.starred),
                        };
                    case 'log':
                    case 'message':
                        return {
                            ...prev,
                            list: prev.list.concat(msg),
                        };
                    case 'boot':
                        return {
                            ...prev,
                            starred: [],
                            list: [],
                        };
                    case 'listen:ready':
                        if (chan === msg.chan) {
                            return {
                                ...prev,
                                starred: [],
                                list: [],
                            };
                        }
                        return prev;
                }
            },
            { list: [], starred: [] }
        ),
        debounce(60),
        subscribe({ next })
    );
}

function counters$(realtime, next) {
    return pipe(
        fromObs(channelToObs(realtime, 'chat:counters')),
        map(msg => msg.params),
        map(counters => ({
            ...counters,
            isOnline: new window.Map(counters.peers || []),
        })),
        subscribe({ next })
    );
}

export default injectState(Chat);
