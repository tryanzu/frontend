import React, { useRef, useState, useEffect } from 'react';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { injectState } from 'freactal';
import { channelToObs } from '../utils';
import { pipe, fromObs, map, scan } from 'callbag-basics';
import { debounce } from 'callbag-debounce';
import subscribe from 'callbag-subscribe';
import { t } from '../../i18n';
import { format } from 'date-fns';

const tags = helpers(h);
const { main, div, i, input, label } = tags;
const { figure, header, nav, a, img } = tags;
const { h1, form, span, ul, li, p, small } = tags;

function Chat({ state, effects }) {
    const scrollLockRef = useRef(false);
    const [message, setMessage] = useState('');
    const [lock, setLock] = useState('');
    const [chan, setChan] = useState('general');
    const [counters, setCounters] = useState({});
    const channels = state.site.chat || [];

    useEffect(
        () => {
            scrollLockRef.current = lock;
        },
        [lock]
    );

    // Subscribe to counter updates.
    useEffect(() => counters$(state.realtime, setCounters), []);

    function onSubmit(event) {
        event.preventDefault();
        if (message === '') {
            return;
        }
        state.realtime.send(
            JSON.stringify({
                event: 'chat:message',
                params: { msg: message, chan },
            })
        );
        setMessage('');
    }
    const byChannel = counters.channels || {};
    const online = byChannel['chat:' + chan] || 0;

    return main('.chat.flex.flex-auto', [
        /* div('.flex.flex-column.w-25.pr2', [
            div('.pa3', [
                h1('.f5.ma0.mb3', t`Canales`),
                nav(
                    channels.map(({ name }) =>
                        a(
                            '.link.db.pv1.pointer',
                            {
                                key: name,
                                className: classNames({ b: name == chan }),
                                onClick: () => setChan(name),
                            },
                            [
                                `#${name}`,
                                span(
                                    '.label.label-primary.label-rounded.fr',
                                    `${counters['chat:' + name] || 0}`
                                ),
                            ]
                        )
                    )
                ),
            ]),
        ]), */
        div('.flex.flex-column.flex-auto.pb3', [
            div('.flex-auto.flex.flex-column.bg-white.shadow', [
                header('.flex.items-center.bb.b--light-gray.ph3', [
                    div('.flex-auto', [
                        span('.f5.v-mid.mr2', '#'),
                        h1('.f5.dib.v-mid', chan),
                    ]),
                    div([
                        a('.dib.btn-icon.ml2.dropdown-toggle', {}, [
                            span('.bg-green.br-100.dib.mr1', {
                                style: { width: 10, height: 10 },
                            }),
                            span('.near-black.b', String(online)),
                        ]),
                        div('.dropdown.dropdown-right', [
                            a(
                                '.dib.btn-icon.ml2.dropdown-toggle',
                                { tabIndex: 0 },
                                i('.icon-cog')
                            ),
                            ul('.menu', { style: { width: '200px' } }, [
                                li('.menu-item', {}, [
                                    span('.b.db', 'Configuración'),
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
                                ]),
                            ]),
                        ]),
                    ]),
                ]),
                h(ChatMessageList, {
                    state,
                    chan,
                    isOnline: counters.isOnline || false,
                    lockRef: scrollLockRef,
                }),
                form('.pa3.bt.b--light-gray', { onSubmit }, [
                    false === state.authenticated &&
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
                ]),
            ]),
        ]),
    ]);
}

const ChatMessageList = React.memo(function(props) {
    const { state, chan, isOnline, lockRef } = props;
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(
        () => {
            setList([]);
            setLoading(true);

            // Reactive message list from our chat source.
            const dispose = chat$(state.realtime, chan, list => {
                setList(list.slice(0, 50).reverse());
                setLoading(false);
                if (lockRef.current) {
                    return;
                }
                bottomRef.current.scrollIntoView({});
            });
            // Unsubscribe will be called at unmount.
            return dispose;
        },
        [chan]
    );

    return div('.flex-auto.overflow-y-scroll', [
        loading && div('.loading.loading-lg.mt2'),
        div(
            '.pv3',
            list.map((message, k) =>
                h(ChatMessageItem, {
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
                })
            )
        ),
        div('#bottom', { ref: bottomRef }),
    ]);
});

const ChatMessageItem = React.memo(function({ message, short, isOnline }) {
    const initial = message.from.substr(0, 2).toUpperCase();
    return div('.tile.mb2.ph3', { key: message.id }, [
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
            short && small('.white', [format(message.at, 'HH:mm')]),
        ]),
        div('.tile-content', [
            !short &&
                div('.tile-title.pt2.mb2', [
                    span('.text-bold.text-primary', message.from),
                    span('.text-gray.ml2', format(message.at, 'HH:mm')),
                ]),
            div('.tile-subtitle', message.msg),
        ]),
    ]);
});

function chat$(realtime, chan, next) {
    return pipe(
        fromObs(channelToObs(realtime, 'chat:' + chan)),
        map(msg => msg.params),
        scan((prev, msg) => [msg].concat(prev), []),
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
