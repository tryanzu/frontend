import h from 'react-hyperscript';
import classNames from 'classnames';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { Login } from './login';
import { Signup } from './signup';
import { Link } from 'react-router-dom';
import { ForgotPassword } from './forgotPassword';

const tags = helpers(h);
const { div, img, ul, li, a, p } = tags;

export function Account({ state, effects, ...props }) {
    const { auth } = state;
    const isOpen = props.alwaysOpen || auth.modal;
    return h(
        Modal,
        {
            isOpen,
            onRequestClose: () => effects.auth('modal', false),
            ariaHideApp: false,
            contentLabel: t`Tu cuenta en` + ' ' + state.site.name,
            className: 'account-modal',
            style: {
                overlay: {
                    zIndex: 301,
                    backgroundColor: 'rgba(0, 0, 0, 0.30)',
                },
            },
        },
        [
            div('.modal-container', { style: {} }, [
                div(
                    '.modal-body',
                    { style: { paddingTop: '0', maxHeight: '85vh' } },
                    [
                        div('.tc.pv3', { style: { margin: '0 -0.8rem' } }, [
                            h(
                                Link,
                                { to: '/' },
                                img('.w3', {
                                    src:
                                        state.site.logoUrl ||
                                        '/images/anzu.svg',
                                    alt: t`Únete a la conversación`,
                                })
                            ),
                        ]),
                        ul(
                            '.tab.tab-block',
                            { style: { margin: '0 -0.8rem 1.2rem' } },
                            [
                                li(
                                    '.tab-item.pointer',
                                    {
                                        className: classNames({
                                            active: auth.tab == 'login',
                                        }),
                                    },
                                    a(
                                        {
                                            onClick: () =>
                                                effects.auth('tab', 'login'),
                                        },
                                        t`Iniciar sesión`
                                    )
                                ),
                                li(
                                    '.tab-item.pointer',
                                    {
                                        className: classNames({
                                            active: auth.tab == 'signup',
                                        }),
                                    },
                                    a(
                                        {
                                            onClick: () =>
                                                effects.auth('tab', 'signup'),
                                        },
                                        t`Crear cuenta`
                                    )
                                ),
                            ]
                        ),
                        !auth.forgot &&
                            p('.tc.lh-copy', [
                                t`Únete o inicia sesión, la conversación te necesita.`,
                            ]),
                        div({ style: { padding: '0 0.4rem' } }, [
                            auth.intent === 'publish' &&
                                div(
                                    '.toast.toast-warning.mb3',
                                    t`Necesitas estar identificado para continuar con tu publicación.`
                                ),
                        ]),
                        auth.tab === 'login' &&
                            !auth.forgot &&
                            h(Login, { state, effects }),
                        auth.tab === 'login' &&
                            auth.forgot &&
                            h(ForgotPassword, { state, effects }),
                        auth.tab === 'signup' && h(Signup, { state, effects }),
                    ]
                ),
            ]),
        ]
    );
}
