import { Fragment, memo, useState } from 'react';
import RichTextEditor from 'react-rte';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { withRouter } from 'react-router-dom';
import { injectState } from 'freactal/lib/inject';
import { Quickstart } from './quickstart';
import { t, i18n } from '../../i18n';
import { MemoizedMarkdown } from '../utils';
import { Author } from './author';
import { Comment } from './comment';
import { Link } from 'react-router-dom';
import { ReplyView } from './reply';
import { adminTools } from '../../acl';
import { ConfirmWithReasonLink } from './actions';
import { Flag } from './actions';

const tags = helpers(h);
const { form, label, select, optgroup, option, input } = tags;
const { div, section, footer, small, article } = tags;
const { h3, h1, span, p, a, button, i, img, ul, li } = tags;

export function Post({ state, effects }) {
    const { post } = state;
    const { error } = post;

    return section('.fade-in.post.relative.flex.flex-column.pb3', [
        // Error state.
        error !== false && h(PostError, { status: error }),

        // Loading content
        post.loading &&
            div('.current-article', [div('.pv2', [div('.loading')])]),

        // Home quickstart
        !error &&
            post.loading === false &&
            post.id === false &&
            h(Quickstart, { state, effects }),

        // Showing a post
        !error &&
            post.loading === false &&
            post.id !== false &&
            h(PostView, { state, effects }),
        footer('.pa3', [
            small([
                t`Powered by anzu community software`,
                ' ',
                a(
                    { href: 'https://github.com/tryanzu', target: '_blank' },
                    t`v0.1 alpha`
                ),
            ]),
        ]),
    ]);
}

function PostError(/*{ status }*/) {
    return div('.current-article.tc', [
        section([
            h1(t`¡Vaya!, ¿cómo llegaste hasta aquí?`),
            p('.lh-copy', [
                t`Bueno, esto es raro, el contenido al que estas intentando acceder no existe ó ha sido eliminado recientemente.`,
            ]),
            img('.mb2', { src: '/dist/images/404.png', alt: '404' }),
            h(Link, { to: '/' }, t`Volver al inicio`),
        ]),
    ]);
}

export default injectState(Post);

function PostView({ state, effects }) {
    const { post } = state;
    const [updating, setUpdating] = useState(false);

    return div('.current-article.flex-auto', [
        article([
            div('.flex.actions', [
                div(
                    '.flex-auto',
                    {},
                    h(Author, { item: post.data }, [
                        div('.b', [
                            span('.icon.icon-eye-outline.mr1'),
                            String(post.data.views),
                        ]),
                    ])
                ),
                h(PostActionsView, { state, effects, updating, setUpdating }),
            ]),
            updating === false && h(RegularPostView, { state, effects }),
            updating === true &&
                h(UpdatePostView, { state, effects, setUpdating }),
        ]),
    ]);
}

const PostActionsView = withRouter(function PostActionsView({
    state,
    effects,
    updating,
    setUpdating,
    history,
}) {
    const post = state.post.data;
    const { user } = state.auth;

    if (updating === true) {
        return div([
            a(
                '.dib.btn-icon.post-action',
                { onClick: () => setUpdating(false) },
                i('.icon-cancel')
            ),
        ]);
    }

    if (post.user_id === user.id || adminTools({ user })) {
        return div('.dropdown.dropdown-right', [
            a(
                '.dib.btn-icon.ml2.dropdown-toggle',
                { tabIndex: 0 },
                i('.icon-cog')
            ),
            ul('.menu', { style: { width: '200px' } }, [
                li(
                    '.menu-item',
                    {},
                    a(
                        '.pointer.post-action',
                        { onClick: () => setUpdating(true) },
                        [i('.mr1.icon-edit'), t`Editar publicación`]
                    )
                ),
                li(
                    '.menu-item',
                    {},
                    h(
                        ConfirmWithReasonLink,
                        {
                            title: t`¿Por qué quieres borrar esta publicación?`,
                            placeholder: t`Describe el motivo...`,
                            action: t`Borrar publicación`,
                            onConfirm: reason =>
                                effects.deletePost(post.id, reason),
                        },
                        [i('.mr1.icon-trash'), t`Borrar publicación`]
                    )
                ),
            ]),
        ]);
    }
    return div('.dropdown.dropdown-right', [
        a(
            '.dib.btn-icon.btn-sm.ml2.dropdown-toggle',
            { tabIndex: 0 },
            i('.icon-down-open')
        ),
        ul('.menu', { style: { width: '200px' } }, [
            li(
                '.menu-item',
                {},
                a('.pointer.post-action', { onClick: () => history.goBack() }, [
                    i('.mr1.icon-left-open'),
                    t`Volver atrás`,
                ])
            ),
            li(
                '.menu-item',
                {},
                h(
                    Flag,
                    {
                        title: t`Reportar una publicación`,
                        post,
                        onSend: form =>
                            effects.requestFlag({
                                ...form,
                                related_id: post.id,
                                related_to: 'post',
                            }),
                    },
                    [
                        span(
                            '.pointer.post-action',
                            { onClick: () => setUpdating(true) },
                            [
                                i('.mr1.icon-warning-empty'),
                                t`Reportar publicación`,
                            ]
                        ),
                    ]
                )
            ),
        ]),
    ]);
});

function UpdatePostView({ state, effects, setUpdating }) {
    const { categories } = state;
    const post = state.post.data;
    const [category, setCategory] = useState(post.category);
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(() =>
        RichTextEditor.createValueFromString(post.content, 'markdown')
    );
    const [is_question, setIsQuestion] = useState(post.is_question);
    const [lock, setLock] = useState(post.lock);
    const [pinned, setPinned] = useState(post.pinned);

    function onSubmit(event) {
        event.preventDefault();
        const markdown = content.toString('markdown');

        // Deliver side effects using local changes.
        effects
            .updatePost({
                title,
                category,
                is_question,
                pinned,
                lock,
                content: markdown,
            })
            .then(() => setUpdating(false));
    }

    return form('.pv3', { onSubmit }, [
        div('.form-group.pb2', [
            label('.b.form-label', t`Categoría principal`),
            select(
                '.form-select',
                {
                    id: 'category',
                    name: 'category',
                    required: true,
                    value: category,
                    onChange: event => setCategory(event.target.value),
                },
                [
                    option(t`Selecciona una categoría para la publicación`),
                ].concat(
                    categories.map(c =>
                        optgroup(
                            { label: c.name },
                            c.subcategories.map(s =>
                                option(
                                    {
                                        value: s.id,
                                    },
                                    s.name
                                )
                            )
                        )
                    )
                )
            ),
        ]),
        div('.form-group.pb2', [
            label('.b.form-label', t`Título de la publicación`),
            input('#title.form-input', {
                type: 'text',
                value: title,
                placeholder: t`Escribe el titulo de tu publicación o pregunta...`,
                required: true,
                onChange: event => setTitle(event.target.value),
            }),
        ]),
        div('.form-group.pb2', [
            h(RichTextEditor, {
                value: content,
                onChange: setContent,
                placeholder: t`Escribe aquí el contenido de tu publicación`,
            }),
        ]),
        div('.form-group.pb2', [
            div(
                '.form-group',
                {},
                label('.form-switch.normal', [
                    input({
                        type: 'checkbox',
                        onChange: event => setIsQuestion(event.target.checked),
                        checked: is_question,
                    }),
                    i('.form-icon'),
                    t`La publicación es una pregunta`,
                ])
            ),
            div(
                '.form-group',
                {},
                label('.form-switch.normal', [
                    input({
                        type: 'checkbox',
                        onChange: event => setLock(event.target.checked),
                        checked: lock,
                    }),
                    i('.form-icon'),
                    t`No permitir comentarios en esta publicación`,
                ])
            ),
            div(
                '.form-group',
                {},
                label('.form-switch.normal', [
                    input({
                        type: 'checkbox',
                        onChange: event => setPinned(event.target.checked),
                        checked: pinned,
                    }),
                    i('.form-icon'),
                    t`Publicar como importante`,
                ])
            ),
        ]),
        input('.btn.btn-primary.btn-block', {
            type: 'submit',
            value: t`Guardar publicación`,
        }),
    ]);
}

const PostBody = memo(function PostBody({ title, content, category }) {
    return h(Fragment, [
        h3('.f6.mt2', [category.name, span('.icon-right-open')]),
        h1('.mt1.mb3', [title]),
        h(MemoizedMarkdown, { content }),
    ]);
});

function RegularPostView({ state, effects }) {
    const {
        auth,
        subcategories,
        post,
        counters,
        comments,
        firstCommentID,
        lastCommentID,
    } = state;
    const { user } = auth;
    const _comments = post.data.comments;
    const recent = counters.recent[post.id] || 0;
    const reactions = post.data.voted || [];
    const votes = post.data.votes || {};
    const blockReply = post.data.lock || false;
    const [saving, setSaving] = useState(false);
    function onClickGn(type) {
        if (auth.user === false) {
            return () => effects.auth('modal', true);
        }
        return () => {
            setSaving(type);
            return effects
                .reactTo('post', post.id, type)
                .then(() => setSaving(false));
        };
    }

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
    const missed = recent - _comments.count;
    const category = subcategories.id[post.data.category];

    return div([
        h(PostBody, {
            category,
            title: post.data.title,
            content: post.data.content,
        }),
        div('.feedback', [
            div(
                '.overflow-x-auto.pv2',
                (category.reactions || []).map(r =>
                    reactLink({
                        type: r,
                        icon: r,
                        label: t`${r}`,
                    })
                )
            ),
        ]),
        div('.separator.pt2'),
        div('.flex.flex-wrap.items-center.mb3', [
            h3(
                '.ma0.flex-auto.mb3.mb0-ns',
                i18n
                    .translate('Una respuesta a la publicación')
                    .ifPlural(
                        Number(_comments.count),
                        '%d respuestas a la publicación'
                    )
                    .fetch(_comments.count)
            ),
            div('.flex.items-center.w-100.w-auto-ns', [
                small('.dib.flex-auto', t`Ordenar comentarios`),
                div(
                    '.form-group.mb0.ml2.dib',
                    {},
                    select('.form-select.select-sm', [
                        option(t`Antiguos primero`),
                    ])
                ),
            ]),
        ]),
        comments.list !== false &&
            comments.list.length == 0 &&
            div('.empty.pv0', [
                state.authenticated === false &&
                    div('.pv4', [
                        div(
                            '.empty-icon',
                            {},
                            blockReply
                                ? i('.f4.icon-block-outline')
                                : i('.f4.icon-chat-alt')
                        ),
                        p(
                            '.empty-title.f5.fw5',
                            blockReply
                                ? t`Esta publicación bloqueó los comentarios`
                                : t`Nadie ha respondido aún`
                        ),
                        p(
                            '.empty-subtitle',
                            blockReply
                                ? t`Los comentarios han sido deshabilitados en esta publicación.`
                                : t`Únete a la conversación y sé el primero en contestar.`
                        ),
                        blockReply === false &&
                            div(
                                '.empty-action',
                                {},
                                button(
                                    '.reply-to.btn.btn-primary',
                                    {
                                        onClick: () =>
                                            effects.auth('modal', true),
                                    },
                                    t`Escribir respuesta`
                                )
                            ),
                    ]),
            ]),
        comments.before > 0 &&
            div(
                '.mb3.tc',
                {},
                comments.loading
                    ? div('.loading')
                    : [
                          comments.before > 10 &&
                              h(LoadBeforeCommentsBtn, {
                                  effects,
                                  className: 'mr3-ns mb0-ns mb2',
                                  loading: comments.loadingPrevious,
                                  before: firstCommentID,
                                  limit: comments.before,
                              }),
                          h(LoadBeforeCommentsBtn, {
                              effects,
                              loading: comments.loadingPrevious,
                              before: firstCommentID,
                              limit:
                                  comments.before > 10 ? 10 : comments.before,
                          }),
                      ]
            ),
        section(
            comments.list !== false && comments.loading == false
                ? comments.list.map(id => {
                      const c = comments.hashtables.comments[id];

                      return h(Comment, {
                          category,
                          key: id,
                          comment: c,
                          hashtables: comments.hashtables,
                          ui: state.ui,
                          auth: state.auth,
                          mentionable: state.mentionable,
                          effects,
                      });
                  })
                : comments.loading && [div('.pv2', [div('.loading')])]
        ),
        div(
            '.new-comments.shadow.toast.toast-success.mt3',
            {
                onClick: () =>
                    effects.fetchRecentComments({
                        after: lastCommentID,
                        limit: missed,
                    }),
                className: classNames({ dn: missed <= 0 }),
            },
            [
                a(
                    '.load-more',
                    i18n
                        .translate('Cargar nuevo comentario')
                        .ifPlural(
                            Number(missed),
                            'Cargar %d nuevos comentarios'
                        )
                        .fetch(missed)
                ),
                span('.icon-cancel.fr'),
            ]
        ),
        user !== false &&
            blockReply === false &&
            h(ReplyView, {
                auth: state.auth,
                ui: state.ui,
                effects,
                type: 'post',
                mentionable: state.mentionable,
                id: post.id,
            }),
        state.authenticated === false &&
            comments.list !== false &&
            comments.list.length > 0 &&
            div(
                '.pt3.tc',
                {},
                button(
                    '.reply-to.btn.btn-primary',
                    { onClick: () => effects.auth('modal', true) },
                    t`Escribir respuesta`
                )
            ),
    ]);
}

function LoadBeforeCommentsBtn(props) {
    const { effects, loading, before, limit } = props;
    const className = props.className || '';
    return a(
        {
            className: classNames(
                'btn btn-sm btn-primary load-more',
                className,
                {
                    loading,
                }
            ),
            onClick: () => effects.fetchPreviousComments(before, limit),
        },
        i18n
            .translate('Cargar comentario anterior.')
            .ifPlural(limit, 'Cargar %d comentarios anteriores.')
            .fetch(limit)
    );
}
