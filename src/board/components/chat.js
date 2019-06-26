import { useRef, useState, useEffect } from 'react';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { injectState } from 'freactal';
import { channelToObs } from '../utils';
import { pipe, fromObs, map, scan } from 'callbag-basics';
import subscribe from 'callbag-subscribe';
import { t } from '../../i18n';
import { format } from 'date-fns';

const tags = helpers(h);
const { main, div, i, input, label } = tags;
const { figure, header, nav, a, img } = tags;
const { h1, form, span, ul, li, p } = tags;

function Chat({ state, effects }) {
    const scrollLockRef = useRef(false);
    const [message, setMessage] = useState('');
    const [lock, setLock] = useState('');
    const [chan, setChan] = useState('anzu');
    const [counters, setCounters] = useState({});
    const channels = state.site.chat || [];
    const { auth } = state;
    const { user } = auth;
    const disabled = user == false;

    useEffect(
        () => {
            scrollLockRef.current = lock;
        },
        [lock]
    );

    // Subscribe to counter updates.
    useEffect(() => counters$(state.realtime, setCounters), []);

    function onSubmit(event) {
        if (message === '') {
            return;
        }
        event.preventDefault();
        state.realtime.send(
            JSON.stringify({
                event: 'chat:message',
                params: { msg: message, chan },
            })
        );
        setMessage('');
    }
    const online = counters['chat:' + chan] || 0;

    return main('.chat.flex.flex-auto', [
        div('.flex.flex-column.w-25.pr4', [
            div('.bg-white.shadow.pa3', [
                h1('.f6.ma0.mb3', 'Canales'),
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
                                div('.dib.btn-icon.fr', {}, [
                                    span(
                                        '.near-black.b',
                                        `${counters['chat:' + name] || 0}`
                                    ),
                                ]),
                            ]
                        )
                    )
                ),
            ]),
        ]),
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
                    lockRef: scrollLockRef,
                }),
                form('.pa3.bt.b--light-gray', { onSubmit }, [
                    user == false &&
                        div('.flex.flex-wrap.mb3', [
                            p('.mb0.mh-auto', [
                                t`Únete a la conversación, `,
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
                                t`, o si aún no eres miembro, `,
                                a(
                                    '.link.modal-link.pointer',
                                    {
                                        onClick: () =>
                                            effects.auth({
                                                modal: true,
                                                tab: 'signup',
                                            }),
                                    },
                                    t`únete`
                                ),
                                t` a la comunidad.`,
                            ]),
                        ]),
                    input('.form-input', {
                        disabled,
                        type: 'text',
                        placeholder: t`Escribe aquí tu mensaje...`,
                        value: message,
                        onChange: event => setMessage(event.target.value),
                        autoFocus: true,
                    }),
                ]),
            ]),
        ]),
    ]);
}

function ChatMessageList({ state, chan, lockRef }) {
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);

    useEffect(
        () => {
            setList([]);

            // Reactive message list from our chat source.
            const dispose = chat$(state.realtime, chan, list => {
                setList(list.slice(0, 50).reverse());
                if (lockRef.current) {
                    return;
                }
                bottomRef.current.scrollIntoView({
                    // behavior: 'smooth',
                });
            });
            // Dispose function will be called at unmount.
            return dispose;
        },
        [chan]
    );

    return div('.flex-auto.overflow-y-scroll', [
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
                })
            )
        ),
        div('#bottom', { ref: bottomRef }),
    ]);
}

function ChatMessageItem({ message, short }) {
    return div('.tile.mb2.ph3', { key: message.id }, [
        div('.tile-icon', { style: { width: 50 } }, [
            !short &&
                figure('.avatar.avatar-chat', [img({ src: message.avatar })]),
            short && span('.white', [format(message.at, 'HH:mm')]),
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
}

function chat$(realtime, chan, next) {
    return pipe(
        fromObs(channelToObs(realtime, 'chat:' + chan)),
        map(msg => msg.params),
        scan((prev, msg) => [msg].concat(prev), []),
        subscribe({ next })
    );
}

function counters$(realtime, next) {
    return pipe(
        fromObs(channelToObs(realtime, 'chat:counters')),
        map(msg => msg.params),
        subscribe({ next })
    );
}

export default injectState(Chat);
