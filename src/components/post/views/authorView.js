import { a, div, span, small, i, img } from '@cycle/dom'
import { ago } from '../../../i18n'

export function authorView(item, label = 'Publicó') {
    const { author } = item

    return a({ attrs: {href: '/', rel: 'author'} }, [
        div(
            author.image 
            ? img({attrs: {src: author.image, alt: `Avatar de ${author.username}`}}) 
            : div('.empty-avatar', author.username.substr(0, 1))
        ),
        div([
            span('.b', author.username),
            span('.mt1', [
                small('.bg-light-gray.br1.gray', {style: {padding: '2px 5px'}}, [
                    i('.icon-star-filled.gold'),
                    span('.b', ' ' + String(author.gaming.swords))
                ])
            ])
        ]),
        div('.pl2.top', small('.ago', label + ' ' + ago(item.created_at)))
    ])
}