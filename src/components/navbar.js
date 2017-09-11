import {run} from '@cycle/run'
import {div, section, label, header, input, img, a, ul, li, h1, makeDOMDriver} from '@cycle/dom';
import xs from 'xstream';

export function Navbar({DOM, HTTP, storage}) {
	const token$ = storage.local.getItem('id_token')
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
	const tokenState$ = token$.filter(token => token !== false)
		.map(token => state => {
			return {...state, token}
		});

	const me$ = HTTP.select('me')
		.flatten()
		.map(res => state => {
			return {...state, user: res.body};
		});

	/**
     * Merge all reducers to compute state.
     *
     * @type {*}
     */
    const state$ = xs.merge(me$, tokenState$)
        .fold((state, action) => action(state), {user: false, token: false})
        .startWith({user: false, token: false});

    const vdom$ = state$.map(state =>
        header('.navbar', [
            section('.navbar-section', [
            	a({attrs: {href: '/'}}, img('.logo', {attrs: {src: '/images/header-logo.svg', alt: 'Buldar.com'}}))
            ]), 
            section('.navbar-section.hide-sm', {style: {flex: '1 1 auto'}}, [
            	a('.btn.btn-link', {attrs: {href: '/chat', target: '_blank'}}, 'Chat'),
            	div('.dropdown', [
            		a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Conoce Buldar'),
            		ul('.menu', [
            			li('.menu-item', a('.link', {attrs: {href: '/reglamento'}}, 'Reglamento')),
            			li('.menu-item', a('.link', {attrs: {href: '/terminos-y-condiciones'}}, 'Terminos y cond.')),
            			li('.menu-item', a('.link', {attrs: {href: '/about'}}, 'Acerca de'))
            		])
            	]),
            	div('.dropdown', [
            		a('.btn.btn-link.dropdown-toggle', {attrs: {tabindex: 0}}, 'Enlaces SpartanGeek'),
            		ul('.menu', [
            			li('.menu-item', a('.link', {attrs: {href: '/reglamento'}}, 'Canal de Youtube')),
            			li('.menu-item', a('.link', {attrs: {href: '/terminos-y-condiciones'}}, 'Pedir PC Spartana')),
            			li('.menu-item', a('.link', {attrs: {href: '/about'}}, 'Workstations')),
            			li('.divider'),
            			li('.menu-item', a('.link', {attrs: {href: 'https://spartangeek.com'}}, 'SpartanGeek.com'))
            		])
            	]),
            	a('.btn.btn-link', JSON.stringify(state))
            ]),
        ])
    );

    return {
        DOM: vdom$,
        HTTP: requestUser$
    };
}