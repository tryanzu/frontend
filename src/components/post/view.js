import {h} from '@cycle/dom';
import timeago from 'timeago.js';
import {Quickstart} from '../quickstart';
import markdown from 'markdown-it';
import emoji from 'markdown-it-emoji';
import mila from 'markdown-it-link-attributes';
import virtualize from 'snabbdom-virtualize';

const ago = timeago(null, 'es');
const md = markdown({html: false, linkify: true, typographer: false}).disable('image');
md.use(emoji);
md.use(mila, {target: '_blank', rel: 'noopener', class: 'link blue hover-green'});

export function view(state$) {
    return state$.map(state => {
        const {post, loading} = state;
        const {author} = post;

        return h('section.fade-in.post', [
            post == false ? Quickstart() : h('div.current-article', [
                h('article', [
                    h('a', {attrs: {href: '/', rel: 'author'}}, [
                        h('div', author.image ? h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : h('div.empty-avatar', author.username.substr(0, 1))),
                        h('div', [
                            h('span', author.username),
                            h('span.ago', 'Publicó ' + ago.format(post.created_at))
                        ])
                    ]),
                    h('h1', post.title),
                    virtualize(`<p>${md.renderInline(post.content)}</p>`),
                    h('div.separator')
                ])
            ])
        ]);
    });
}