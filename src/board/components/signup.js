import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import classNames from 'classnames';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, form, i, a, input } = tags;

export function Signup({ state, effects }) {
    const { auth } = state;
    function onSubmit(event) {
        event.preventDefault();
        if (auth.loading) {
            return;
        }
        effects.performSignup();
    }
    return div(
        '.content.fade-in',
        { key: 'signup', style: { padding: '0 0.4rem' } },
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
                        style: {
                            background: '#4267b2',
                            borderColor: '#4267b2',
                        },
                    },
                    [i('.icon-facebook.mr1'), 'Únete con Facebook']
                )
            ),
            div('.form-group.tc', 'ó crea una cuenta con tu correo'),
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
                        placeholder: 'Correo electrónico',
                        required: true,
                        autoFocus: true,
                    }),
                ]),
                div('.form-group', [
                    input('.form-input', {
                        onChange: event =>
                            effects.auth('username', event.target.value),
                        value: auth.username,
                        type: 'text',
                        placeholder: 'Nombre de usuario',
                        required: true,
                    }),
                ]),
                div('.form-group', [
                    input('.form-input', {
                        value: auth.password,
                        onChange: event =>
                            effects.auth('password', event.target.value),
                        id: 'password',
                        type: 'password',
                        placeholder: 'Contraseña',
                        required: true,
                    }),
                ]),
                input('.btn.btn-primary.btn-block', {
                    type: 'submit',
                    value: 'Crear cuenta',
                    className: classNames({ loading: auth.loading }),
                }),
            ]),
        ]
    );
}
