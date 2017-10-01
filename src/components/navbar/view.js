import {figure, div, section, label, header, input, img, a, ul, li, h1, h, makeDOMDriver} from '@cycle/dom';
import xs from 'xstream';
import timeago from 'timeago.js';
import timeagoES from 'timeago.js/locales/es';

timeago.register('es', timeagoES);
const ago = timeago(null, 'es');

export function view(effects, account) {
    return xs.combine(effects.state$, account.DOM).map(([state, accountVNode]) => {
        const {user, modal, resolving} = state;
        const image = user.image || '';
        

        return h('main', [
            accountVNode,
            h('header.navbar', [
                h('section.navbar-section', [
                    h('a', img('.logo.ng-link', {dataset: {href: '/'}, attrs: {src: '/images/header-logo.svg', alt: 'Buldar.com'}}))
                ]), 
                h('section.navbar-section.show-sm.tr', [
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0}}, [
                                figure('.avatar', {dataset: {initial: user.username.substr(0, 1)}}, [
                                    image.length > 0 ? 
                                        img({attrs: {alt: `Avatar de ${user.username}`, src: image}}) 
                                    : div('.dn')
                                ]),
                            ]),
                            h('ul.menu.tl', [
                                h('li.menu-item', h('a.link.ng-link', {dataset: {href: `/u/${user.username}/${user.id}`}}, 'Ver mi perfil')),
                                h('li.menu-item', h('a.link.ng-link', {dataset: {href: '/medallas'}}, 'Medallas')),
                                h('li.menu-item', h('a.link.ng-link', {dataset: {href: '/top-ranking'}}, 'Ranking de usuarios')),
                                h('li.divider'),
                                h('li.menu-item.cf', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.swords)),
                                    h('a', 'Reputación')
                                ]),
                                h('li.menu-item.cf', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.tribute)),
                                    h('a', 'Tributo')
                                ]),
                                h('li.divider'),
                                h('li.menu-item', h('a.pointer', {attrs: {id: 'logout'}}, 'Salir de mi cuenta'))
                            ])
                        ]) 
                    : div('.dn'),
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0, id: 'notifications'}}, [
                                h('span.badge', {attrs: {id: 'notifications'}, class: {none: user.notifications === 0}, dataset: {badge: user.notifications}}, h('i.icon.icon-message'))
                            ]),
                            h('ul.menu.notifications.tl', [
                                resolving.notifications ? 
                                    h('div.loading.mv2') : 
                                    h('div.fade-in', state.notifications.length === 0 ? 
                                        h('p.tc.mv2', 'No tienes ninguna notificación aún.')
                                        : state.notifications.map(n => {
                                            return h('li.menu-item', h('a.pointer.ng-link', {dataset: {href: n.target}}, [
                                                h('span.db.clean-styles', n.title),
                                                h('span.db.gray', n.subtitle),
                                                h('span.db.mid-gray.b', ago.format(n.createdAt)),
                                            ]));
                                        })
                                    )
                            ])
                        ]) 
                    : div('.dn'),
                    h('div.dropdown.dropdown-right', [
                        h('a.dropdown-toggle.btn.btn-link', {attrs: {tabindex: 0}}, h('i.icon.icon-menu')),
                        h('ul.menu.tl', [
                            h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/chat'}}, 'Chat')),
                            h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/reglamento'}}, 'Reglamento')),
                            h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/terminos-y-condiciones'}}, 'Terminos y cond.')),
                            h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/about'}}, 'Acerca de')),
                        ].concat(user !== false ? [] : [
                            li('.divider'),
                            h('li.menu-item', h('a.link.modal-link', {dataset: {modal: 'account', tab: 'login'}}, 'Iniciar sesión')),
                            h('li.menu-item', h('a.link.modal-link', {dataset: {modal: 'account', tab: 'login'}}, 'Únete')),
                        ]).concat([
                            li('.divider'),
                            li('.menu-item', a('.link', {attrs: {href: 'https://www.youtube.com/user/SpartanGeekTV'}}, 'Canal de Youtube')),
                            li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'Pedir PC Spartana')),
                            li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com/workstations'}}, 'Workstations')),
                            li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'SpartanGeek.com'))
                        ]))
                    ]),
                ]),
                h('section.navbar-section.hide-sm', {style: {flex: '1 1 auto'}}, [
                    a('.btn.btn-link.ng-link', {dataset: {href: '/chat'}}, 'Chat'),
                    div('.dropdown', [
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
                    ]),
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'account', tab: 'login'}, class: {dn: user !== false}}, 'Iniciar sesión'),
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'account', tab: 'signup'}, class: {dn: user !== false}}, 'Únete'),
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0, id: 'notifications'}}, [
                                h('span.badge', {class: {none: user.notifications === 0}, dataset: {badge: user.notifications}}, 'Notificaciones')
                            ]),
                            h('ul.menu.notifications.tl', [
                                resolving.notifications ? 
                                    h('div.loading.mv2') : 
                                    h('div.fade-in', state.notifications.length === 0 ? 
                                        h('p.tc.mv2', 'No tienes ninguna notificación aún.')
                                        : state.notifications.map(n => {
                                            return h('li.menu-item', h('a.pointer.ng-link', {dataset: {href: n.target}}, [
                                                h('span.db.clean-styles', n.title),
                                                h('span.db.gray', n.subtitle),
                                                h('span.db.mid-gray.b', ago.format(n.createdAt)),
                                            ]));
                                        })
                                    )
                            ])
                        ]) 
                    : div('.dn'),
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0}}, [
                                figure('.avatar', {dataset: {initial: user.username.substr(0, 1)}}, [
                                    image.length > 0 ? 
                                        img({attrs: {alt: `Avatar de ${user.username}`, src: image}}) 
                                    : div('.dn')
                                ]),
                                h('span.white.ml1', [user.username, h('i.icon.icon-caret')])
                            ]),
                            h('ul.menu', [
                                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: `/u/${user.username}/${user.id}`}}, 'Ver mi perfil')),
                                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/medallas'}}, 'Medallas')),
                                h('li.menu-item', h('a.link.ng-link.pointer', {dataset: {href: '/top-ranking'}}, 'Ranking de usuarios')),
                                h('li.divider'),
                                h('li.menu-item.cf', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.swords)),
                                    h('a.pointer', 'Reputación')
                                ]),
                                h('li.menu-item.cf', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.tribute)),
                                    h('a.pointer', 'Tributo')
                                ]),
                                h('li.divider'),
                                h('li.menu-item', h('a.pointer', {attrs: {id: 'logout'}}, 'Salir de mi cuenta'))
                            ])
                        ]) 
                    : div('.dn')
                ]),
                state.resolving.user === true ?
                    section('.navbar-section', [
                        div('.loading')
                    ]) 
                : null,
            ])
        ]);
    });
}