import {h} from '@cycle/dom';
import timeago from 'timeago.js';

const ago = timeago(null, 'es');

export function view(state$) {
    return state$.map(state => {
        const {loading, list, error, subcategories} = state;

        return h('section.fade-in.feed.flex.flex-column', [
            h('section.tabs', [
                h('div.categories.flex.items-center', [
                    h('h2.flex-auto', 'Todas las categorias'),
                    h('div', h('a.dib.btn-icon', h('span.icon-down-open')))
                ]),
                h('div.filters.flex', [
                    h('div.flex-auto', [
                        h('nav', [
                            h('a.active', 'Recientes'),
                            h('a', 'Más populares'),
                        ])
                    ]),
                    h('div.pl3', [
                        h('button.btn.btn-sm.btn-primary', 'Crear publicación'),
                    ])
                ])
            ]),
            h('section.list.flex-auto', list.map(post => {
                const {author} = post;

                return h('article.post.flex.items-center', [
                    h('div.flex-auto', [
                        h('a.category', subcategories != false ? subcategories[post.category].name : h('span.loading')),
                        h('h1', h('a.link', {attrs: {href: `/p/${post.slug}/${post.id}`}, dataset: {postId: post.id}}, post.title)),
                        h('a', {attrs: {href: '/', rel: 'author'}}, [
                            h('div', author.image ? h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : h('div.empty-avatar', author.username.substr(0, 1))),
                            h('div', [
                                h('span', author.username),
                                h('span.ago', 'Publicó ' + ago.format(post.created_at))
                            ])
                        ]),
                    ]),
                    h('div.tc', {style: {minWidth: '50px'}}, [
                        h('span.icon-chat-alt'),
                        h('span.pl2.b', post.comments.count)
                    ])
                ]);
            }).concat([
                h('div.pv2', h('div.loading'))
            ]))
        ]);
    });
}