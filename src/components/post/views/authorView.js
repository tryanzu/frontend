import { a, div, span, small, i, img } from '@cycle/dom';
import { ago } from '../../../i18n';

export function authorView(item, label = 'Publicó') {
    const { author } = item;

    return a(
        {
            attrs: {
                href: `/u/${author.username}/${author.id}`,
                rel: 'author',
            },
        },
        [
            div(
                author.image
                    ? img({
                          attrs: {
                              src: author.image,
                              alt: `Avatar de ${author.username}`,
                          },
                      })
                    : div('.empty-avatar', author.username.substr(0, 1))
            ),
            div(span('.b', author.username)),
            div(
                '.flex-shrink-0.mr2',
                small(
                    '.bg-light-gray.br1.gray.ml2',
                    { style: { padding: '2px 5px' } },
                    [
                        i('.icon-crown.gold'),
                        span('.b', ' ' + String(author.gaming.swords)),
                    ]
                )
            ),
            div(small('.ago', label + ' hace ' + ago(item.created_at))),
        ]
    );
}
