import {
    p,
    span,
    section,
    h2,
    a,
    div,
    nav,
    article,
    img,
    h1,
    ul,
    li,
} from '@cycle/dom';
import { ago } from '../../i18n';

export function view(state$) {
    return state$.map(state => {
        const { loading, list, counters, endReached } = state.own;
        const { postId, subcategories } = state.shared;

        return section('.fade-in.feed.flex.flex-column', [
            section('.tabs', [
                categories(state),
                div('.filters.flex', [
                    div('.flex-auto', [
                        nav([a('.active', 'Recientes'), a('Populares')]),
                    ]),
                    div('.pl3', [
                        a(
                            '.btn.btn-sm.btn-primary',
                            { attrs: { href: '/publicar' } },
                            'Crear publicación'
                        ),
                    ]),
                ]),
                div(
                    '.new-posts.shadow.toast.toast-success',
                    { class: { dn: counters.posts == 0 } },
                    [
                        a(
                            '.load-more',
                            `Cargar ${counters.posts} ${
                                counters.posts > 1
                                    ? 'nuevas publicaciones'
                                    : 'nueva publicación'
                            }`
                        ),
                        span('.icon-cancel.fr'),
                    ]
                ),
            ]),
            section(
                '.list.flex-auto',
                list
                    .map(post => {
                        const { author } = post;
                        const href = `/p/${post.slug}/${post.id}`;
                        const recent = counters.recent[post.id] || 0;
                        const missed = counters.missed[post.id] || 0;
                        const category =
                            subcategories.id[post.category] || false;

                        return article(
                            '.post',
                            {
                                class: { active: postId == post.id },
                                dataset: { href },
                            },
                            [
                                div('.flex.items-center', [
                                    div(
                                        '.flex-auto',
                                        category != false
                                            ? a(
                                                  '.category',
                                                  {
                                                      attrs: {
                                                          href: `/c/${
                                                              category.slug
                                                          }`,
                                                      },
                                                  },
                                                  category.name
                                              )
                                            : a('.category', span('.loading'))
                                    ),
                                    post.pinned
                                        ? span('.icon-pin.pinned-post')
                                        : null,
                                ]),

                                div('.flex.items-center', [
                                    div('.flex-auto', [
                                        h1(
                                            a(
                                                '.link',
                                                {
                                                    attrs: { href },
                                                    dataset: {
                                                        postId: post.id,
                                                    },
                                                },
                                                post.title
                                            )
                                        ),
                                        a({ attrs: { rel: 'author' } }, [
                                            div(
                                                author.image
                                                    ? img({
                                                          attrs: {
                                                              src: author.image,
                                                              alt: `Avatar de ${
                                                                  author.username
                                                              }`,
                                                          },
                                                      })
                                                    : div(
                                                          '.empty-avatar',
                                                          author.username.substr(
                                                              0,
                                                              1
                                                          )
                                                      )
                                            ),
                                            div([
                                                span(author.username),
                                                span(
                                                    '.ago',
                                                    'Publicó hace ' +
                                                        ago(post.created_at)
                                                ),
                                            ]),
                                        ]),
                                    ]),
                                    div(
                                        '.tc',
                                        {
                                            style: {
                                                minWidth: '50px',
                                                flexShrink: 0,
                                            },
                                        },
                                        [
                                            span('.icon-chat-alt'),
                                            span(
                                                '.pl2.b',
                                                post.comments.count + recent
                                            ),
                                            missed > 0
                                                ? span(
                                                      '.new-comments',
                                                      `+${missed}`
                                                  )
                                                : null,
                                        ]
                                    ),
                                ]),
                            ]
                        );
                    })
                    .concat(
                        endReached
                            ? [
                                  div(
                                      '.pv2',
                                      p(
                                          '.measure.center.ph2.gray.lh-copy.tc',
                                          'No encontramos más publicaciones por cargar.'
                                      )
                                  ),
                              ]
                            : [
                                  div(
                                      '.pv2',
                                      div('.loading', {
                                          class: { dn: !loading },
                                      })
                                  ),
                              ]
                    )
            ),
        ]);
    });
}

function categories(state) {
    const { categories } = state.shared;
    const { category } = state.own;

    const slugs = state.shared.subcategories.slug || {};
    const list = categories || [];
    const menu = list.reduce((all, current) => {
        return all
            .concat(li('.divider', { dataset: { content: current.name } }))
            .concat(
                current.subcategories.map(s =>
                    li(
                        '.menu-item',
                        a({ attrs: { href: '/c/' + s.slug } }, s.name)
                    )
                )
            );
    }, []);

    return div(
        '.categories.flex.items-center',
        category !== false && category in slugs
            ? [
                  a(
                      '.dib.btn-icon',
                      { attrs: { href: '/', tabindex: 0 } },
                      span('.icon-left-open')
                  ),
                  h2('.pl2.flex-auto.fade-in', slugs[category].name),
              ]
            : [
                  h2('.flex-auto.fade-in', 'Todas las categorias'),
                  div('.dropdown.dropdown-right.fade-in', [
                      a(
                          '.dib.btn-icon.dropdown-toggle',
                          { attrs: { tabindex: 0 } },
                          span('.icon-down-open')
                      ),
                      ul('.menu', menu),
                  ]),
              ]
    );
}
