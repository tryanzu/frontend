import {h, span, section, h2, a, div, nav, button, article, img, h1, ul, li, h3} from '@cycle/dom';
import timeago from 'timeago.js';

const ago = timeago(null, 'es');

export function view(state$) {
    return state$.map(state => {
        const { loading, list, error, subcategories } = state.own
        const { postId } = state.shared

        return section('.fade-in.feed.flex.flex-column', [
            section('.tabs', [
                categories(state),
                div('.filters.flex', [
                    div('.flex-auto', [
                        nav([
                            a('.active', 'Recientes'),
                            a('Más populares'),
                        ])
                    ]),
                    div('.pl3', [
                        a('.btn.btn-sm.btn-primary', { attrs: { href: '/publicar' } }, 'Crear publicación'),
                    ])
                ])
            ]),
            section('.list.flex-auto', list.map(post => {
                const {author} = post

                return article('.post.flex.items-center', {class: {active: postId == post.id}}, [
                    div('.flex-auto', [
                        a('.category', subcategories != false ? subcategories[post.category].name : h('span.loading')),
                        h1(
                            a('.link', {attrs: {href: `/p/${post.slug}/${post.id}`}, dataset: {postId: post.id}}, post.title)
                        ),
                        h('a', {attrs: {href: '/', rel: 'author'}}, [
                            div(author.image ? img({attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) : div('.empty-avatar', author.username.substr(0, 1))),
                            div([
                                span(author.username),
                                span('.ago', 'Publicó ' + ago.format(post.created_at))
                            ])
                        ]),
                    ]),
                    div('.tc', {style: {minWidth: '50px', flexShrink: 0}}, [
                        span('.icon-chat-alt'),
                        span('.pl2.b', post.comments.count),
                        'newCount' in post.comments ? span('.new-comments', `+${post.comments.newCount}`) : null
                    ])
                ])
            }).concat([
                div('.pv2', div ('.loading'))
            ]))
        ]);
    });
}

function categories(state) {
    const { categories } = state.shared
    
    const list = categories || []
    const menu = list.reduce((all, current) => {
        return all
            .concat(li('.divider', { dataset: { content: current.name } }))
            .concat(current.subcategories.map(s => li('.menu-item', a(s.name))))
    }, [])

    return div('.categories.flex.items-center', [
        h2('.flex-auto', 'Todas las categorias'),
        div('.dropdown.dropdown-right', [
            a('.dib.btn-icon.dropdown-toggle', { attrs: {tabindex: 0} }, span('.icon-down-open')),
            ul('.menu', menu)
        ])
    ])
}