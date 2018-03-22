import virtualize from 'snabbdom-virtualize'
import { h, div, section, i, p, button, a, span, ul, li, article, h3, h1, footer, small, select, option } from '@cycle/dom'
import { QuickstartView } from './quickstartView'
import { postActionsView } from './postActionsView'
import { authorView } from './authorView'
import { i18n, t } from '../../../i18n'
import { markdown } from '../../../ui';
import { replyView } from './replyView';
import { commentView } from './commentView';

export function postView({ state }) {
    const { user, subcategories } = state.shared
    const { post, resolving, voting, toasts, comments, ui, votes } = state.own
    const _comments = post.comments
    const older = resolving === false && post !== false ? _comments.count - comments.list.length : 0
    const firstCommentID = comments.list !== false && comments.list.length > 0 ? comments.list[0] : false

    // Resolving post or loading state.
    if (resolving) {
        return div('.current-article', div('.pv2', div('.loading')))
    }

    // No post selected fallback to quickstart view.
    if (!post) {
        return QuickstartView({ state })
    }

    return div('.current-article.flex-auto', [
        article([
            div('.flex', [
                div('.flex-auto', authorView(post)),
                postActionsView({ state })
            ]),
            h3('.f6.mt3', [subcategories.id[post.category].name, span('.icon-right-open.silver')]),
            h1(post.title),
            virtualize(`<p>${markdown.render(post.content)}</p>`),
            div('.separator.pt2'),
            div('.flex.items-center.mb3', [
                h3('.ma0.flex-auto',
                    i18n.translate('%d respuesta a la publicación')
                        .ifPlural(parseInt(_comments.count), '%d respuestas a la publicación')
                        .fetch(_comments.count)
                ),
                div(small(t`Ordenar comentarios por`)),
                div('.form-group.mb0.ml2', 
                    select('.form-select.select-sm', [
                        option(t`Antiguos primero`)
                    ])
                )
            ]),
            comments.list !== false && comments.list.length == 0
                ? div('.empty', [
                    div('.empty-icon', i('.f4.icon-chat-alt')),
                    p('.empty-title.f5.fw5', t`Nadie ha respondido aún`),
                    p('.empty-subtitle', t`Únete a la conversación y sé el primero en contestar.`),
                    div('.empty-action', button('.reply-to.btn.btn-primary', { dataset: { id: post.id } }, t`Escribir respuesta`))
                ])
                : null,
            older > 0
                ? div('.mb3.tc',
                    a('.btn.btn-sm.btn-primary.load-more', { dataset: { count: older, before: firstCommentID } },
                        i18n.translate('Cargar %d comentario anterior.')
                            .ifPlural(older, 'Cargar %d comentarios anteriores.')
                            .fetch(older)
                    )
                )
                : null,
            section(
                comments.list !== false && comments.resolving == false ?
                    comments.list.map(id => {
                        const c = comments.map[id]

                        return commentView({
                            comment: c,
                            state
                        })
                    })
                    : (comments.resolving ? h('div.pv2', h('div.loading')) : [])
            ),
            div('.new-comments.shadow.toast.toast-success', { class: { dn: comments.missing == 0 } }, [
                a('.load-more', { dataset: { count: comments.missing } }, `Cargar ${comments.missing} ${comments.missing > 1 ? 'nuevos comentarios' : 'nuevo comentario'}`),
                span('.icon-cancel.fr')
            ]),
            user !== false ? replyView({ state, type: 'post', id: post.id }) : null,
        ])
    ])
}