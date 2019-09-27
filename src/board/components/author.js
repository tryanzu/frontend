import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t, dateToString } from '../../i18n';
import { Link } from 'react-router-dom';

const { div, img, small, span, i, p, time } = helpers(h);

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
    const { author } = item;
    const noAvatar = props.noAvatar || false;
    return h(
        Link,
        {
            to: `/u/${author.username}/${author.id}`,
            rel: 'author',
            className: props.className || '',
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
            div('.flex-auto', [
                span('.b', [author.username]),
                author.description && p('.mb0.bio', author.description || ''),
            ]),
            time('.flex-auto.text-right', [
                dateToString(item.created_at, 'D MMMM YYYY HH:mm'),
                props.children || false,
            ]),
        ]
    );
}
