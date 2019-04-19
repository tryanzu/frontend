import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import classNames from 'classnames';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, form, label, i, a, input } = tags;

export function Login({ state, effects }) {
    const { auth } = state;
    function onSubmit(event) {
        event.preventDefault();
        if (auth.loading) {
            return;
        }
        effects.performLogin();
    }

    return div(
        '.content.fade-in',
        { key: 'login', style: { padding: '0 0.4rem 0.5rem' } },
        [
            div(
                '.form-group',
                {},
                a(
                    '.btn.btn-primary.btn-block.btn-facebook',
                    {
                        href:
                            Anzu.layer +
                            'oauth/facebook?redir=' +
                            window.location.href,
                        style: {},
                    },
                    [i('.icon-facebook.mr1'), 'Iniciar sesión con Facebook']
                )
            ),
            div('.form-group.tc', 'ó con tu cuenta'),
            form({ onSubmit }, [
                div(
                    '.black.bg-washed-red.pa2.mb2.f7.fade-in',
                    { className: classNames({ dn: auth.error === false }) },
                    t`${auth.error}`
                ),
                div('.form-group', [
                    input('.form-input', {
                        onChange: event =>
                            effects.auth('email', event.target.value),
                        value: auth.email,
                        id: 'email',
                        type: 'email',
                        autoComplete: 'username',
                        placeholder: 'Correo electrónico',
                        required: true,
                        autoFocus: true,
                    }),
                ]),
                div('.form-group', [
                    input('.form-input', {
                        value: auth.password,
                        onChange: event =>
                            effects.auth('password', event.target.value),
                        id: 'password',
                        type: 'password',
                        autoComplete: 'current-password',
                        placeholder: 'Contraseña',
                        required: true,
                    }),
                ]),
                div('.form-group', [
                    label('.form-checkbox', [
                        input({
                            type: 'checkbox',
                            id: 'rememberme',
                            name: 'rememberme',
                            onChange: event =>
                                effects.auth(
                                    'rememberMe',
                                    event.target.checked
                                ),
                            checked: auth.rememberMe,
                        }),
                        i('.form-icon'),
                        ' Recordar mi sesión',
                    ]),
                ]),
                input('.btn.btn-primary.btn-block', {
                    type: 'submit',
                    value: 'Iniciar sesión',
                    className: classNames({ loading: auth.loading }),
                }),
                a(
                    '.db.link.tc.mt2',
                    {
                        id: 'forgot',
                        onClick: () => effects.auth('forgot', true),
                    },
                    '¿Olvidaste tu contraseña?'
                ),
            ]),
        ]
    );
}
