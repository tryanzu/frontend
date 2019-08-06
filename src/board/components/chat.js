import React, { useRef, useState, useEffect, useContext } from 'react';
import YouTube from 'react-youtube';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { injectState } from 'freactal';
import { channelToObs, MemoizedBasicMarkdown } from '../utils';
import { pipe, filter, fromObs, map, scan } from 'callbag-basics';
import { debounce } from 'callbag-debounce';
import subscribe from 'callbag-subscribe';
import { t, translate } from '../../i18n';
import { format } from 'date-fns';
import { Flag, ConfirmWithReasonLink } from './actions';
import { AuthContext } from '../fractals/auth';
import { useSessionState } from '../../hooks';

const tags = helpers(h);
const { main, div, i, input, label } = tags;
const { figure, header, a, img } = tags;
const { h1, form, span, ul, li, p, small } = tags;

function Chat({ state, effects }) {
    const scrollLockRef = useRef(false);
    const [lock, setLock] = useState('');
    const [hideVideo, setHideVideo] = useSessionState('hideVideo', false);
    const [chan] = useState('general');
    const [counters, setCounters] = useState({});
    const { chat } = state;

    useEffect(
        () => {
            scrollLockRef.current = lock;
        },
        [lock]
    );

    // Subscribe to counter updates.
    useEffect(() => counters$(state.realtime, setCounters), []);

    const byChannel = counters.channels || {};
    const online = byChannel['chat:' + chan] || 0;
    const channel = chat.channels.has(chan) && chat.channels.get(chan);

    return main('.chat.flex.flex-auto.relative', [
        channel.youtubeVideo &&
            hideVideo === false &&
            div(
                '.absolute.p-3.shadow.s-rounded',
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
                        '.video-responsive',
                        {},
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
        div('.flex.flex-column.flex-auto.pb3', [
            div('.flex-auto.flex.flex-column', [
                header('.flex.items-center.ph3', [
                    div('.flex-auto', [
                        span('.f5.v-mid.mr2', '#'),
                        h1('.f5.dib.v-mid', channel.name || ''),
                        p('.dib.v-mid.ma0.ml3', channel.description || ''),
                    ]),
                    div([
                        a('.dib.btn-icon.ml2.dropdown-toggle', {}, [
                            span('.bg-green.br-100.dib.mr1', {
                                style: { width: 10, height: 10 },
                            }),
                            span('.online.b', String(online)),
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
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
                h(ChatMessageList, {
                    state,
                    channel,
                    isOnline: counters.isOnline || false,
                    lockRef: scrollLockRef,
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
    const { state, channel, isOnline, lockRef } = props;
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const chan = channel.name;
    useEffect(
        () => {
            setList([]);
            setLoading(true);
            // Reactive message list from our chat source.
            const dispose = streamChatChannel(
                { realtime: state.realtime, chan },
                list => {
                    setList(list.slice(0, 50).reverse());
                    setLoading(false);
                    if (lockRef.current) {
                        return;
                    }
                    window.requestAnimationFrame(() => {
                        bottomRef.current.scrollIntoView({});
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
    const { message, short, isOnline, bottomRef, lockRef, chan } = props;
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
                    span('.text-bold.text-primary', message.from),
                    span('.text-gray.ml2', format(message.at, 'HH:mm')),
                ]),
            div('.tile-subtitle', {}, [
                h(MemoizedBasicMarkdown, { content: message.msg, onImageLoad }),
            ]),
        ]),
        div('.tile-actions.self-center', {}, [
            h(
                Flag,
                {
                    title: t`Reportar un mensaje`,
                    onSend: form => console.info(form),
                },
                i('.mr1.icon-warning-empty.pointer', { title: t`Reportar` })
            ),
            auth.canUpdate(message.userId) &&
                h(
                    ConfirmWithReasonLink,
                    {
                        title: t`¿Por qué quieres borrar este mensaje?`,
                        placeholder: t`Describe el motivo...`,
                        action: t`Borrar mensaje`,
                        onConfirm: reason =>
                            auth.glue.send(
                                glueEvent('chat:delete', {
                                    reason,
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
    const types = ['message', 'log', 'delete'];
    // Transform this reactive structure into what we finally need (list of messages)
    return pipe(
        // Stream of chat's channel messages from glue socket.
        fromObs(channelToObs(realtime, 'chat:' + chan)),
        // Flattening of object params & type
        map(msg => ({ ...msg.params, type: msg.event })),
        // Filtering known messages, just in case.
        filter(msg => types.includes(msg.type)),
        // Merging into single list
        scan((prev, msg) => {
            if (msg.type === 'delete') {
                return prev.filter(m => m.id !== msg.id);
            }
            return [msg].concat(prev);
        }, []),
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
