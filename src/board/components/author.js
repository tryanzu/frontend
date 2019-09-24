import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { ago, t } from '../../i18n';
import { Link } from 'react-router-dom';

const { div, img, small, span, i, p } = helpers(h);

export function AuthorAvatarLink({ user }) {
    return h(Link, { to: `/u/${user.username}/${user.id}`, rel: 'author' }, [
        div(
            '.dn.db-ns',
            {},
            user.image
                ? img({
                      src: user.image,
                      alt: t`Avatar de ${user.username}`,
                  })
                : div('.empty-avatar', {}, user.username.substr(0, 1))
        ),
    ]);
}

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
            div([
                span('.b', [
                    author.username,
                    small(
                        '.bg-light-gray.br1.gray.ml2',
                        { style: { padding: '2px 5px' } },
                        [
                            i('.icon-crown.gold'),
                            span('.b', ' ' + String(author.gaming.swords)),
                        ]
                    ),
                ]),
                p('.mb0', author.description || ''),
            ]),
            div('.w-100.w-auto-ns', [
                small('.ago.ml2', label + t` hace ` + ago(item.created_at)),
            ]),
        ]
    );
}
