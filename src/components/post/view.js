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

function authorBlock(item, label = 'Publicó') {
    const {author} = item;

    return h('a', {attrs: {href: '/', rel: 'author'}}, [
        h('div', author.image ? h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : h('div.empty-avatar', author.username.substr(0, 1))),
        h('div', [
            h('span.b', author.username),
            h('span', [
                h('small.bg-light-gray.br1.gray', {style: {padding: '2px 5px'}}, [
                    h('i.fa.fa-star.gold'),
                    h('span.ml1.b', String(author.gaming.swords))
                ])
            ])
        ]),
        h('div.pl2.top', h('small.ago', label + ' ' + ago.format(item.created_at)))
    ]);
}

function commentBlock(comment) {
    return h('div.pb1', [
        h('div.flex', [
            h('div.flex-auto', authorBlock(comment, 'Comentó')),
            h('div', [
                h('a.dib.v-mid.btn.btn-link', [
                    h('i.fa.fa-mail-reply'), 
                    h('span.pl2', 'Responder')
                ]),
                h('a.dib.v-mid.ph2.mid-gray', comment.votes.up + comment.votes.down),
                h('a.dib.v-mid.ph2.mid-gray', h('i.fa.fa-thumbs-o-down')),
                h('a.dib.v-mid.ph2.mid-gray', h('i.fa.fa-thumbs-o-up')),
            ])
        ]),
        h('div.pt1', virtualize(`<p>${md.renderInline(comment.content)}</p>`),)
    ]);
}

export function view(state$) {
    return state$.map(state => {
        const {post, loading} = state;
        const {author, comments} = post;

        if (loading) {
            return h('section.post', [
                h('div.current-article', h('div.pv2', h('div.loading')))
            ]);
        }

        return h('section.fade-in.post', [
            post == false ? Quickstart() : h('div.current-article', [
                h('article', [
                    authorBlock(post),
                    h('h1', post.title),
                    virtualize(`<p>${md.renderInline(post.content)}</p>`),
                    h('div.separator.pt2'),
                    h('h3.pb2', `${comments.count} comentarios`),
                    h('section', comments.set.map(commentBlock))
                ])
            ])
        ]);
    });
}