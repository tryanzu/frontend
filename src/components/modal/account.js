import {h} from '@cycle/dom';
import xs from 'xstream';
import isolate from '@cycle/isolate';
import {LoginModal} from './login';
import {SignupModal} from './signup';

export function AccountModal({ DOM, HTTP }) {
    /**
	 * Child components declarations.
	 */
	const loginModal = isolate(LoginModal, 'login')
	const signupModal = isolate(SignupModal, 'signup')

	const login = loginModal({DOM, HTTP})
    const signup = signupModal({DOM, HTTP})

    /**
     * Read effects including:
     * - DOM: tab change, ...
     */
    const tabLink$ = DOM.select('li.tab-item a').events('click')
        .map(event => event.target.dataset.tab)

    /**
     * Model computation.
     */
    const tab$ = tabLink$.startWith('login')
    const token$ = xs.merge(login.token, signup.token).remember()
    const reducers$ = token$.mapTo(state => ({...state, modal: false, active: false})) 

    /**
     * View computation.
     */
    const vdom$ = xs.combine(tab$, login.DOM, signup.DOM).map(([tab, loginVNode, signupVNode]) => {
    	return h('div.modal-container', {style: {width: '360px'}}, [ 
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
        ])
    })

    /**
     * Child components stream merging
     */
    const http$ = xs.merge(login.HTTP, signup.HTTP)
    const storage$ = token$.map(value => ({key: 'id_token', value}))

    return {
        DOM: vdom$,
        HTTP: http$,
        storage: storage$,
        fractal: reducers$,
    }
}