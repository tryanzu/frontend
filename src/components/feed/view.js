import {h, p, span, section, h2, a, div, nav, button, article, img, h1, ul, li, h3} from '@cycle/dom';
import timeago from 'timeago.js';

const ago = timeago(null, 'es');

export function view(state$) {
    return state$.map(state => {
        const { loading, list, error, subcategories, endReached } = state.own
        const { postId } = state.shared

        return section('.fade-in.feed.flex.flex-column', [
            section('.tabs', [
                categories(state),
                div('.filters.flex', [
                    div('.flex-auto', [
                        nav([
                            a('.active', 'Recientes'),
                            a('Populares'),
                        ])
                    ]),
                    div('.pl3', [
                        a('.btn.btn-sm.btn-primary', { attrs: { href: '/publicar' } }, 'Crear publicación'),
                    ])
                ])
            ]),
            section('.list.flex-auto', list.map(post => {
                const {author} = post
                const href = `/p/${post.slug}/${post.id}`

                return article('.post.flex.items-center', { class: { active: postId == post.id }, dataset: { href } }, [
                    div('.flex-auto', [
                        subcategories != false
                        ? a('.category', { attrs: {href: `/c/${subcategories[post.category].slug}`} }, subcategories[post.category].name)
                        : a('.category', h('span.loading')),
                        h1(
                            a('.link', {attrs: { href }, dataset: {postId: post.id}}, post.title)
                        ),
                        h('a', {attrs: {rel: 'author'}}, [
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
            }).concat(
                endReached
                ? [
                    div('.pv2', p('.measure.center.ph2.gray.lh-copy.tc', 'No encontramos más publicaciones por cargar.'))
                ]
                : [
                    div('.pv2', div('.loading', {class: {dn: !loading}}))
                ]
            ))
        ]);
    });
}

function categories(state) {
    const { categories } = state.shared
    const { subcategories, category } = state.own
    
    const slugs = state.own.subcategoriesBySlug || {}
    const list = categories || []
    const menu = list.reduce((all, current) => {
        return all
            .concat(li('.divider', { dataset: { content: current.name } }))
            .concat(current.subcategories.map(s => li('.menu-item', a({attrs: {href: '/c/' + s.slug}}, s.name))))
    }, [])

    return div('.categories.flex.items-center', 
        category !== false && category in slugs 
        ? [
            a('.dib.btn-icon', { attrs: { href: '/', tabindex: 0 } }, span('.icon-left-open')),
            h2('.pl2.flex-auto.fade-in', slugs[category].name),
        ]
        : [
            h2('.flex-auto.fade-in', 'Todas las categorias'),
            div('.dropdown.dropdown-right.fade-in', [
                a('.dib.btn-icon.dropdown-toggle', { attrs: {tabindex: 0} }, span('.icon-down-open')),
                ul('.menu', menu)
            ])
        ]
    )
}