import {h} from '@cycle/dom';

export function view(state$) {
    return state$.map(({active, email, password, resolving, error}) => {
        if (!active) {
            return h('div.dn');
        }

        return h('div.modal.active.modal-sm', [
            h('div.modal-overlay.modal-link', {dataset: {modal: 'signin'}}),
            h('div.modal-container.w5', [
                h('div.modal-header.bb.b--light-gray', [
                    h('button.btn.btn-clear.float-right.modal-link', {dataset: {modal: 'signin'}}),
                    h('div.modal-title.f5', 'Iniciar sesión')
                ]),  
                h('div.modal-body', [
                    h('div.content', [
                        h('form', [
                            h('div.form-group', {class: {'has-error': error !== false}}, [
                                h('input.form-input.input-lg', {props: {value: email}, attrs: {id: 'email', type: 'email', placeholder: 'Correo electrónico', required: true}})
                            ]),
                            h('div.form-group', {class: {'has-error': error !== false}}, [
                                h('input.form-input.input-lg', {props: {value: password}, attrs: {id: 'password', type: 'password', placeholder: 'Contraseña', required: true}})
                            ]),
                            h('button.btn.btn-primary.btn-block.btn-lg.f6', {attrs: {type: 'submit'}, class: {loading: resolving}}, 'Iniciar sesión')
                        ])
                    ])
                ])
            ]),
        ]);
    });
}