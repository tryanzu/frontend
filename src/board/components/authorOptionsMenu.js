import h from 'react-hyperscript';
import { Link } from 'react-router-dom';
import { t } from '../../i18n';
import helpers from 'hyperscript-helpers';

const tags = helpers(h);
const { i } = tags;

export function AuthorOptionsMenu({ author, bold = false }) {
    return h('div.popover.popover-right', [
        !bold && h('span', author.username),
        bold && h('span.b', author.username),
        h('div.popover-container.pa0', { style: { top: '150%' } }, [
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
