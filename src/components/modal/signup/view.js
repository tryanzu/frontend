import {h} from '@cycle/dom';

export function view(state$) {
    return state$.map(({email, username, password, resolving, error}) => {
        return h('div.content.fade-in', {key: 'signup', style: {padding: '0 0.4rem'}}, [
            h('div.form-group', h('a.btn.btn-primary.btn-block', {style: {background: '#4267b2', borderColor: '#4267b2'}}, [
                h('i.fa.fa-facebook-official.mr1'),
                'Únete con Facebook'
            ])),
            h('div.form-group.tc', 'ó crea una cuenta con tu correo'),
            h('form', [
                h('div.form-group', {class: {'has-error': error !== false}}, [
                    h('input.form-input', {props: {value: email}, attrs: {id: 'email', type: 'email', placeholder: 'Correo electrónico', required: true}})
                ]),
                h('div.form-group', {class: {'has-error': error !== false}}, [
                    h('input.form-input', {props: {value: username}, attrs: {id: 'username', type: 'text', placeholder: 'Nombre de usuario', required: true}})
                ]),
                h('div.form-group', {class: {'has-error': error !== false}}, [
                    h('input.form-input', {props: {value: password}, attrs: {id: 'password', type: 'password', placeholder: 'Contraseña', required: true}})
                ]),
                h('button.btn.btn-primary.btn-block', {attrs: {type: 'submit'}, class: {loading: resolving}}, 'Crear cuenta'),
            ])
        ]);
    });
}