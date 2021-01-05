import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t, dateToString } from '../../i18n';
import { Link } from 'react-router-dom';
import { differenceInMinutes } from 'date-fns';
import { AuthorOptionsMenu } from './authorOptionsMenu';

const { div, img, p, time } = helpers(h);

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

export function Author({ item, authenticated, ...props }) {
    const { author } = item;
    const noAvatar = props.noAvatar || false;
    const lastSeenAt = author.last_seen_at || false;
    const lastSeen = lastSeenAt
        ? differenceInMinutes(new Date(), lastSeenAt)
        : 1000;
    return h('div.flex.items-center', [
        noAvatar === false &&
            h(AuthorOptionsMenu, { author, lastSeen, authenticated }),
        div('.flex-auto.mh1', [
            div('.flex-auto', [
                h(
                    Link,
                    {
                        to: `/u/${author.username}/${author.id}`,
                        rel: 'author',
                        style: { display: 'inline' },
                    },
                    [
                        h('span.b', {}, author.username),
                        time('.flex-auto.text-right.ml2.text-dark', [
                            dateToString(item.created_at, 'D MMMM YYYY HH:mm'),
                        ]),
                    ]
                ),
            ]),
            author.description && p('.mb0.bio', author.description || ''),
        ]),
        h('span.flex-auto.text-right', {}, props.children || false),
    ]);
}
