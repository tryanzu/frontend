import xs from 'xstream';
import {
    figure,
    div,
    section,
    header,
    img,
    a,
    li,
    h,
    span,
    p,
    main,
    nav,
} from '@cycle/dom';
import { adminTools } from '../../acl';
import { ago } from '../../i18n';

export function view(effects, fractal) {
    return xs.combine(effects.state$, fractal.state$).map(([state, fstate]) => {
        const { resolving, connectedCount } = state;
        const _user = fstate.user;
        const { user } = _user;
        const image = user.image || '';
        const site = fstate.site;

        return main([
            adminTools({ user })
                ? header('.navbar-tools.fade-in', [
                      nav([
                          div('.flex-auto', a('Gestión de Anzu')),
                          span('.badge', 'Reportes'),
                          a('.ml3', 'Gestión de usuarios'),
                          a(
                              '.ml3.modal-link',
                              { dataset: { modal: 'config' } },
                              'Configuración'
                          ),
                      ]),
                  ])
                : null,
            header('.navbar', [
                logoSection(),
                mobileSection({
                    user,
                    resolving,
                    connectedCount,
                    image,
                    state,
                }),
                desktopVersion({
                    user,
                    resolving,
                    connectedCount,
                    image,
                    state,
                    site,
                }),
                _user.resolving === true ? div('.loading') : null,
            ]),
        ]);
    });
}

function logoSection() {
    return section('.navbar-section', [
        a(
            { attrs: { href: '/' } },
            img('.logo.ng-link.w3', {
                dataset: { href: '/' },
                attrs: { src: '/images/anzu.svg', alt: 'Buldar.com' },
            })
        ),
    ]);
}

function mobileSection({ user, resolving, connectedCount, image, state }) {
    return h('section.navbar-section.show-sm.tr', [
        user !== false
            ? div('.dropdown.dropdown-right', [
                  a(
                      '.dropdown-toggle.pointer.link',
                      { attrs: { tabindex: 0 } },
                      [
                          figure(
                              '.avatar',
                              {
                                  dataset: {
                                      initial: user.username.substr(0, 1),
                                  },
                              },
                              [
                                  image.length > 0
                                      ? img({
                                            attrs: {
                                                alt: `Avatar de ${
                                                    user.username
                                                }`,
                                                src: image,
                                            },
                                        })
                                      : div('.dn'),
                              ]
                          ),
                      ]
                  ),
                  h('ul.menu.tl', [
                      h(
                          'li.menu-item',
                          h(
                              'a.link.ng-link',
                              {
                                  dataset: {
                                      href: `/u/${user.username}/${user.id}`,
                                  },
                              },
                              'Ver mi perfil'
                          )
                      ),
                      h(
                          'li.menu-item',
                          h(
                              'a.link.ng-link',
                              { dataset: { href: '/medallas' } },
                              'Medallas'
                          )
                      ),
                      h(
                          'li.menu-item',
                          h(
                              'a.link.ng-link',
                              { dataset: { href: '/top-ranking' } },
                              'Ranking de usuarios'
                          )
                      ),
                      h('li.divider'),
                      h('li.menu-item.cf', [
                          h(
                              'div.menu-badge',
                              h('label.label.label-primary', user.gaming.swords)
                          ),
                          h('a', 'Reputación'),
                      ]),
                      h('li.menu-item.cf', [
                          h(
                              'div.menu-badge',
                              h(
                                  'label.label.label-primary',
                                  user.gaming.tribute
                              )
                          ),
                          h('a', 'Tributo'),
                      ]),
                      h('li.divider'),
                      h(
                          'li.menu-item',
                          h(
                              'a.pointer',
                              { attrs: { id: 'logout' } },
                              'Salir de mi cuenta'
                          )
                      ),
                  ]),
              ])
            : div('.dn'),
        user !== false
            ? div('.dropdown.dropdown-right', [
                  a(
                      '.dropdown-toggle.pointer.link',
                      { attrs: { tabindex: 0, id: 'notifications' } },
                      [
                          h(
                              'span.badge',
                              {
                                  attrs: { id: 'notifications' },
                                  class: { none: user.notifications === 0 },
                                  dataset: { badge: user.notifications },
                              },
                              h('i.icon.icon-message')
                          ),
                      ]
                  ),
                  h('ul.menu.notifications.tl', [
                      resolving.notifications
                          ? h('div.loading.mv2')
                          : h(
                                'div.fade-in',
                                state.notifications.length === 0
                                    ? h(
                                          'p.tc.mv2',
                                          'No tienes ninguna notificación aún.'
                                      )
                                    : state.notifications.map(n => {
                                          return h(
                                              'li.menu-item',
                                              h(
                                                  'a.pointer.ng-link',
                                                  {
                                                      dataset: {
                                                          href: n.target,
                                                      },
                                                  },
                                                  [
                                                      h(
                                                          'span.db.clean-styles',
                                                          n.title
                                                      ),
                                                      h(
                                                          'span.db.gray',
                                                          n.subtitle
                                                      ),
                                                      h(
                                                          'span.db.mid-gray',
                                                          ago(n.createdAt)
                                                      ),
                                                  ]
                                              )
                                          );
                                      })
                            ),
                  ]),
              ])
            : div('.dn'),
        h('div.dropdown.dropdown-right', [
            h(
                'a.dropdown-toggle.btn.btn-link',
                { attrs: { tabindex: 0 } },
                h('i.icon.icon-menu')
            ),
            h(
                'ul.menu.tl',
                [
                    h(
                        'li.menu-item',
                        h(
                            'a.link.ng-link.pointer',
                            { dataset: { href: '/chat' } },
                            [
                                'Chat ',
                                span(
                                    '.bg-green.ph1.br1',
                                    String(connectedCount)
                                ),
                            ]
                        )
                    ),
                    h(
                        'li.menu-item',
                        h(
                            'a.link.ng-link.pointer',
                            { dataset: { href: '/reglamento' } },
                            'Reglamento'
                        )
                    ),
                    h(
                        'li.menu-item',
                        h(
                            'a.link.ng-link.pointer',
                            { dataset: { href: '/terminos-y-condiciones' } },
                            'Terminos y cond.'
                        )
                    ),
                    h(
                        'li.menu-item',
                        h(
                            'a.link.ng-link.pointer',
                            { dataset: { href: '/about' } },
                            'Acerca de'
                        )
                    ),
                ]
                    .concat(
                        user !== false
                            ? []
                            : [
                                  li('.divider'),
                                  h(
                                      'li.menu-item',
                                      h(
                                          'a.link.modal-link',
                                          {
                                              dataset: {
                                                  modal: 'account',
                                                  tab: 'login',
                                              },
                                          },
                                          'Iniciar sesión'
                                      )
                                  ),
                                  h(
                                      'li.menu-item',
                                      h(
                                          'a.link.modal-link',
                                          {
                                              dataset: {
                                                  modal: 'account',
                                                  tab: 'login',
                                              },
                                          },
                                          'Únete'
                                      )
                                  ),
                              ]
                    )
                    .concat([
                        li('.divider'),
                        li(
                            '.menu-item',
                            a(
                                '.link',
                                {
                                    attrs: {
                                        href:
                                            'https://www.youtube.com/user/SpartanGeekTV',
                                    },
                                },
                                'Canal de Youtube'
                            )
                        ),
                        li(
                            '.menu-item',
                            a(
                                '.link',
                                { attrs: { href: 'https://spartangeek.com' } },
                                'Pedir PC Spartana'
                            )
                        ),
                        li(
                            '.menu-item',
                            a(
                                '.link',
                                {
                                    attrs: {
                                        href:
                                            'https://spartangeek.com/workstations',
                                    },
                                },
                                'Workstations'
                            )
                        ),
                        li(
                            '.menu-item',
                            a(
                                '.link',
                                { attrs: { href: 'https://spartangeek.com' } },
                                'SpartanGeek.com'
                            )
                        ),
                    ])
            ),
        ]),
    ]);
}

function desktopVersion({ user, resolving, image, state, site }) {
    const nav = site.nav || [];

    return h(
        'section.navbar-section.hide-sm',
        nav
            .map(link =>
                a('.btn.btn-link', { attrs: { href: link.href } }, link.name)
            )
            .concat([
                //a('.btn.btn-link.ng-link', {dataset: {href: '/chat'}}, ['Chat ', span('.bg-green.ph1.br1', String(connectedCount))]),
                /*div('.dropdown', [
            a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Conoce Buldar'),
            h('ul.menu', [
                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/reglamento'}}, 'Reglamento')),
                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/terminos-y-condiciones'}}, 'Terminos y cond.')),
                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/about'}}, 'Acerca de'))
            ])
        ]),
        div('.dropdown', [
            a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Enlaces SpartanGeek'),
            h('ul.menu', [
                li('.menu-item', a('.link', {attrs: {href: 'https://www.youtube.com/user/SpartanGeekTV'}}, 'Canal de Youtube')),
                li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'Pedir PC Spartana')),
                li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com/workstations'}}, 'Workstations')),
                li('.divider'),
                li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'SpartanGeek.com'))
            ])
        ]),*/
                h(
                    'a.link.pointer.btn.btn-link.modal-link',
                    {
                        dataset: { modal: 'account', tab: 'login' },
                        class: { dn: user !== false },
                    },
                    'Iniciar sesión'
                ),
                h(
                    'a.link.pointer.btn.btn-link.modal-link',
                    {
                        dataset: { modal: 'account', tab: 'signup' },
                        class: { dn: user !== false },
                    },
                    'Únete'
                ),
                user !== false
                    ? div('.dropdown.dropdown-right', [
                          a(
                              '.dropdown-toggle.pointer.link',
                              { attrs: { tabindex: 0, id: 'notifications' } },
                              [
                                  h(
                                      'span.badge',
                                      {
                                          class: {
                                              none: user.notifications === 0,
                                          },
                                          dataset: {
                                              badge: user.notifications,
                                          },
                                      },
                                      'Notificaciones'
                                  ),
                              ]
                          ),
                          h('ul.menu.notifications.tl', [
                              resolving.notifications
                                  ? h('div.loading.mv2')
                                  : h(
                                        'div.fade-in',
                                        state.notifications.length === 0
                                            ? h(
                                                  'p.tc.mv2',
                                                  'No tienes ninguna notificación aún.'
                                              )
                                            : state.notifications.map(n => {
                                                  return h(
                                                      'li.menu-item',
                                                      h(
                                                          'a.pointer.ng-link',
                                                          {
                                                              dataset: {
                                                                  href:
                                                                      n.target,
                                                              },
                                                          },
                                                          [
                                                              h(
                                                                  'span.db.clean-styles',
                                                                  n.title
                                                              ),
                                                              h(
                                                                  'span.db.gray',
                                                                  n.subtitle
                                                              ),
                                                              h(
                                                                  'span.db.mid-gray.b',
                                                                  ago(
                                                                      n.createdAt
                                                                  )
                                                              ),
                                                          ]
                                                      )
                                                  );
                                              })
                                    ),
                          ]),
                      ])
                    : div('.dn'),
                user !== false
                    ? a('.link.pointer.btn.btn-link', [
                          h('i.icon-crown.gold'),
                          h('span.b', user.gaming.swords),
                      ])
                    : null,
                user !== false
                    ? div('.dropdown.dropdown-right', [
                          h(
                              'span.dropdown-toggle.pointer.link',
                              { attrs: { tabindex: 0, title: user.username } },
                              [
                                  figure(
                                      '.avatar',
                                      {
                                          dataset: {
                                              initial: user.username.substr(
                                                  0,
                                                  1
                                              ),
                                          },
                                      },
                                      [
                                          image.length > 0
                                              ? img({
                                                    attrs: {
                                                        alt: `Avatar de ${
                                                            user.username
                                                        }`,
                                                        src: image,
                                                    },
                                                })
                                              : div('.dn'),
                                      ]
                                  ),
                              ]
                          ),
                          h('ul.menu', [
                              h(
                                  'li.menu-item',
                                  h(
                                      'a.link.ng-link.pointer',
                                      {
                                          dataset: {
                                              href: `/u/${user.username}/${
                                                  user.id
                                              }`,
                                          },
                                      },
                                      'Ver mi perfil'
                                  )
                              ),
                              h(
                                  'li.menu-item',
                                  h(
                                      'a.link.ng-link.pointer',
                                      { dataset: { href: '/medallas' } },
                                      'Medallas'
                                  )
                              ),
                              h(
                                  'li.menu-item',
                                  h(
                                      'a.link.ng-link.pointer',
                                      { dataset: { href: '/top-ranking' } },
                                      'Ranking de usuarios'
                                  )
                              ),
                              h('li.divider'),
                              h('li.menu-item.cf', [
                                  h(
                                      'div.menu-badge',
                                      h(
                                          'label.label.label-primary',
                                          user.gaming.swords
                                      )
                                  ),
                                  h('a.pointer', 'Reputación'),
                              ]),
                              /*h('li.menu-item.cf', [
                                  h(
                                      'div.menu-badge',
                                      h(
                                          'label.label.label-primary',
                                          user.gaming.tribute
                                      )
                                  ),
                                  h('a.pointer', 'Tributo'),
                              ]),*/
                              h('li.divider'),
                              h(
                                  'li.menu-item',
                                  h(
                                      'a.pointer',
                                      { attrs: { id: 'logout' } },
                                      'Salir de mi cuenta'
                                  )
                              ),
                          ]),
                          user.validated == false
                              ? div(
                                    '.absolute.top-2.z-1.w5.right-0.toast.shadow',
                                    [
                                        span('.b', 'Acción necesaria'),
                                        p(
                                            '.mb1',
                                            'Enviamos a tu correo las instrucciones necesarias para validar tu cuenta. Obtén acceso completo al sitio y únete a la conversación.'
                                        ),
                                        a('Reenviar correo electrónico'),
                                    ]
                                )
                              : null,
                      ])
                    : div('.dn'),
            ])
    );
}
