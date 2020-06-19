import h from 'react-hyperscript';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import helpers from 'hyperscript-helpers';
import classNames from 'classnames';

const tags = helpers(h);
const { i, figure } = tags;

export function AuthorOptionsMenu({ author, lastSeen, authenticated }) {
    return h('div.popover.popover-right', [
        figure('.avatar', [
            author.image
                ? h('img', {
                      src: author.image,
                      alt: `Avatar de ${author.username}`,
                  })
                : h(
                      'div.empty-avatar.h-100.flex.items-center.justify-center',
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
        h('div.popover-container.pa0', [
            h('ul.menu.h-100', {}, [
                h('li.menu-item', {}, [
                    h(
                        Link,
                        {
                            to: `/u/${author.username}/${author.id}`,
                            rel: 'author',
                            onClick: event => event.stopPropagation(),
                        },
                        [i('.mr1.icon-user'), t`Ver perfil`]
                    ),
                ]),
                authenticated &&
                    h('li.menu-item', {}, [
                        h(
                            Link,
                            {
                                to: `/chat/u:${author.id}`,
                                rel: 'author',
                                onClick: event => event.stopPropagation(),
                            },
                            [i('.mr1.icon-chat-alt'), t`Chat privado`]
                        ),
                    ]),
            ]),
        ]),
    ]);
}
