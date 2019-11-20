import { useContext, memo } from 'react';
import { format } from 'date-fns';
import classNames from 'classnames';
import { t } from '../../i18n';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { Link } from 'react-router-dom';
import { AuthContext } from '../fractals/auth';
import { adminTools } from '../../acl';
import { glueEvent, MemoizedBasicMarkdown } from '../utils';
import { Flag } from './actions';

const { a, div, small, i, figure, span, img } = helpers(h);

export const ChatMessageItem = memo(function(props) {
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
                    span('.subtext.ml2', format(message.at, 'HH:mm')),
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
