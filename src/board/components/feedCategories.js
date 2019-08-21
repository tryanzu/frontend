import h from 'react-hyperscript';
import { Link } from 'react-router-dom';
import { memo } from 'react';
import { t } from '../../i18n';

export const FeedCategories = memo(props => {
    const { feed, categories, subcategories } = props;
    const { category } = feed;
    const slugs = subcategories.slug || {};
    const list = categories || [];
    const menu = list.reduce((all, current) => {
        return all
            .concat(
                h('div.divider', {
                    key: current.name,
                    'data-content': current.name,
                })
            )
            .concat(
                current.subcategories.map(s =>
                    h(
                        'li.menu-item',
                        { key: s.slug },
                        h(Link, { to: '/c/' + s.slug }, s.name)
                    )
                )
            );
    }, []);

    return h(
        'div.categories.flex.items-center',
        (category !== false && category in slugs) || feed.search.length > 0
            ? [
                  h(
                      Link,
                      {
                          className: 'dib btn-icon',
                          to: '/',
                          tabIndex: 0,
                      },
                      h('span.icon-left-open')
                  ),
                  h(
                      'h2.pl2.flex-auto.fade-in',
                      feed.search.length > 0
                          ? t`Buscando: ${feed.search}`
                          : slugs[category].name
                  ),
                  feed.loading && h('span.loading.mr4'),
              ]
            : [
                  h('h2.flex-auto.fade-in', t`Todas las categorias`),
                  feed.loading && h('span.loading.mr4'),
                  h('div.dropdown.dropdown-right.fade-in', [
                      h(
                          'a.dib.btn-icon.dropdown-toggle',
                          { tabIndex: 0 },
                          h('span.icon-down-open')
                      ),
                      h('ul.menu', menu),
                  ]),
              ]
    );
});
