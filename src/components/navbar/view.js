import {figure, div, section, label, header, input, img, a, ul, li, h1, h, makeDOMDriver} from '@cycle/dom';
import xs from 'xstream';

export function view(effects, account) {
    return xs.combine(effects.state$, account.DOM).map(([state, accountVNode]) => {
        const {user, modal} = state;

        return h('main', [
            accountVNode,
            h('header.navbar', [
                h('section.navbar-section', [
                    a({attrs: {href: '/'}}, img('.logo', {attrs: {src: '/images/header-logo.svg', alt: 'Buldar.com'}}))
                ]), 
                h('section.navbar-section.hide-sm', {style: {flex: '1 1 auto'}}, [
                    a('.btn.btn-link', {attrs: {href: '/chat', target: '_blank'}}, 'Chat'),
                    div('.dropdown', [
                        a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Conoce Buldar'),
                        h('ul.menu', [
                            h('li.menu-item', a('.link', {attrs: {href: '/reglamento'}}, 'Reglamento')),
                            h('li.menu-item', a('.link', {attrs: {href: '/terminos-y-condiciones'}}, 'Terminos y cond.')),
                            h('li.menu-item', a('.link', {attrs: {href: '/about'}}, 'Acerca de'))
                        ])
                    ]),
                    div('.dropdown', [
                        a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Enlaces SpartanGeek'),
                        h('ul.menu', [
                            li('.menu-item', a('.link', {attrs: {href: '/reglamento'}}, 'Canal de Youtube')),
                            li('.menu-item', a('.link', {attrs: {href: '/terminos-y-condiciones'}}, 'Pedir PC Spartana')),
                            li('.menu-item', a('.link', {attrs: {href: '/about'}}, 'Workstations')),
                            li('.divider'),
                            li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'SpartanGeek.com'))
                        ])
                    ]),
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'account', tab: 'login'}, class: {dn: user !== false}}, 'Iniciar sesión'),
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'account', tab: 'signup'}, class: {dn: user !== false}}, 'Únete'),
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0}}, [
                                h('span.badge', 'Notificaciones')
                            ]),
                            h('ul.menu', [
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Ver mi perfil')),
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Medallas')),
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Ranking de usuarios')),
                                h('li.divider'),
                                h('li.menu-item', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.swords)),
                                    h('span', 'Reputación')
                                ]),
                                h('li.menu-item', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.tribute)),
                                    h('span', 'Tributo')
                                ]),
                                h('li.divider'),
                                h('li.menu-item', h('a.pointer', {attrs: {href: '/salir'}}, 'Salir de mi cuenta'))
                            ])
                        ]) 
                    : div('.dn'),
                    user !== false ? 
                        div('.dropdown.dropdown-right', [
                            a('.dropdown-toggle.pointer.link', {attrs: {tabindex: 0}}, [
                                figure('.avatar', {dataset: {initial: user.username.substr(0, 1)}}, [
                                    user.image.length > 0 ? 
                                        img({attrs: {alt: `Avatar de ${user.username}`, src: user.image}}) 
                                    : div('.dn')
                                ]),
                                h('span.white.ml1', [user.username, h('i.icon.icon-caret')])
                            ]),
                            h('ul.menu', [
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Ver mi perfil')),
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Medallas')),
                                h('li.menu-item', h('a.link', {attrs: {href: '/'}}, 'Ranking de usuarios')),
                                h('li.divider'),
                                h('li.menu-item', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.swords)),
                                    h('span', 'Reputación')
                                ]),
                                h('li.menu-item', [
                                    h('div.menu-badge', h('label.label.label-primary', user.gaming.tribute)),
                                    h('span', 'Tributo')
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