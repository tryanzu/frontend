import {run} from '@cycle/run';
import isolate from '@cycle/isolate';
import {figure, div, section, label, header, input, img, a, ul, li, h1, h, makeDOMDriver} from '@cycle/dom';
import xs from 'xstream';
import {LoginModal} from './modal/login';

const DEFAULT_STATE = {
    user: false,
    token: false,
    resolving: {
        user: false
    },
    modal: {
        signin: false
    }
};

function intent(dom, http, storage) {

    /**
     * DOM intents including:
     * - Signin & signup buttons.
     */
    const modalLink$ = dom.select('.modal-link').events('click')
        .map(event => ({modal: event.target.dataset.modal}));

    return {modalLink$};
};

export function Navbar({DOM, HTTP, storage}) {
    const actions = intent(DOM, HTTP, storage);
	const token$ = storage.local.getItem('id_token')
        .filter(token => token !== null)
		.startWith(false);

	// Use token stream to send out user/me request.
	const requestUser$ = token$.filter(token => token !== false)
		.map(token => ({
				url: 'http://localhost:3200/v1/user/my', 
				category: 'me',
				headers: {
					Authorization: `Bearer ${token}`
				}
			})
		);
    
	/**
	 * Reducers.
	 * Streams mapped to reducer functions.
	 */
    const modalR$ = actions.modalLink$.map(ev => state => {
        return {
            ...state,
            modal: {
                ...state.modal,
                [ev.modal]: !state.modal[ev.modal]
            }
        };
    });

	const tokenR$ = token$.map(token => state => {
		return {
            ...state, 
            token,
            resolving: {
                ...state.resolving,
                user: token !== false
            }
        };
	});

	const userR$ = HTTP.select('me')
		.flatten()
		.map(res => state => {
			return {
                ...state, 
                resolving: {
                    ...state.resolving,
                    user: false
                },
                user: res.body
            };
		});

	/**
     * Merge all reducers to compute state.
     *
     * @type {*}
     */
    const state$ = xs.merge(userR$, tokenR$, modalR$)
        .fold((state, action) => action(state), DEFAULT_STATE);

    // Compute active login modal state
    const loginModal$ = LoginModal({DOM, HTTP, props: actions.modalLink$});

    // Compute child & parent http side effects.
    const http$ = xs.merge(requestUser$, loginModal$.HTTP);
    const storage$ = loginModal$.token.map(token => ({key: 'id_token', value: token}));

    const vdom$ = xs.combine(state$, loginModal$.DOM).map(([state, loginVNode]) => {
        const {user, modal} = state;

        return h('main', [
            loginVNode,
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
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'signin'}, class: {dn: user !== false}}, 'Iniciar sesión'),
                    h('a.link.pointer.btn.btn-link.modal-link', {dataset: {modal: 'signup'}, class: {dn: user !== false}}, 'Únete'),
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
                                h('li.menu-item', h('a.pointer', {attrs: {href: '/salir'}}, 'Salir de mi cuenta'))
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

    return {
        DOM: vdom$,
        HTTP: http$,
        storage: storage$
    };
}