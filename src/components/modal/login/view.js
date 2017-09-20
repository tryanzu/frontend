import {h} from '@cycle/dom';

export function view(state$) {
    return state$.map(({active, email, password, resolving, error}) => {
        if (!active) {
            return h('div.dn');
        }

        return h('div.modal.active', [
            h('div.modal-overlay.modal-link', {dataset: {modal: 'signin'}}),
            h('div.modal-container', {style: {width: '360px'}}, [ 
                h('div.modal-body', {style: {paddingTop: '0', maxHeight: '80vh'}}, [
                    h('div.bg-near-white.tc.pv3', {style: {margin: '0 -0.8rem'}}, [
                        h('img.w2', {attrs: {src: '/images/seal.svg'}})
                    ]),
                    h('ul.tab.tab-block', {style: {margin: '0 -0.8rem 1.2rem'}}, [
                        h('li.tab-item.active', h('a', 'Iniciar sesión')),
                        h('li.tab-item', h('a', 'Crear cuenta')),
                    ]),
                    h('div.content', {style: {padding: '0 0.4rem'}}, [
                        h('div.form-group', h('a.btn.btn-primary.btn-block', {style: {background: '#4267b2', borderColor: '#4267b2'}}, [
                            h('i.fa.fa-facebook-official.mr1'),
                            'Iniciar sesión con Facebook'
                        ])),
                        h('div.form-group.tc', 'ó con tu cuenta'),
                        h('form', [
                            h('div.form-group', {class: {'has-error': error !== false}}, [
                                h('input.form-input', {props: {value: email}, attrs: {id: 'email', type: 'email', placeholder: 'Correo electrónico', required: true}})
                            ]),
                            h('div.form-group', {class: {'has-error': error !== false}}, [
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
                            h('a.db.link.tc.mt2', '¿Olvidaste tu contraseña?')
                        ])
                    ])
                ])
            ]),
        ]);
    });
}