import {h} from '@cycle/dom';
import xs from 'xstream';
import isolate from '@cycle/isolate';
import {LoginModal} from './login';
import {SignupModal} from './signup';

export function AccountModal({DOM, HTTP, props}) {
	/**
	 * Child components declarations.
	 */
	const loginModal = isolate(LoginModal, 'login');
	const signupModal = isolate(SignupModal, 'signup');

	const login = loginModal({DOM, HTTP});
	const signup = signupModal({DOM, HTTP});

	/**
	 * Intent
	 */
	const opened$ = props.openLink$.filter(ev => ev.modal == 'account')
        .fold(acc => !acc, false);

    const openTab$ = props.openLink$.filter(ev => (ev.modal == 'account' && 'tab' in ev.data))
    	.map(ev => ev.data.tab);

    /**
     * Model computation.
     */
    const tabLink$ = DOM.select('li.tab-item a').events('click')
    	.map(event => event.target.dataset.tab);

    const tab$ = xs.merge(openTab$, tabLink$).startWith('login');
    const active$ = xs.merge(opened$, login.token.mapTo(false));

    /**
     * View computation.
     */
    const vdom$ = xs.combine(active$, tab$, login.DOM, signup.DOM).map(([active, tab, loginVNode, signupVNode]) => {
    	if (!active) {
    		return null;
    	}

    	return h('div.modal.active', [
            h('div.modal-overlay.modal-link', {dataset: {modal: 'account'}}),
            h('div.modal-container', {style: {width: '360px'}}, [ 
                h('div.modal-body', {style: {paddingTop: '0', maxHeight: '85vh'}}, [
                    h('div.bg-near-white.tc.pv3', {style: {margin: '0 -0.8rem'}}, [
                        h('img.w2', {attrs: {src: '/images/seal.svg', alt: 'Únete a la conversación'}}),
                    ]),
                    h('ul.tab.tab-block', {style: {margin: '0 -0.8rem 1.2rem'}}, [
                        h('li.tab-item.pointer', {class: {active: tab == 'login'}}, h('a', {dataset: {tab: 'login'}}, 'Iniciar sesión')),
                        h('li.tab-item.pointer', {class: {active: tab == 'signup'}}, h('a', {dataset: {tab: 'signup'}}, 'Crear cuenta')),
                    ]),
                    tab === 'login' ? loginVNode : signupVNode,
                ])
            ]),
        ]);
    });

    /**
     * Child components stream merging
     */
    const http$ = xs.merge(login.HTTP, signup.HTTP);
    const token$ = xs.merge(login.token, signup.token);

    return {
        DOM: vdom$,
        HTTP: http$,
        token: token$
    };
};