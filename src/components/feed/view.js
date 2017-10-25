import {h} from '@cycle/dom';

export function view(state$) {
    return state$.map(state => {
        const {loading, list, error, subcategories} = state;

        return h('div.fade-in.feed.flex.flex-column', [
            h('section.list.flex-auto', list.map(post => {
                const {author} = post;

                return h('article.post.flex.items-center', [
                    h('div.flex-auto', [
                        h('a.category', subcategories != false ? subcategories[post.category].name : h('span.loading')),
                        h('h1', h('a', post.title)),
                        h('a', {attrs: {href: '/', rel: 'author'}}, [
                            h('div', h('img', {attrs: {src: author.image, alt: `Avatar de ${author.username}`}})),
                            h('div', [
                                h('span', author.username),
                                h('span.ago', 'Publicó hace 20 minutos')
                            ])
                        ]),
                    ]),
                    h('div.tc', {style: {minWidth: '50px'}}, [
                        h('span.icon.icon-message'),
                        h('span.pl2.b', post.comments.count)
                    ])
                ]);
            }))
        ]);
    });
}