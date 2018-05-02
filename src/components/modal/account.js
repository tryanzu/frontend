import { h, div } from '@cycle/dom';
import xs from 'xstream';
import isolate from '@cycle/isolate';
import { LoginModal } from './login';
import { SignupModal } from './signup';
import { t } from '../../i18n';

export function AccountModal({ DOM, HTTP, fractal }) {
    /**
     * Child components declarations.
     */
    const login = isolate(LoginModal, 'login')({ DOM, HTTP });
    const signup = isolate(SignupModal, 'signup')({ DOM, HTTP });

    /**
     * Read effects including:
     * - DOM: tab change, ...
     */
    const tabLink$ = DOM.select('li.tab-item a')
        .events('click')
        .map(event => event.target.dataset.tab);

    /**
     * Model computation.
     */
    const tab$ = tabLink$.startWith('login');
    const token$ = xs.merge(login.token, signup.token).remember();
    const reducers$ = token$.mapTo(state => ({
        ...state,
        modal: { modal: false, active: false },
    }));

    /**
     * View computation.
     */
    const vdom$ = xs
        .combine(fractal.state$, tab$, login.DOM, signup.DOM)
        .map(([state, tab, loginVNode, signupVNode]) => {
            const modal = state.modal || {};
            const params = modal.params || {};
            const intent = params.intent || false;

            return h('div.modal-container', { style: { width: '360px' } }, [
                h(
                    'div.modal-body',
                    { style: { paddingTop: '0', maxHeight: '85vh' } },
                    [
                        h(
                            'div.bg-near-white.tc.pv3',
                            { style: { margin: '0 -0.8rem' } },
                            [
                                h('img.w3', {
                                    attrs: {
                                        src: '/images/anzu.svg',
                                        alt: 'Únete a la conversación',
                                    },
                                }),
                            ]
                        ),
                        h(
                            'ul.tab.tab-block',
                            { style: { margin: '0 -0.8rem 1.2rem' } },
                            [
                                h(
                                    'li.tab-item.pointer',
                                    { class: { active: tab == 'login' } },
                                    h(
                                        'a',
                                        { dataset: { tab: 'login' } },
                                        'Iniciar sesión'
                                    )
                                ),
                                h(
                                    'li.tab-item.pointer',
                                    { class: { active: tab == 'signup' } },
                                    h(
                                        'a',
                                        { dataset: { tab: 'signup' } },
                                        'Crear cuenta'
                                    )
                                ),
                            ]
                        ),
                        div({ style: { padding: '0 0.4rem' } }, [
                            intent === 'publish'
                                ? div(
                                      '.toast.toast-warning.mb3',
                                      t`Necesitas estar identificado para continuar con tu publicación.`
                                  )
                                : null,
                        ]),
                        tab === 'login' ? loginVNode : signupVNode,
                    ]
                ),
            ]);
        });

    /**
     * Child components stream merging
     */
    const http$ = xs.merge(login.HTTP, signup.HTTP);
    const storage$ = token$.map(value => ({ key: 'id_token', value }));

    return {
        DOM: vdom$,
        HTTP: http$,
        storage: storage$,
        fractal: reducers$,
    };
}
