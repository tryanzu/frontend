import { useRef, useState, useEffect, useContext } from 'react';
import YouTube from 'react-youtube';
import ReactTwitchEmbedVideo from 'react-twitch-embed-video';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { injectState } from 'freactal';
import { pipe, fromObs, map } from 'callbag-basics';
import { t } from '../../i18n';
import { AuthContext } from '../fractals/auth';
import { useSessionState } from '../../hooks';
import { adminTools } from '../../acl';
import { ChatChannelSettingsModal } from '../components/actions';
import { channelToObs } from '../utils';
import subscribe from 'callbag-subscribe';
import { ChatMessageInput } from '../components/chatMessageInput';
import { ChatMessageList } from '../components/chatMessageList';

const tags = helpers(h);
const { main, div, i, input, label } = tags;
const { header, a, nav, section } = tags;
const { h4, ul, li, p } = tags;
const { h1, span, autoplay } = tags;

function Chat({ state, effects, match, history }) {
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
                    h1('.f5.dib.v-mid', t`Canales`),
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
                                                twitchStreaming: '',
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
                        h4('.dib.v-mid.mb0', t`Conectados`),
                        a('.dib.btn-icon.ml4.dropdown-toggle', {}, [
                            span('.bg-green.br-100.dib.mr1', {
                                style: { width: 10, height: 10 },
                            }),
                            span('.online.b', String(online)),
                        ]),
                    ]),
                    nav(
                        '.flex-auto.overflow-y-auto',
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
                                                setSound(event.target.checked),
                                            checked: sound,
                                        }),
                                        i('.form-icon'),
                                        t`Desactivar sonido`,
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
                (channel.youtubeVideo || channel.twitchStreaming) &&
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
                            channel.youtubeVideo != '' &&
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
                            channel.twitchStreaming != '' &&
                                h(
                                    '.video-responsive.center',
                                    { style: { maxWidth: '70%' } },
                                    h(ReactTwitchEmbedVideo, {
                                        channel: channel.twitchStreaming,
                                        autoplay,
                                        layout: 'video',
                                        muted: false,
                                        targetClass: 'twitch-embed',
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
