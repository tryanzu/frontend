import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { ago, t } from '../../i18n';
import { Link } from 'react-router-dom';

const { div, img, small, span, i } = helpers(h);

export function Author({ item, ...props }) {
    const label = props.label || t`Publicó`;
    const { author } = item;
    const noAvatar = props.noAvatar || false;
    return h(
        Link,
        {
            to: `/u/${author.username}/${author.id}`,
            rel: 'author',
        },
        [
            noAvatar === false &&
                div([
                    author.image
                        ? img({
                              src: author.image,
                              alt: t`Avatar de ${author.username}`,
                          })
                        : div('.empty-avatar', author.username.substr(0, 1)),
                ]),
            div([span('.b', author.username)]),
            div(
                '.flex-shrink-0.mr2',
                {},
                small(
                    '.bg-light-gray.br1.gray.ml2',
                    { style: { padding: '2px 5px' } },
                    [
                        i('.icon-crown.gold'),
                        span('.b', ' ' + String(author.gaming.swords)),
                    ]
                )
            ),
            div('.w-100.w-auto-ns', [
                small('.ago', label + t` hace ` + ago(item.created_at)),
            ]),
        ]
    );
}
