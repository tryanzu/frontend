import { useRef, useState, useEffect } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import withState from '../fractals/profile';
import { injectState } from 'freactal';
import { channelToObs } from '../utils';
import { pipe, fromObs, map, scan } from 'callbag-basics';
import subscribe from 'callbag-subscribe';
import { ago } from '../../i18n';

const tags = helpers(h);
const { main, div } = tags;
const { figure, nav, a, img } = tags;
// eslint-disable-next-line no-unused-vars
const { h3, h1, form, span, ul, li, i, input, p, label } = tags;

function Chat({ state }) {
    const [message, setMessage] = useState('');

    function onSubmit(event) {
        event.preventDefault();
        state.realtime.send(
            JSON.stringify({
                event: 'chat:message',
                params: { msg: message },
            })
        );
        setMessage('');
    }

    return main('.chat.flex.flex-auto', [
        div('.flex.flex-column.w-25.pr4', [
            div('.bg-white.box-shadow.pa3', [
                h1('.f6.ma0.mb3', 'Canales'),
                nav([
                    a('.link.db.pv1', {}, '#general'),
                    a('.link.db.pv1', {}, '#dia-de-hueva'),
                    a('.link.db.pv1', {}, '#desarrollo'),
                    a('.link.db.pv1', {}, '#videojuegos'),
                    a('.link.db.pv1', {}, '#armados'),
                ]),
            ]),
        ]),
        div('.flex.flex-column.flex-auto', [
            div('.flex-auto.flex.flex-column', [
                h(ChatMessageList, { state }),
                form('.pv2', { onSubmit }, [
                    input('.form-input', {
                        type: 'text',
                        placeholder: 'Escribe aquí tu mensaje...',
                        value: message,
                        onChange: event => setMessage(event.target.value),
                    }),
                ]),
            ]),
        ]),
    ]);
}

function ChatMessageList({ state }) {
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);

    useEffect(() => {
        // Reactive message list from our chat source.
        const dispose = chat$(state.realtime, list => {
            setList(list);
            bottomRef.current.scrollIntoView({
                behavior: 'smooth',
            });
        });
        // Dispose function will be called at unmount.
        return dispose;
    }, []);

    return div('.bg-white.flex-auto.overflow-y-scroll.shadow', [
        div('.nav.pl3.pr3.pt3', [
            h1('.f5.b.ma0.icon-users.nav-text', ' Anzu Chat'),
            p(
                '.mt2.mb2',
                'Conversaciones en tiempo real. Guerras de GIFs. Consejos que ayudarán o arruinarán tu vida.'
            ),
            h('div.dropdown.dropdown-left.fade-in.', [
                h(
                    'a.dib.btn-icon.dropdown-toggle',
                    { tabIndex: 0 },
                    h('span.icon-cog')
                ),
                h('ul.menu', [
                    h3('.f7.ma0.mb2', 'Configuración del video'),
                    h('.divider.mb1'),
                    div('.form-group', [
                        label('.form-checkbox', [
                            input({
                                type: 'checkbox',
                                id: 'activate',
                                name: 'activate',
                            }),
                            i('.form-icon'),
                            ' Activar video',
                        ]),
                    ]),
                    input('.form-input', {
                        type: 'text',
                    }),
                ]),
            ]),
            h('.divider'),
        ]),
        div(
            '.pa3',
            list.map(message =>
                div('.tile.mb3', { key: message.id }, [
                    div('.tile-icon.', [
                        figure('.avatar.avatar-chat', [img({ src: message.avatar })]),
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

function chat$(realtime, next) {
    return pipe(
        fromObs(channelToObs(realtime, 'chat:general')),
        map(msg => msg.params),
        scan((prev, msg) => [msg].concat(prev), []),
        map(list => list.slice(0, 30).reverse()),
        subscribe({ next })
    );
}
export default withState(injectState(Chat));
