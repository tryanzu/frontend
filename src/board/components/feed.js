import { memo } from 'react';
import h from 'react-hyperscript';
import classNames from 'classnames';
import { i18n, t, ago } from '../../i18n';
import { FeedCategories } from './feedCategories';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import { throttle } from 'lodash';
import { differenceInMinutes } from 'date-fns';

const throttledFeedScroll = throttle(function onScroll(bottomReached, effects) {
    if (bottomReached) {
        effects.fetchMorePosts();
    }
}, 200);

export function Feed({ state, effects }) {
    const { feed, subcategories, categories } = state;
    const { list } = feed;
    function onScroll(e) {
        const bottomReached =
            e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight <
            1;
        throttledFeedScroll(bottomReached, effects);
    }
    return h('section.fade-in.feed.flex.flex-column', [
        h('section.tabs', [
            h(FeedCategories, { feed, categories, subcategories }),
            h('div.filters.flex', [
                h('div.flex-auto', [
                    h('nav', [
                        h(
                            'a.pointer',
                            {
                                onClick: () => effects.setTab(false),
                                className: classNames({
                                    active: feed.relevant === false,
                                }),
                            },
                            t`Recientes`
                        ),
                        h(
                            'a.pointer',
                            {
                                onClick: () => effects.setTab(true),
                                className: classNames({
                                    active: feed.relevant,
                                }),
                            },
                            t`Populares`
                        ),
                    ]),
                ]),
                h('div.pl3', [
                    h(
                        Link,
                        {
                            to: '/publicar',
                            className: 'btn btn-sm btn-primary dib dn-ns',
                        },
                        t`Publicar`
                    ),
                    h(
                        Link,
                        {
                            to: '/publicar',
                            className: 'btn btn-sm btn-primary dn dib-ns',
                        },
                        t`Crear publicación`
                    ),
                ]),
            ]),
            h(
                'div.new-posts.shadow.toast.toast-success',
                { className: classNames({ dn: state.counters.posts == 0 }) },
                [
                    h(
                        'a.load-more',
                        { onClick: () => effects.fetchRecentPosts() },
                        i18n
                            .translate('Cargar nueva publicación')
                            .ifPlural(
                                state.counters.posts,
                                'Cargar %d nuevas publicaciones.'
                            )
                            .fetch(state.counters.posts)
                    ),
                    h('span.icon-cancel.fr'),
                ]
            ),
        ]),
        h(
            'section.list.flex-auto',
            { onScroll },
            list
                .map(post => {
                    const localDraft = window.localStorage.getItem(
                        `anzu.markdown.post.${post.id}`
                    );
                    const draft = localDraft && JSON.parse(localDraft);
                    const hasDraft =
                        draft && draft.value && draft.value.length > 0;
                    return h(MemoFeedItem, {
                        key: post.id,
                        post,
                        hasDraft,
                        active: state.post.id === post.id,
                        subcategories,
                        recent:
                            state.counters.recent[post.id] ||
                            post.comments.count,
                        missed: state.counters.missed[post.id] || 0,
                        acknowledged: state.counters.acknowledged[post.id] || 0,
                    });
                })
                .concat([
                    feed.endReached &&
                        h('div.pv2.ph3.tc', {}, [
                            h(
                                'p.measure.center.ph2.gray.lh-copy.tc',
                                t`No encontramos más publicaciones por cargar en este momento.`
                            ),
                            h(
                                'a.btn.btn-sm.btn-primary',
                                { onClick: () => effects.fetchMorePosts() },
                                h('i.icon-arrows-cw')
                            ),
                        ]),

                    h(
                        'div.pv2',
                        { style: { minHeight: 50 } },
                        h('div.loading', {
                            className: classNames({
                                dn: !feed.loading,
                            }),
                        })
                    ),
                ])
        ),
    ]);
}

const MemoFeedItem = memo(withRouter(FeedItem));

function FeedItem(props) {
    const { post, subcategories, recent, active, history, hasDraft } = props;
    const { author } = post;
    const { count } = post.comments;
    const href = `/p/${post.slug}/${post.id}`;
    const category = subcategories.id[post.category] || false;
    const missed = recent - count;
    const lastSeenAt = author.last_seen_at || false;
    const lastSeen = lastSeenAt
        ? differenceInMinutes(new Date(), lastSeenAt)
        : 1000;

    return h(
        'article.post',
        {
            onClick: () => history.push(href),
            className: classNames({
                active,
            }),
        },
        [
            h('div.flex.items-center', [
                h(
                    'div.flex-auto',
                    {},
                    category != false &&
                        h(
                            Link,
                            {
                                className: 'category',
                                to: `/c/${category.slug}`,
                                onClick: event => event.stopPropagation(),
                            },
                            category.name
                        )
                ),
                hasDraft && h('i.icon-doc-text', {}, t`Borrador`),
                post.pinned && h('span.icon-pin.pinned-post'),
            ]),
            h('div.flex.items-center', [
                h('div.flex-auto', [
                    h(
                        'h1',
                        {},
                        h(
                            Link,
                            {
                                to: href,
                                className: 'link',
                            },
                            post.title
                        )
                    ),
                    h('div.author', [
                        h(
                            Link,
                            {
                                to: `/u/${author.username}/${author.id}`,
                                rel: 'author',
                                onClick: event => event.stopPropagation(),
                            },
                            h('figure.avatar', [
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
                            ])
                        ),
                        h('div', [
                            h(
                                Link,
                                {
                                    to: `/u/${author.username}/${author.id}`,
                                    rel: 'author',
                                    style: { display: 'inline' },
                                    onClick: event => event.stopPropagation(),
                                },
                                h('span', {}, author.username)
                            ),
                            h(
                                'span.ago.f7',
                                {},
                                t`hace` + ' ' + ago(post.created_at)
                            ),
                        ]),
                    ]),
                ]),
                h(
                    'div.tc',
                    {
                        style: {
                            minWidth: 60,
                            textAlign: 'right',
                            flexShrink: 0,
                            flexGrow: 1,
                        },
                    },
                    [
                        h('span.icon-chat-alt'),
                        h('span.pl2.b', {}, count),
                        missed > 0 && h('span.new-comments', {}, `+${missed}`),
                    ]
                ),
            ]),
        ]
    );
}
