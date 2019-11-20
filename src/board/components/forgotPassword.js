import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import classNames from 'classnames';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, form, a, input, p } = tags;

export function ForgotPassword({ state, effects }) {
    const { auth } = state;

    function lostPasswordHandler(event) {
        event.preventDefault();
        if (auth.loading) {
            return;
        }
        effects.requestPasswordReset();
    }

    return div(
        '.content.fade-in',
        { key: 'forgot-password', style: { padding: '0 0.4rem 0.5rem' } },
        [
            form({ onSubmit: lostPasswordHandler }, [
                h('h6', { className: 'mb2' }, t`Recuperar contraseña`),
                p(
                    t`Recupera el acceso a tu cuenta proporcionando el correo electrónico que usaste en tu registro.`
                ),
                div(
                    '.error-message.pa2.mb2.f7.fade-in',
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
                        placeholder: t`Correo electrónico`,
                        required: true,
                        autoFocus: true,
                    }),
                ]),
                input('.btn.btn-primary.btn-block', {
                    type: 'submit',
                    value: t`Recuperar contraseña`,
                    className: classNames({ loading: auth.loading }),
                }),
                a(
                    '.db.link.tc.mt2',
                    {
                        id: 'forgot',
                        onClick: () => effects.auth('forgot', false),
                    },
                    t`Cancelar`
                ),
            ]),
        ]
    );
}
