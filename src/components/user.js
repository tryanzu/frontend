import xs from 'xstream';
import {
    main,
    section,
    h1,
    div,
    figure,
    img,
    p,
    span,
    i,
    h3,
    article,
    a,
} from '@cycle/dom';
import { ago, number } from '../i18n';

const defaultState = {
    resolving: false,
    user: false,
};

export function User(sources) {
    const actions = intent(sources);
    const effects = model(actions);
    const vtree$ = view(sources.fractal.state$);

    return {
        fractal: effects.fractal,
        DOM: vtree$,
    };
}

function intent({ DOM, HTTP, fractal, props }) {
    return {
        authToken$: props.authToken$,
    };
}

function model(actions) {
    const reducers$ = xs.merge(
        // Default state reducer
        xs.of(() => defaultState)
    );

    return {
        fractal: reducers$,
    };
}

function view(state$) {
    return state$.map(state => {
        const { profile, subcategories, gamification } = state;
        const { resolving, user, posts, comments } = profile;

        // Loading state.
        if (user === false || resolving) {
            return main('.profile.flex-auto', div('.pv2', div('.loading')));
        }

        const level = user.gaming.level || 0;
        const lvl = gamification.rules.find(rule => rule.level == level) || {};
        const starts = lvl.swords_start || 0;
        const ends = lvl.swords_end || 0;
        const gap = ends - starts;
        const rest = ends - user.gaming.swords;
        const gapPercent = Math.round(rest / gap * 10000) / 100;

        return main('.profile.flex-auto', [
            section('.fade-in.tc', [
                figure(
                    '.avatar.avatar-xl',
                    { style: { borderRadius: '100%' } },
                    img({
                        attrs: {
                            src: user.image,
                            alt: `Perfil de ${user.username}`,
                        },
                    })
                ),
                h1('.ma0.mv2', `${user.username}`),
                p(user.description),
                div('.mw5.mb3.center', [
                    i('.icon-crown.gold.f5'),
                    span('.db.mb2.f5', [
                        span('.b', number(user.gaming.swords)),
                        ' / reputación',
                    ]),
                    div('.flex.items-center.mb2', [
                        span('.ph2', String(level)),
                        div(
                            '.bar.bar-sm',
                            div('.bar-item', {
                                attrs: { role: 'progressbar' },
                                style: {
                                    width: `${gapPercent}%`,
                                },
                            })
                        ),
                        span('.ph2', String(level + 1)),
                    ]),
                    span('.db.mb2', `${number(rest)} para el siguiente nivel`),
                ]),
                div('.flex.pb4.boxed', [
                    span('.flex-auto', [
                        span('.icon-location.mr2'),
                        user.profile.country || 'Desconocido',
                    ]),
                    span('.flex-auto', [
                        span('.icon-calendar.mr2'),
                        `Miembro hace ${ago(user.created_at)}`,
                    ]),
                    span('.flex-auto', [
                        span('.icon-doc.mr2'),
                        span('.b', posts === false ? 0 : number(posts.count)),
                        ' publicaciones',
                    ]),
                    span('.flex-auto', [
                        span('.icon-chat.mr2'),
                        span(
                            '.b',
                            comments === false ? 0 : number(comments.count)
                        ),
                        ' comentarios',
                    ]),
                ]),
                div('.flex.mt4', [
                    div('.flex-auto', { style: { width: '0' } }, [
                        h3('.f5.mb3', 'Ultimas publicaciones'),
                        div('.tl.boxed', { style: { padding: '0' } }, [
                            posts === false ? div('.loading') : null,
                            posts !== false
                                ? div(
                                      posts.feed.map(post =>
                                          postView({ post, subcategories })
                                      )
                                  )
                                : null,
                        ]),
                    ]),
                    div('.ph3'),
                    div('.flex-auto', { style: { width: '0' } }, [
                        h3('.f5.mb3', 'Ultimos comentarios'),
                        div('.tl.boxed', { style: { padding: '0' } }, [
                            comments === false ? div('.loading') : null,
                            comments !== false
                                ? div(
                                      comments.activity.map(comment =>
                                          commentView({ comment })
                                      )
                                  )
                                : null,
                        ]),
                    ]),
                ]),
            ]),
        ]);
    });
}

function commentView({ comment }) {
    const href = `/p/${comment.slug}/${comment.related_id}`;

    return article('.comment', [
        div('.flex.items-center', [
            div(
                '.flex-auto',
                a(
                    '.category',
                    {
                        attrs: {
                            href,
                        },
                    },
                    comment.title
                )
            ),
        ]),
        div([
            p('.truncate.lh-copy', comment.content),
            div(span('.ago', 'Comentado hace ' + ago(comment.created_at))),
        ]),
    ]);
}

function postView({ post, subcategories }) {
    const href = `/p/${post.slug}/${post.id}`;
    const category = subcategories.id[post.category] || false;

    return article('.post', [
        div('.flex.items-center', [
            div(
                '.flex-auto',
                category != false
                    ? a(
                          '.category',
                          {
                              attrs: {
                                  href: `/c/${category.slug}`,
                              },
                          },
                          category.name
                      )
                    : a('.category', span('.loading'))
            ),
            post.pinned ? span('.icon-pin.pinned-post') : null,
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
                div(span('.ago', 'Publicado hace ' + ago(post.created_at))),
            ]),
            div(
                '.tc',
                {
                    style: {
                        minWidth: '50px',
                        flexShrink: 0,
                    },
                },
                [span('.icon-chat-alt'), span('.pl2.b', post.comments.count)]
            ),
        ]),
    ]);
}
