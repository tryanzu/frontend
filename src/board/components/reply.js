import { useState, useEffect } from 'react';
import RichTextEditor from 'react-rte';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { ReplyAdvice } from './replyAdvice';
import { AuthorAvatarLink } from './author';
import { useStoredState } from '../../hooks';

const tags = helpers(h);
const { form, div, button } = tags;

export function ReplyView(props) {
    const { effects, auth, ui, type, id } = props;
    const [markdown, setMarkdown] = useStoredState(
        `markdown.${type}.${id}`,
        ''
    );
    const [editorState, setEditorState] = useState(
        RichTextEditor.createValueFromString(markdown, 'markdown')
    );
    const [mobileEditorContent, setMobileContent] = useState('');
    const { user } = auth;
    const nested = props.nested || false;

    async function onSubmit(event) {
        event.preventDefault();
        const markdown =
            mobileEditorContent || editorState.toString('markdown');
        if (ui.replying || markdown.length === 0) {
            return;
        }

        // We now execute the actual side effect and reset our reply state.
        await effects.publishReply(markdown, type, id);
        setEditorState(RichTextEditor.createEmptyValue());
        setMobileContent('');
    }

    useEffect(() => {
        const content = editorState.toString('markdown');
        const sanitized = content.replace(/[^\x20-\x7E]/g, '');
        setMarkdown(sanitized);
    }, [editorState]);

    return div(
        '.comment.reply.flex.fade-in.items-start',
        { className: classNames({ pb3: nested == false, pt3: nested }) },
        [
            h(AuthorAvatarLink, { user }),
            form('.pl2-ns.flex-auto.fade-in.reply-form', { onSubmit }, [
                div(
                    '.form-group.dn.db-ns',
                    {},
                    h(RichTextEditor, {
                        value: editorState,
                        onChange: setEditorState,
                        placeholder: 'Escribe aquí tu respuesta',
                        onFocus: () => effects.replyFocus(type, id),
                    })
                ),
                div(
                    '.form-group.db.dn-ns',
                    {},
                    h('textarea.form-input', {
                        value: mobileEditorContent,
                        onChange: event => setMobileContent(event.target.value),
                        placeholder: 'Escribe aquí tu respuesta',
                        onFocus: () => effects.replyFocus(type, id),
                        rows: 5,
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
