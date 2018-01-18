import {
    h,
    div,
    section,
    i,
    p,
    button
} from '@cycle/dom'
import debounce from 'lodash/debounce'
import timeago from 'timeago.js'
import { Quickstart } from '../quickstart'
import markdown from 'markdown-it'
import emoji from 'markdown-it-emoji'
import mila from 'markdown-it-link-attributes'
import virtualize from 'snabbdom-virtualize'
import autosize from 'autosize'

export function view(state$) {
    return state$.map(state => {
        const {user} = state.shared
        const {post, resolving, voting, toasts, comments, ui} = state.own
        const _comments = post.comments

        if (resolving) {
            return section('.post', [
                div('.current-article', div('.pv2', div('.loading')))
            ])
        }

        const toastsVNode = toasts.length == 0 ? h('div') : h('div.absolute.right-1.top-1.z-1.fade-in', toasts.map(toastView))
        const postVNode = post == false ? Quickstart() : h('div.current-article', [
            h('article', [
                h('div.flex', [
                    h('div.flex-auto', author(post)),
                    h('div', [
                        user.id != post.user_id ? h('a.dib.btn-icon.gray', [
                            h('i.icon-warning-empty'),
                            h('span.ml1', 'reportar')
                        ]) : null,
                        user.id == post.user_id ? h('a.dib.btn-icon.gray', h('i.icon-edit')) : null
                    ])
                ]),
                h('h1', post.title),
                virtualize(`<p>${md.render(post.content)}</p>`),
                h('div.separator.pt2'),
                h('div.flex.items-center.mb3', [
                    h('h3.flex-auto', `${_comments.count} comentarios`),
                    h('div', h('small', 'Ordenar comentarios por')),
                    h('div.form-group.mb0.ml2', h('select.form-select.select-sm', [
                         h('option', 'Recomendaciones')
                    ]))
                ]),
                user !== false ? replyView(user, ui, 'post', post.id) : h('div'),
                comments.list !== false && comments.list.length == 0
                    ? div('.empty', [
                        div('.empty-icon', i('.f4.icon-chat-alt')),
                        p('.empty-title.f5.fw5', 'Nadie ha respondido aún'),
                        p('.empty-subtitle', 'Únete a la conversación y sé el primero en contestar.'),
                        div('.empty-action', button('.btn.btn-primary', 'Escribir respuesta'))
                    ])  
                    : null,
                section(
                    comments.list !== false && comments.resolving == false ? 
                        comments.list.map(c => {
                            const isVoting = voting !== false && voting.id == c.id ? voting.intent : false

                            return commentView(c, isVoting, user, false, ui)
                        }) 
                        : (comments.resolving ? h('div.pv2', h('div.loading')) : [])
                )
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

function commentView(comment, voting, currentUser = false, noPadding = false, ui) {

    // Loading vote status helper.
    const voted = comment.liked || false;
    const replies = comment.replies || {};
    const repliesCount = replies.count || 0;
    const voteIcon = (intent, vnode) => voting !== false && intent == voting ? h('div.loading') : vnode;
    const voteColor = (intent) => {
        if (voted == -1 && intent == 'down') return 'blue';
        if (voted == 1 && intent == 'up') return 'blue';

        return 'mid-gray';
    };

    const isCurrentUsersComment = currentUser.id == comment.user_id;

    return h('div', {class: {pb3: noPadding == false}, key: comment.id}, [
        h('div.flex', [
            h('div.flex-auto', author(comment, 'Comentó')),
            h('div', [
                h('a.v-mid.pointer.reply-to', {class: {dn: isCurrentUsersComment, dib: !isCurrentUsersComment}, dataset: {id: comment.id}}, [
                    h('i.icon-reply-outline'), 
                    h('span.pl2', 'Responder')
                ]),
                h('div.dib.v-mid', [
                    h('a.dib.v-mid.ph2.mid-gray', comment.votes.up - comment.votes.down),
                    h('a', {attrs: {class: 'dib v-mid btn-icon vote ' + voteColor('down')}, dataset: {id: comment.id, type: 'comment', intent: 'down'}}, voteIcon('down', h('i.icon-thumbs-down'))),
                    h('a', {attrs: {class: 'dib v-mid btn-icon ph2 ml2 vote ' + voteColor('up')}, dataset: {id: comment.id, type: 'comment', intent: 'up'}}, voteIcon('up', h('i.icon-thumbs-up'))),
                ])
            ])
        ]),
        h('div.pt1', virtualize(`<p class="ma0">${md.render(comment.content)}</p>`)),
        ui.replyTo === comment.id 
            ? replyView(currentUser, ui, 'comment', comment.id, true)
            : h('div'),
        repliesCount > 0 
            ? h('div.pt3.pl4', replies.list.map(c => commentView(c, false, currentUser, true, ui)))
            : h('div'),
    ]);
}

function replyView(user, ui, type, id, nested = false) {
    return h('div.comment.flex.fade-in', {class: {pb3: nested == false, pt3: nested}}, [
        h('a', {attrs: {href: '/', rel: 'author'}}, [
            h('div', user.image ? h('img', {attrs: {src: user.image, alt: `Avatar de ${user.username}`}}) : h('div.empty-avatar', user.username.substr(0, 1))),
        ]),
        h('form.pl2.flex-auto.fade-in.reply-form', {dataset: {type, id}}, [
            h('textarea.form-input.replybox.mb2', {
                hook: {
                    insert: vnode => {
                        debounce(vnode => vnode.elm.focus(), 100)(vnode)
                        autosize(vnode.elm)
                    }
                }, 
                dataset: {type, id}, 
                attrs: {
                    rows: 1, 
                    placeholder: 'Escribe aquí tu respuesta...', 
                    autofocus: nested
                }
            }),
            h('div.tr', {class: {dn: ui.commenting == false || ui.commentingType !== type || ui.commentingId != id}}, [
                h('button#cc.btn.mr2', {attrs: {}}, 'Cancelar'),
                h('button.btn.btn-primary', {attrs: {type: 'submit'}}, 'Publicar comentario')
            ])
        ])
    ]);
}

function toastView(toast) {
    return h('div', {attrs: {class: 'mb2 fade-in shadow-4 toast toast-' + toast.type}}, toast.content);
}