import {h} from '@cycle/dom';
import timeago from 'timeago.js';
import {Quickstart} from '../quickstart';
import markdown from 'markdown-it';
import emoji from 'markdown-it-emoji';
import mila from 'markdown-it-link-attributes';
import virtualize from 'snabbdom-virtualize';

const ago = timeago(null, 'es');
const md = markdown({html: true, linkify: true, typographer: false}).disable('image');
md.use(emoji);
md.use(mila, {target: '_blank', rel: 'noopener', class: 'link blue hover-green'});

function author(item, label = 'Publicó') {
    const {author} = item;

    return h('a', {attrs: {href: '/', rel: 'author'}}, [
        h('div', author.image ? h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : h('div.empty-avatar', author.username.substr(0, 1))),
        h('div', [
            h('span.b', author.username),
            h('span', [
                h('small.bg-light-gray.br1.gray', {style: {padding: '2px 5px'}}, [
                    h('i.icon-star-filled.gold'),
                    h('span.b', ' ' + String(author.gaming.swords))
                ])
            ])
        ]),
        h('div.pl2.top', h('small.ago', label + ' ' + ago.format(item.created_at)))
    ]);
}

function commentBlock(comment, voting, currentUser = false, noPadding = false) {

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

    return h('div', {class: {pb3: noPadding == false}}, [
        h('div.flex', [
            h('div.flex-auto', author(comment, 'Comentó')),
            h('div', [
                h('a.dib.v-mid.btn.btn-link', [
                    h('i.icon-reply-outline'), 
                    h('span.pl2', 'Responder')
                ]),
                h('div.dib.v-mid', [
                    h('a.dib.v-mid.ph2.mid-gray', comment.votes.up - comment.votes.down),
                    h('a', {attrs: {class: 'dib v-mid ph2 vote ' + voteColor('down')}, dataset: {id: comment.id, type: 'comment', intent: 'down'}}, voteIcon('down', h('i.icon-thumbs-down'))),
                    h('a', {attrs: {class: 'dib v-mid ph2 vote ' + voteColor('up')}, dataset: {id: comment.id, type: 'comment', intent: 'up'}}, voteIcon('up', h('i.icon-thumbs-up'))),
                ])
            ])
        ]),
        h('div.pt1', virtualize(`<p class="ma0">${md.renderInline(comment.content)}</p>`)),
        repliesCount > 0 
            ? h('div.pt2.pl4', replies.list.map(c => commentBlock(c, false, false, true)))
            : h('div')
    ]);
}

function toastView(toast) {
    return h('div', {attrs: {class: 'mb2 fade-in shadow-4 toast toast-' + toast.type}}, toast.content);
}

export function view(state$) {
    return state$.map(state => {
        const {post, resolving, voting, toasts, user, comments, ui} = state;
        const _comments = post.comments;

        if (resolving.post) {
            return h('section.post', [
                h('div.current-article', h('div.pv2', h('div.loading')))
            ]);
        }

        const toastsVNode = toasts.length == 0 ? h('div') : h('div.absolute.right-1.top-1.z-1.fade-in', toasts.map(toastView));
        const postVNode = post == false ? Quickstart() : h('div.current-article', [
            h('article', [
                h('div.flex', [
                    h('div.flex-auto', author(post)),
                    h('div', [
                        h('a.dib.btn-icon.gray', [
                            h('i.icon-warning-empty'),
                            h('span.ml1', 'reportar')
                        ])
                    ])
                ]),
                h('h1', post.title),
                virtualize(`<p>${md.renderInline(post.content)}</p>`),
                h('div.separator.pt2'),
                h('div.flex.items-center.mb3', [
                    h('h3.flex-auto', `${_comments.count} comentarios`),
                    h('div', h('small', 'Ordenar comentarios por')),
                    h('div.form-group.mb0.ml2', h('select.form-select.select-sm', [
                         h('option', 'Recomendaciones')
                    ]))
                ]),
                user !== false ? h('div.comment.flex.pb3', [
                    h('a', {attrs: {href: '/', rel: 'author'}}, [
                        h('div', user.image ? h('img', {attrs: {src: user.image, alt: `Avatar de ${user.username}`}}) : h('div.empty-avatar', user.username.substr(0, 1))),
                    ]),
                    h('div.pl2.flex-auto', [
                        h('textarea.form-input.replybox.mb2', {attrs: {rows: 1}}),
                        h('div.tr.fade-in', {class: {dn: ui.commentFocus == false}}, [
                            h('button.btn.mr2', {attrs: {}}, 'Cancelar'),
                            h('button.btn.btn-primary', {attrs: {}}, 'Publicar comentario')
                        ])
                    ])
                ]) : h('div'),
                h('section', 
                    comments !== false && resolving.comments == false
                        ? comments.map(c => {
                            //const c = comments.set[id];
                            const isVoting = voting !== false && voting.id == c.id ? voting.intent : false;
                            const currentUser = user !== false ? c.author.id == user.id : false;
                            return commentBlock(c, isVoting, currentUser);
                        }) 
                        : (resolving.comments ? h('div.pv2', h('div.loading')) : [])
                )
            ])
        ]);

        return h('section.fade-in.post.relative', [
            toastsVNode,
            postVNode,
            h('footer.pa3.pt4', [
                h('small.silver', 'Powered by Anzu community software v0.1 alpha')
            ])
        ]);
    });
}