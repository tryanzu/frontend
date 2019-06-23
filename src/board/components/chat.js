import { useRef, useState, useEffect } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import withState from '../fractals/profile';
import { injectState } from 'freactal';
import { channelToObs } from '../utils';
import { pipe, fromObs, map, scan } from 'callbag-basics';
import subscribe from 'callbag-subscribe';
import { ago, t } from '../../i18n';

const tags = helpers(h);
const { main, div, button } = tags;
const { figure, header, nav, a, img } = tags;
// eslint-disable-next-line no-unused-vars
const { h3, h1, form, span, ul, li, i, input, p, label } = tags;

function Chat({ state }) {
    const scrollLockRef = useRef(false);
    const [message, setMessage] = useState('');
    const [lock, setLock] = useState('');
    const [chan, setChan] = useState('general');

    useEffect(
        () => {
            scrollLockRef.current = lock;
        },
        [lock]
    );

    function onSubmit(event) {
        event.preventDefault();
        state.realtime.send(
            JSON.stringify({
                event: 'chat:message',
                params: { msg: message, chan },
            })
        );
        setMessage('');
    }

    return main('.chat.flex.flex-auto', [
        div('.flex.flex-column.w-25.pr4', [
            div('.bg-white.shadow.pa3', [
                h1('.f6.ma0.mb3', 'Canales'),
                nav(
                    [
                        'general',
                        'dia-de-hueva',
                        'desarrollo',
                        'videojuegos',
                        'armados',
                    ].map(chan =>
                        a(
                            '.link.db.pv1',
                            { onClick: () => setChan(chan) },
                            `#${chan}`
                        )
                    )
                ),
            ]),
        ]),
        div('.flex.flex-column.flex-auto', [
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
                            span('.near-black.b', ['0']),
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
                    input('.form-input', {
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
                    behavior: 'smooth',
                });
            });
            // Dispose function will be called at unmount.
            return dispose;
        },
        [chan]
    );

    return div('.flex-auto.overflow-y-scroll', [
        div(
            '.pa3',
            list.map(message =>
                div('.tile.mb3', { key: message.id }, [
                    div('.tile-icon.', [
                        figure('.avatar.avatar-chat', [
                            img({ src: message.avatar }),
                        ]),
                    ]),
                    div('.tile-content', [
                        div('.tile-title', [
                            span('.text-bold.message-id', message.from),
                            span('.fr', ago(message.at)),
                        ]),
                        div('.tile-subtitle', message.msg),
                    ]),
                ])
            )
        ),
        div('#bottom', { ref: bottomRef }),
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
export default withState(injectState(Chat));
