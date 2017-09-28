import {h} from '@cycle/dom';

export function view(state$) {
    return state$.map(state => {
        const {email, password, resolving, error, showForgotPassword} = state;

        // Show forgot password form.
        if (showForgotPassword) {
            return forgotPasswordView(state);
        }

        return h('div.content.fade-in', {key: 'login', style: {padding: '0 0.4rem'}}, [
            h('div.form-group', h('a.btn.btn-primary.btn-block', {attrs: {href: Anzu.layer + 'oauth/facebook?redir=' + window.location.href}, style: {background: '#4267b2', borderColor: '#4267b2'}}, [
                h('i.fa.fa-facebook-official.mr1'),
                'Iniciar sesión con Facebook'
            ])),
            h('div.form-group.tc', 'ó con tu cuenta'),
            h('form', {attrs: {name: 'login'}}, [
                h('div.black.bg-washed-red.pa2.mb2.f7.fade-in', {class: {dn: error === false}}, [
                    'No pudimos acceder a tu cuenta, verifica tus datos e intenta nuevamente.'
                ]),
                h('div.form-group', [
                    h('input.form-input', {props: {value: email}, attrs: {id: 'email', type: 'email', placeholder: 'Correo electrónico', required: true}})
                ]),
                h('div.form-group', [
                    h('input.form-input', {props: {value: password}, attrs: {id: 'password', type: 'password', placeholder: 'Contraseña', required: true}})
                ]),
                h('div.form-group', [
                    h('label.form-checkbox', [
                        h('input', {attrs: {type: 'checkbox'}}),
                        h('i.form-icon'),
                        ' Recordar mi sesión'
                    ]),
                ]),
                h('button.btn.btn-primary.btn-block', {attrs: {type: 'submit'}, class: {loading: resolving}}, 'Iniciar sesión'),
                h('a.db.link.tc.mt2', {attrs: {id: 'forgot'}}, '¿Olvidaste tu contraseña?')
            ])
        ]);
    });
}

function forgotPasswordView({error, resolving, email, sentRecover}) {
    return h('div.content.fade-in', {key: 'login', style: {padding: '0 0.4rem'}}, [
        h('div', {class: {dn: sentRecover == false}}, [
            h('h6.mb2', 'Recuperar contraseña'),
            h('div.toast.toast-success.mb2', [
                h('p.lh-copy', 'Hemos enviado un correo electrónico con los datos necesarios para restablecer tu contraseña.'),
            ]),
            h('a.db.link.tc.mt2', {attrs: {id: 'forgot'}}, 'Cancelar')
        ]),
        h('form', {class: {dn: sentRecover}, attrs: {name: 'forgot'}}, [
            h('div.black.bg-washed-red.pa2.mb2.f7.fade-in', {class: {dn: error === false}}, [
                'No pudimos acceder a tu cuenta, verifica tus datos e intenta nuevamente.'
            ]),
            h('h6.mb2', 'Recuperar contraseña'),
            h('p', 'Recupera el acceso a tu cuenta proporcionando el correo electrónico que usaste en tu registro.'),
            h('div.form-group', [
                h('input.form-input', {props: {value: email}, attrs: {id: 'email', type: 'email', placeholder: 'Correo electrónico', required: true}})
            ]),
            h('button.btn.btn-primary.btn-block', {attrs: {type: 'submit'}, class: {loading: resolving}}, 'Recuperar contraseña'),
            h('a.db.link.tc.mt2', {attrs: {id: 'forgot'}}, 'Cancelar')
        ])
    ]);
}