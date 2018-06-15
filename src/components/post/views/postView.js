import autosize from 'autosize';
import virtualize from 'snabbdom-virtualize';
import {
    h,
    div,
    section,
    i,
    p,
    button,
    a,
    span,
    article,
    h3,
    h1,
    small,
    select,
    option,
    form,
    label,
    input,
    optgroup,
    textarea,
} from '@cycle/dom';
import { QuickstartView } from './quickstartView';
import { postActionsView } from './postActionsView';
import { authorView } from './authorView';
import { i18n, t } from '../../../i18n';
import { markdown } from '../../../ui';
import { replyView } from './replyView';
import { commentView } from './commentView';

export function postView({ state }) {
    const { post, resolving, ui } = state.own;

    // Resolving post or loading state.
    if (resolving) {
        return div('.current-article', div('.pv2', div('.loading')));
    }

    // No post selected fallback to quickstart view.
    if (!post) {
        return QuickstartView({ state });
    }

    return div('.current-article.flex-auto', [
        article([
            div('.flex', [
                div('.flex-auto', authorView(post)),
                postActionsView({ state }),
            ]),
            ui.updating === true
                ? updatePostView({ state })
                : regularPostView({ state }),
        ]),
    ]);
}

function updatePostView({ state }) {
    const { ui } = state.own;
    const { categories } = state.shared;
    const { post } = ui;

    return form('.pv3', { attrs: { id: 'update-post' } }, [
        div('.form-group.pb2', [
            label('.b.form-label', 'Categoría principal'),
            select(
                '.form-select',
                { attrs: { id: 'category', name: 'category', required: true } },
                [option('Selecciona una categoría para la publicación')].concat(
                    categories.map(c =>
                        optgroup(
                            { attrs: { label: c.name } },
                            c.subcategories.map(s =>
                                option(
                                    {
                                        attrs: { value: s.id },
                                        props: {
                                            selected: s.id === post.category,
                                        },
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
            label('.b.form-label', 'Título de la publicación'),
            input('#title.form-input', {
                attrs: {
                    type: 'text',
                    name: 'title',
                    value: post.title,
                    placeholder:
                        'Escribe el titulo de tu publicación o pregunta...',
                    required: true,
                },
            }),
        ]),
        div('.form-group.pb2', [
            textarea('#content.form-input', {
                attrs: {
                    name: 'content',
                    placeholder: 'Escribe aquí el contenido de tu publicación',
                    rows: 8,
                },
                hook: {
                    insert: vnode => {
                        vnode.elm.value = post.content;
                        autosize(vnode.elm);
                    },
                },
            }),
        ]),
        div('.form-group.pb2', [
            div(
                '.form-group',
                label('.form-switch.normal', [
                    input({
                        attrs: {
                            type: 'checkbox',
                            name: 'is_question',
                            checked: post.is_question,
                        },
                    }),
                    i('.form-icon'),
                    'La publicación es una pregunta',
                ])
            ),
            div(
                '.form-group',
                label('.form-switch.normal', [
                    input({
                        attrs: {
                            type: 'checkbox',
                            name: 'lock',
                            checked: post.lock,
                        },
                    }),
                    i('.form-icon'),
                    'No permitir comentarios en esta publicación',
                ])
            ),
            div(
                '.form-group',
                label('.form-switch.normal', [
                    input({
                        attrs: {
                            type: 'checkbox',
                            name: 'pinned',
                            checked: post.pinned,
                        },
                    }),
                    i('.form-icon'),
                    'Publicar como importante',
                ])
            ),
        ]),
        input('.btn.btn-primary.btn-block', {
            attrs: { type: 'submit', value: 'Guardar publicación' },
        }),
    ]);
}

function regularPostView({ state }) {
    const { user, subcategories } = state.shared;
    const { post, resolving, comments } = state.own;
    const _comments = post.comments;
    const older =
        resolving === false && post !== false
            ? _comments.count - comments.list.length
            : 0;
    const firstCommentID =
        comments.list !== false && comments.list.length > 0
            ? comments.list[0]
            : false;

    return div([
        h3('.f6.mt3', [
            subcategories.id[post.category].name,
            span('.icon-right-open.silver'),
        ]),
        h1(post.title),
        virtualize(`<p>${markdown.render(post.content)}</p>`),
        div('.separator.pt2'),
        div('.flex.items-center.mb3', [
            h3(
                '.ma0.flex-auto',
                i18n
                    .translate('%d respuesta a la publicación')
                    .ifPlural(
                        parseInt(_comments.count),
                        '%d respuestas a la publicación'
                    )
                    .fetch(_comments.count)
            ),
            div(small(t`Ordenar comentarios por`)),
            div(
                '.form-group.mb0.ml2',
                select('.form-select.select-sm', [option(t`Antiguos primero`)])
            ),
        ]),
        comments.list !== false && comments.list.length == 0
            ? div('.empty', [
                  div('.empty-icon', i('.f4.icon-chat-alt')),
                  p('.empty-title.f5.fw5', t`Nadie ha respondido aún`),
                  p(
                      '.empty-subtitle',
                      t`Únete a la conversación y sé el primero en contestar.`
                  ),
                  div(
                      '.empty-action',
                      button(
                          '.reply-to.btn.btn-primary',
                          { dataset: { id: post.id } },
                          t`Escribir respuesta`
                      )
                  ),
              ])
            : null,
        older > 0
            ? div(
                  '.mb3.tc',
                  a(
                      '.btn.btn-sm.btn-primary.load-more',
                      { dataset: { count: older, before: firstCommentID } },
                      i18n
                          .translate('Cargar %d comentario anterior.')
                          .ifPlural(older, 'Cargar %d comentarios anteriores.')
                          .fetch(older)
                  )
              )
            : null,
        section(
            comments.list !== false && comments.resolving == false
                ? comments.list.map(id => {
                      const c = comments.map[id];

                      return commentView({
                          comment: c,
                          state,
                      });
                  })
                : comments.resolving
                    ? h('div.pv2', h('div.loading'))
                    : []
        ),
        div(
            '.new-comments.shadow.toast.toast-success',
            { class: { dn: comments.missing == 0 } },
            [
                a(
                    '.load-more',
                    { dataset: { count: comments.missing } },
                    `Cargar ${comments.missing} ${
                        comments.missing > 1
                            ? 'nuevos comentarios'
                            : 'nuevo comentario'
                    }`
                ),
                span('.icon-cancel.fr'),
            ]
        ),
        user !== false ? replyView({ state, type: 'post', id: post.id }) : null,
    ]);
}
