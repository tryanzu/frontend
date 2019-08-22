import { Component, useState } from 'react';
import RichTextEditor from 'react-rte';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { useSessionState } from '../../hooks';

const tags = helpers(h);
const { form } = tags;
const { div, p, ul, li } = tags;
const { a, i, strong, button, img } = tags;

function ReplyAdvice(props) {
    const [hidden, hideRecommendations] = useSessionState(
        'replyRecommendations',
        false
    );
    return div(
        '.toast.toast-warning.context-help',
        {
            className: classNames({
                dn: props.hidden || hidden,
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
    );
}

export class ReplyView extends Component {
    constructor(props) {
        super(props);
        this.onSubmit = this.onSubmit.bind(this);
        this.state = {
            editor: RichTextEditor.createEmptyValue(),
        };
    }
    onSubmit(event) {
        event.preventDefault();
        const markdown = this.state.editor.toString('markdown');
        if (this.props.ui.replying || markdown.length === 0) {
            return;
        }

        // We now execute the actual side effect and reset our reply state.
        const { type, id } = this.props;
        this.props.effects
            .publishReply(markdown, type, id)
            .then(() =>
                this.setState({ editor: RichTextEditor.createEmptyValue() })
            );
    }
    render() {
        const { state, props } = this;
        const { effects, auth, ui, type, id } = props;
        const { user } = auth;
        const nested = props.nested || false;
        return div(
            '.comment.reply.flex.fade-in.items-start',
            { className: classNames({ pb3: nested == false, pt3: nested }) },
            [
                a({ href: `/u/${user.username}/${user.id}`, rel: 'author' }, [
                    div(
                        '.dn.db-ns',
                        {},
                        user.image
                            ? img({
                                  src: user.image,
                                  alt: t`Avatar de ${user.username}`,
                              })
                            : div(
                                  '.empty-avatar',
                                  {},
                                  user.username.substr(0, 1)
                              )
                    ),
                ]),
                form(
                    '.pl2-ns.flex-auto.fade-in.reply-form',
                    { onSubmit: this.onSubmit },
                    [
                        div(
                            '.form-group',
                            {},
                            h(RichTextEditor, {
                                value: state.editor,
                                onChange: editor => this.setState({ editor }),
                                placeholder: 'Escribe aquí tu respuesta',
                                onFocus: () => effects.replyFocus(type, id),
                            })
                        ),
                        h(ReplyAdvice),
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
                                        className: classNames({
                                            loading: ui.replying,
                                        }),
                                    },
                                    t`Publicar comentario`
                                ),
                                button(
                                    '.btn.btn-primary.mr2.dib.dn-ns',
                                    {
                                        type: 'submit',
                                        className: classNames({
                                            loading: ui.replying,
                                        }),
                                    },
                                    t`Publicar`
                                ),
                                button(
                                    '.btn',
                                    {
                                        type: 'reset',
                                        onClick: () =>
                                            effects.replyFocus(false),
                                    },
                                    t`Cancelar`
                                ),
                            ]
                        ),
                    ]
                ),
            ]
        );
    }
}
