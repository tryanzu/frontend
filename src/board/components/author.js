import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import classNames from 'classnames';
import { t, dateToString } from '../../i18n';
import { Link } from 'react-router-dom';
import { differenceInMinutes } from 'date-fns';

const { div, img, span, p, time, figure } = helpers(h);

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
    const lastSeenAt = author.last_seen_at || false;
    const lastSeen = lastSeenAt
        ? differenceInMinutes(new Date(), lastSeenAt)
        : 1000;
    return h(
        Link,
        {
            to: `/u/${author.username}/${author.id}`,
            rel: 'author',
            className: props.className || '',
        },
        [
            noAvatar === false &&
                figure('.avatar', [
                    author.image
                        ? h('img', {
                              src: author.image,
                              alt: `Avatar de ${author.username}`,
                          })
                        : h(
                              'div.empty-avatar',
                              {},
                              author.username.substr(0, 1)
                          ),
                    h('i.avatar-presence', {
                        className: classNames({
                            online: lastSeen < 15,
                            away: lastSeen >= 15 && lastSeen < 30,
                        }),
                    }),
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
