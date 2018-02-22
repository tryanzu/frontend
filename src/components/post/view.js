import { h, div, section, i, p, button, a, span, ul, li, article, h3, h1 } from '@cycle/dom'
import { Quickstart } from '../quickstart'
import { t, i18n } from '../../i18n'
import debounce from 'lodash/debounce'
import timeago from 'timeago.js'
import markdown from 'markdown-it'
import emoji from 'markdown-it-emoji'
import mila from 'markdown-it-link-attributes'
import virtualize from 'snabbdom-virtualize'
import autosize from 'autosize'
import classNames from 'classnames'

export function view(state$) {
    return state$.map(state => {
        const {user} = state.shared
        const {post, resolving, voting, toasts, comments, ui, votes} = state.own
        const _comments = post.comments
        const older = resolving === false && post !== false ? _comments.count - comments.list.length : 0
        const firstCommentID = comments.list !== false && comments.list.length > 0 ? comments.list[0] : false

        if (resolving) {
            return section('.post', [
                div('.current-article', div('.pv2', div('.loading')))
            ])
        }

        function ownerTools() {
            return div('.dropdown.dropdown-right', [
                a('.dib.btn-icon.gray.ml2.dropdown-toggle', { attrs: { tabindex: 0 } }, i('.icon-cog')),
                ul('.menu', { style: { width: '200px' } }, [
                    li('.menu-item', a('.pointer.post-action', { dataset: { action: 'update', id: post.id } }, [i('.icon-edit'), t`Editar publicación`])),
                    li('.menu-item', a('.pointer.post-action', { dataset: { action: 'delete', id: post.id } }, [i('.icon-trash'), t`Borrar publicación`])),
                ])
            ]) 
        }

        function guestTools() {
            return div([
                a('.dib.btn-icon.gray', [i('.icon-warning-empty'), span('.ml1', t`Reportar`)]),
            ])
        }

        const toastsVNode = toasts.length == 0 ? h('div') : h('div.absolute.right-1.top-1.z-1.fade-in', toasts.map(toastView))
        const postVNode = post == false ? Quickstart() : h('div.current-article', [
            article([
                div('.flex', [
                    div('.flex-auto', author(post)),
                    user.id == post.user_id ? ownerTools() : guestTools()
                ]),
                h3('.f6.mt3', ['Bar spartano', span('.icon-right-open.silver')]),
                h1(post.title),
                virtualize(`<p>${md.render(post.content)}</p>`),
                h('div.separator.pt2'),
                h('div.flex.items-center.mb3', [
                    h('h3.flex-auto', 
                        i18n.translate('%d respuesta a la publicación')
                            .ifPlural(parseInt(_comments.count), '%d respuestas a la publicación')
                            .fetch(_comments.count)
                    ),
                    h('div', h('small', t`Ordenar comentarios por`)),
                    h('div.form-group.mb0.ml2', h('select.form-select.select-sm', [
                        h('option', t`Recomendaciones`)
                    ]))
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
                        a('.btn.btn-sm.btn-primary.load-more', { dataset: { count: older, before: firstCommentID }}, 
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
                user !== false ? replyView(user, ui, 'post', post.id) : h('div'),
            ])
        ])

        return h('section.fade-in.post.relative.flex.flex-column.pb3', h('div.h-100.overflow-y-scroll', [
            toastsVNode,
            postVNode,
            h('footer.pa3.pt4', [
                h('small.silver', 'Powered by Anzu community software v0.1 alpha')
            ])
        ]))
    })
}
const ago = timeago(null, 'es')
const md = markdown({html: true, linkify: true, typographer: false}).disable('image')
md.use(emoji)
md.use(mila, {target: '_blank', rel: 'noopener', class: 'link blue hover-green'})

function author(item, label = 'Publicó') {
    const {author} = item;

    return h('a', {attrs: {href: '/', rel: 'author'}}, [
        h('div', author.image ? h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : h('div.empty-avatar', author.username.substr(0, 1))),
        h('div', [
            h('span.b', author.username),
            h('span.mt1', [
                h('small.bg-light-gray.br1.gray', {style: {padding: '2px 5px'}}, [
                    h('i.icon-star-filled.gold'),
                    h('span.b', ' ' + String(author.gaming.swords))
                ])
            ])
        ]),
        h('div.pl2.top', h('small.ago', label + ' ' + ago.format(item.created_at)))
    ]);
}

function commentView(props) {
    const { comment, state } = props
    const { user } = state.shared
    const { post, resolving, voting, toasts, comments, ui, votes } = state.own

    const isVoting = voting !== false && voting.id == comment.id ? voting.intent : false
    const noPadding = props.noPadding || false

    // Loading vote status helper.
    const voted = votes[comment.id] || false
    const replies = comment.replies || {}
    const repliesCount = replies.count || 0
    const voteIcon = (intent, vnode) => (isVoting !== false && intent == isVoting ? div('.dib.loading') : vnode)
    const voteColor = (intent) => {
        if (voted === -1 && intent == 'down') return 'blue'
        if (voted === 1 && intent == 'up') return 'blue'

        return 'mid-gray';
    }

    const isCurrentUsersComment = user.id == comment.user_id;

    return h('div', {class: {pb3: noPadding == false}, key: comment.id}, [
        h('div.flex', [ 
            h('div.flex-auto', author(comment, 'Comentó')),
            h('div', [
                h('a.v-mid.pointer.reply-to', { class: { dn: isCurrentUsersComment, dib: !isCurrentUsersComment }, dataset: { id: noPadding ? comment.reply_to : comment.id}}, [
                    h('i.icon-reply-outline'), 
                    h('span.pl2', 'Responder')
                ]), 
                div('.dib.v-mid', [
                    a({ attrs: { class: classNames('dib', 'v-mid', 'mh2', 'btn-icon', 'vote', { active: voted === -1 })}, dataset: { id: comment.id, type: 'comment', intent: 'down' } }, [
                        span(String(comment.votes.down)),
                        voteIcon('down', h('i.icon-thumbs-down'))
                    ]),
                    a({ attrs: { class: classNames('dib', 'v-mid', 'btn-icon', 'vote', { active: voted === 1 }) }, dataset: { id: comment.id, type: 'comment', intent: 'up' } }, [
                        span(String(comment.votes.up)),
                        voteIcon('up', h('i.icon-thumbs-up'))
                    ]),
                ])
            ])
        ]),
        h('div.pt1', virtualize(`<p class="ma0">${md.render(comment.content)}</p>`)),
        repliesCount > 0 
            ? div('.pt2.nested-replies', replies.list.map(comment => commentView({ comment: state.own.comments.map[comment.id], state, noPadding: true })))
            : div(),
        ui.replyTo === comment.id
            ? div(comment.reply_type == 'post' ? '.pl4' : '.pl0', replyView(user, ui, 'comment', comment.id, true))
            : div(),
    ]);
}

const mentions = new Tribute({
    values: [
        { key: 'Phil Heartman', value: 'pheartman' },
        { key: 'Gordon Ramsey', value: 'gramsey' }
    ]
})

function replyView(user, ui, type, id, nested = false) {
    let props = {value: ''}

    const inactive = ui.commenting == false || ui.commentingType !== type || ui.commentingId != id
    if (!inactive) {
        props.value = ui.reply
    }

    return h('div.comment.flex.fade-in', {class: {pb3: nested == false, pt3: nested}}, [
        h('a', {attrs: {href: '/', rel: 'author'}}, [
            h('div', user.image ? h('img', {attrs: {src: user.image, alt: `Avatar de ${user.username}`}}) : h('div.empty-avatar', user.username.substr(0, 1))),
        ]),
        h('form.pl2.flex-auto.fade-in.reply-form', {dataset: {type, id}}, [
            h('textarea.form-input.replybox.mb2', {
                hook: {
                    insert: vnode => {
                        if (nested) {
                            debounce(vnode => vnode.elm.focus(), 100)(vnode)
                        }    
                        autosize(vnode.elm)
                        mentions.attach(vnode.elm)
                    }
                }, 
                dataset: {type, id}, 
                props,
                attrs: {
                    rows: 1, 
                    placeholder: t`Escribe aquí tu respuesta...`, 
                    autofocus: nested
                }
            }),
            h('div.tr', {class: {dn: ui.commenting == false || ui.commentingType !== type || ui.commentingId != id}}, [
                h('button.btn.btn-primary.mr2', { attrs: { type: 'submit' } }, t`Publicar comentario`),
                h('button#cc.btn', { attrs: { type: 'reset' } }, t`Cancelar`),
            ])
        ])
    ]);
}

function toastView(toast) {
    return h('div', {attrs: {class: 'mb2 fade-in shadow-4 toast toast-' + toast.type}}, toast.content);
}