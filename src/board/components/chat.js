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
const { h3, h1, form, span, ul, li, i, input } = tags;

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
                form('.pv4', { onSubmit }, [
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

    return div('.bg-white.flex-auto.overflow-y-scroll', [
        div(
            '.pa3',
            list.map(message =>
                div('.tile.mb2', { key: message.id }, [
                    div('.tile-icon.mr2', [
                        figure('.avatar', [img({ src: message.avatar })]),
                    ]),
                    div('.tile-content', [
                        div('.tile-title', [
                            span('.text-bold', message.from),
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
