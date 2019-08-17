import h from 'react-hyperscript';
import RichTextEditor from 'react-rte';
import classNames from 'classnames';
import helpers from 'hyperscript-helpers';
import { useState, useMemo, memo } from 'react';
import { debounce } from 'lodash';
import { Author } from './author';
import { ReplyView } from './reply';
import { ErrorBoundary } from '../errors';
import { MemoizedMarkdown } from '../utils';
import { t } from '../../i18n';
import { ConfirmWithReasonLink } from './actions';
import { Flag } from './actions';

const tags = helpers(h);
const { article, div, a, span, i, h5, ul, li } = tags;
const { form, button } = tags;

function CommentView({ comment, effects, ui, hashtables, ...props }) {
    const [saving, setSaving] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [content, setContent] = useState(() =>
        RichTextEditor.createValueFromString(comment.content, 'markdown')
    );

    const debouncedContentUpdate = useMemo(() => debounce(setContent, 250), []);

    //voting !== false && voting.id == comment.id ? voting.intent : false;
    const noPadding = props.noPadding || false;
    const nested = props.nested || false;
    const category = props.category || {};

    // Loading vote status helper.
    const voted = false; //votes[comment.id] || false;
    const replies = comment.replies || {};
    const repliesCount = replies.count || 0;
    const isCurrentUsersComment = props.auth.user.id == comment.user_id;
    const { votes } = comment;
    function onClickGn(type) {
        if (props.auth.user === false) {
            return () => effects.auth('modal', true);
        }
        return () => {
            setSaving(type);
            return effects
                .reactTo('comment', comment.id, type)
                .then(() => setSaving(false));
        };
    }

    const reactions = hashtables.votes[comment.id] || [];
    function reactLink({ type, icon, label }) {
        return a(
            '.badge',
            {
                onClick: onClickGn(type),
                dataset: { badge: votes[type] || 0 },
                className: classNames({ active: reactions.includes(type) }),
            },
            [
                saving === type
                    ? span('.icon-spin4.animate-spin')
                    : span(`.icon.icon-${icon}`, {}),
                span('.type', label),
            ]
        );
    }

    function onUpdate(event) {
        event.preventDefault();
        setSaving(true);
        const markdown = content.toString('markdown');
        effects
            .updateComment({ id: comment.id, content: markdown })
            .then(() => {
                setSaving(false);
                setUpdating(false);
            });
    }

    return article(
        {
            className: 'comment',
            key: comment.id,
            id: comment.id,
        },
        [
            div('.flex', [
                div('.flex.flex-auto', {}, [
                    nested === true && span('.icon-flow-split.mr2'),
                    h(Author, {
                        item: comment,
                        label: 'Comentó',
                        noAvatar: nested,
                    }),
                ]),
                props.auth.user !== false &&
                    div('.flex-shrink-0', [
                        a(
                            '.v-mid.pointer.reply-to',
                            {
                                className: classNames({
                                    dn: isCurrentUsersComment,
                                    dib: !isCurrentUsersComment,
                                }),
                                onClick: () =>
                                    effects.replyFocus(
                                        'comment',
                                        noPadding
                                            ? comment.reply_to
                                            : comment.id
                                    ),
                            },
                            [
                                i('.icon-reply-outline'),
                                span('.pl2.dn.dib-ns', ['Responder']),
                            ]
                        ),
                        div('.dib.v-mid.dropdown.dropdown-right', [
                            a(
                                {
                                    className: classNames(
                                        'dib v-mid ml2 btn-icon vote dropdown-toggle',
                                        { active: voted === -1 }
                                    ),
                                    tabIndex: 0,
                                },
                                h('i.icon-menu.f7')
                            ),
                            ul('.menu', { style: { width: '200px' } }, [
                                li(
                                    '.menu-item',
                                    {},
                                    a(
                                        '.pointer.post-action',
                                        {
                                            onClick: () => {
                                                setUpdating(true);
                                            },
                                        },
                                        [
                                            i('.mr1.icon-edit'),
                                            t`Editar comentario`,
                                        ]
                                    )
                                ),
                                li(
                                    '.menu-item',
                                    {},
                                    h(
                                        ConfirmWithReasonLink,
                                        {
                                            title: t`¿Por qué quieres borrar este comentario?`,
                                            placeholder: t`Describe el motivo...`,
                                            action: t`Borrar comentario`,
                                            onConfirm: reason =>
                                                effects.deleteComment(
                                                    comment.id,
                                                    reason
                                                ),
                                        },
                                        [
                                            i('.mr1.icon-trash'),
                                            t`Borrar comentario`,
                                        ]
                                    )
                                ),
                                li(
                                    '.menu-item',
                                    {},
                                    h(
                                        Flag,
                                        {
                                            title: t`Reportar un comentario`,
                                            comment,
                                            onSend: form =>
                                                effects.requestFlag({
                                                    ...form,
                                                    related_id: comment.id,
                                                    related_to: 'comment',
                                                }),
                                        },
                                        [
                                            i('.mr1.icon-warning-empty'),
                                            t`Reportar`,
                                        ]
                                    )
                                ),
                            ]),
                        ]),
                    ]),
            ]),
            div('.comment-body', { className: updating ? 'dn' : '' }, [
                h(
                    ErrorBoundary,
                    {},
                    h(MemoizedMarkdown, { content: comment.content })
                ),
            ]),
            updating === true &&
                form(
                    '.pl2.flex-auto.fade-in.reply-form',
                    { onSubmit: onUpdate },
                    [
                        div(
                            '.form-group',
                            {},
                            h(RichTextEditor, {
                                value: content,
                                onChange: debouncedContentUpdate,
                                placeholder: 'Escribe aquí tu respuesta',
                            })
                        ),
                        div('.tr.mt2', [
                            button(
                                '.btn.btn-primary.mr2',
                                {
                                    type: 'submit',
                                },
                                t`Guardar comentario`
                            ),
                            button(
                                '.btn',
                                {
                                    type: 'reset',
                                    onClick: () => setUpdating(false),
                                },
                                t`Cancelar`
                            ),
                        ]),
                    ]
                ),
            nested === false &&
                div(
                    '.feedback',
                    { className: updating ? 'dn' : '' },
                    [h5('Esta respuesta fue considerada:')].concat(
                        (category.reactions || []).map(r =>
                            reactLink({
                                type: r,
                                icon: r,
                                label: t`${r}`,
                            })
                        )
                    )
                ),
            repliesCount > 0 &&
                div(
                    '.pt2.nested-replies',
                    replies.list.map(comment =>
                        h(Comment, {
                            key: comment.id,
                            comment: hashtables.comments[comment.id],
                            noPadding: true,
                            nested: true,
                            auth: props.auth,
                            ui,
                            hashtables,
                            effects,
                        })
                    )
                ),
            ui.commentingId === comment.id &&
                div(
                    comment.reply_type == 'post' ? '.pl4' : '.pl0',
                    {},
                    h(ReplyView, {
                        auth: props.auth,
                        ui: ui,
                        effects,
                        type: 'comment',
                        id: noPadding ? comment.reply_to : comment.id,
                        nested: true,
                        mentionable: props.mentionable,
                    })
                ),
        ]
    );
}

export const Comment = memo(CommentView);
