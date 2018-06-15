import xs from 'xstream';
import { main, section, h1, div, figure, img, p, span } from '@cycle/dom';

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
        const { profile } = state;
        const { resolving, user } = profile;

        return main('.profile.flex-auto', [
            user !== false && resolving === false
                ? section('.fade-in', [
                      div('.flex.items-center', [
                          div([
                              div('.pa3.bg-near-white.ba.b--light-gray.br1', [
                                  figure(
                                      '.avatar.avatar-xl',
                                      img({
                                          attrs: {
                                              src: user.image,
                                              alt: `Perfil de ${user.username}`,
                                          },
                                      })
                                  ),
                              ]),
                          ]),
                          div('.flex-auto.pl3.self-start', [
                              h1('.ma0.mb2', `${user.username}`),
                              p(user.description),
                          ]),
                          div('.flex-shrink-0', [
                              span('.db.mb2', [
                                  span('.icon-location.mr2'),
                                  'México D.F.',
                              ]),
                              span('.db.mb2', [
                                  span('.icon-calendar.mr2'),
                                  'Miembro desde hace 1 año',
                              ]),
                              span('.db.mb2', [
                                  span('.icon-doc.mr2'),
                                  '8,910 publicaciones',
                              ]),
                              span('.db.mb2', [
                                  span('.icon-chat.mr2'),
                                  '30,591 comentarios',
                              ]),
                          ]),
                      ]),
                  ])
                : div('.pv2', div('.loading')),
        ]);
    });
}
