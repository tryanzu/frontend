import { useState } from 'react';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { StatefulEditor } from './statefulEditor';
import { useSessionState } from '../../hooks';

const tags = helpers(h);
const { form } = tags;
const { div, p, ul, li } = tags;
const { a, i, strong, button, img } = tags;

export function ReplyView(props) {
    const { effects, auth, ui, type, id /*, mentionable*/ } = props;
    const { user } = auth;
    const [reply, setReply] = useState('');
    const [hidden, hideRecommendations] = useSessionState(
        'replyRecommendations',
        false
    );
    const nested = props.nested || false;

    function onSubmit(event) {
        event.preventDefault();
        const markdown = reply;
        if (ui.replying || markdown.length === 0) {
            return;
        }
        // We set reply to false to remount the editor component.
        // Since it's state is self contained we cannot reset it now.
        setReply(false);

        // We now execute the actual side effect and reset our reply state.
        effects.publishReply(markdown, type, id).then(() => setReply(''));
    }

    return div(
        '.comment.reply.flex.fade-in.items-start',
        { className: classNames({ pb3: nested == false, pt3: nested }) },
        [
            a({ href: '/', rel: 'author' }, [
                div(
                    '.dn.db-ns',
                    {},
                    user.image
                        ? img({
                              src: user.image,
                              alt: t`Avatar de ${user.username}`,
                          })
                        : div('.empty-avatar', {}, user.username.substr(0, 1))
                ),
            ]),
            form('.pl2-ns.flex-auto.fade-in.reply-form', { onSubmit }, [
                div(
                    '.form-group',
                    {},
                    reply !== false &&
                        h(StatefulEditor, {
                            onChange: setReply,
                            onFocus: () => effects.replyFocus(type, id),
                        })
                ),
                div(
                    '.toast.toast-warning.context-help',
                    {
                        className: classNames({
                            dn:
                                ui.commenting == false ||
                                ui.commentingType !== 'post' ||
                                ui.commentingId != id ||
                                hidden,
                        }),
                    },
                    [
                        a('.btn.btn-clear.float-right', {
                            onClick: () => hideRecommendations(true),
                        }),
                        p(t`Gracias por contribuir con tu respuesta!`),
                        ul([
                            li([
                                t`Asegúrate de `,
                                i(t`responder la publicación principal `),
                                t`y proporcionar detalles suficientes en tu respuesta.`,
                            ]),
                        ]),
                        p([t`Y trata de `, strong(t`evitar`), ':']),
                        ul([
                            li(t`Responder con otra pregunta.`),
                            li(t`Responder a otras respuestas.`),
                            li(
                                t`Responder sólo tu opinión. Argumenta con referencias o tu experiencia personal.`
                            ),
                        ]),
                        p([
                            t`También puedes consultar nuestras recomendaciones sobre `,
                            a(t`cómo escribir buenas respuestas.`),
                        ]),
                    ]
                ),
                div(
                    '.tr.mt2',
                    {
                        className: classNames({
                            dn:
                                ui.commenting == false ||
                                ui.commentingType !== type ||
                                ui.commentingId != id,
                        }),
                    },
                    [
                        button(
                            '.btn.btn-primary.mr2.dn.dib-ns',
                            {
                                type: 'submit',
                                className: classNames({ loading: ui.replying }),
                            },
                            t`Publicar comentario`
                        ),
                        button(
                            '.btn.btn-primary.mr2.dib.dn-ns',
                            {
                                type: 'submit',
                                className: classNames({ loading: ui.replying }),
                            },
                            t`Publicar`
                        ),
                        button(
                            '.btn',
                            {
                                type: 'reset',
                                onClick: () => effects.replyFocus(false),
                            },
                            t`Cancelar`
                        ),
                    ]
                ),
            ]),
        ]
    );
}
