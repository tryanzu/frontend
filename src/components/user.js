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
import { ago } from '../i18n';

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
        const { profile, subcategories } = state;
        const { resolving, user, posts, comments } = profile;

        // Loading state.
        if (user === false || resolving) {
            return main('.profile.flex-auto', div('.pv2', div('.loading')));
        }

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
                    span('.db.mb2.f5', [span('.b', '5,420'), ' / reputación']),
                    div('.flex.items-center.mb2', [
                        span('.ph2', '11'),
                        div(
                            '.bar.bar-sm',
                            div('.bar-item', {
                                attrs: { role: 'progressbar' },
                                style: { width: '25%' },
                            })
                        ),
                        span('.ph2', '12'),
                    ]),
                    span('.db.mb2', '520 para el siguiente nivel'),
                ]),
                div('.flex.pb4.boxed', [
                    span('.flex-auto', [
                        span('.icon-location.mr2'),
                        'México D.F.',
                    ]),
                    span('.flex-auto', [
                        span('.icon-calendar.mr2'),
                        'Miembro desde hace 1 año',
                    ]),
                    span('.flex-auto', [
                        span('.icon-doc.mr2'),
                        span('.b', '8,910'),
                        ' publicaciones',
                    ]),
                    span('.flex-auto', [
                        span('.icon-chat.mr2'),
                        span('.b', '30,591'),
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
