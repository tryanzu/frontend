import { h } from '@cycle/dom';

export function view(state$) {
    return state$.map(
        ({ email, username, password, resolving, error, done }) => {
            if (done) {
                return h('div.content.fade-in', { key: 'signup' }, [
                    h('span.db.tc.b.mb2.f6', '¡Bienvenido a la comunidad!'),
                    h('div.toast.toast-success.mb2', [
                        h(
                            'p.lh-copy',
                            'Tu cuenta fue creada con éxito y en breve recibirás un correo electrónico para confirmar tu cuenta.'
                        ),
                        h(
                            'p.b.lh-copy.mb0',
                            'Confirmando tu cuenta tendrás acceso completo a buldar.com'
                        ),
                    ]),
                    h('a.btn.btn-block.btn-primary.finish', 'Entendido'),
                ]);
            }

            return h(
                'div.content.fade-in',
                { key: 'signup', style: { padding: '0 0.4rem' } },
                [
                    h(
                        'div.form-group',
                        h(
                            'a.btn.btn-primary.btn-block',
                            {
                                attrs: {
                                    href:
                                        Anzu.layer +
                                        'oauth/facebook?redir=' +
                                        window.location.href,
                                },
                                style: {
                                    background: '#4267b2',
                                    borderColor: '#4267b2',
                                },
                            },
                            [
                                h('i.fa.fa-facebook-official.mr1'),
                                'Únete con Facebook',
                            ]
                        )
                    ),
                    h('div.form-group.tc', 'ó crea una cuenta con tu correo'),
                    h('form', [
                        h(
                            'div.form-group',
                            { class: { 'has-error': error !== false } },
                            [
                                h('input.form-input', {
                                    props: { value: email },
                                    attrs: {
                                        id: 'email',
                                        type: 'email',
                                        placeholder: 'Correo electrónico',
                                        required: true,
                                    },
                                }),
                            ]
                        ),
                        h(
                            'div.form-group',
                            { class: { 'has-error': error !== false } },
                            [
                                h('input.form-input', {
                                    props: { value: username },
                                    attrs: {
                                        id: 'username',
                                        type: 'text',
                                        placeholder: 'Nombre de usuario',
                                        required: true,
                                    },
                                }),
                            ]
                        ),
                        h(
                            'div.form-group',
                            { class: { 'has-error': error !== false } },
                            [
                                h('input.form-input', {
                                    props: { value: password },
                                    attrs: {
                                        id: 'password',
                                        type: 'password',
                                        placeholder: 'Contraseña',
                                        required: true,
                                    },
                                }),
                            ]
                        ),
                        h(
                            'button.btn.btn-primary.btn-block',
                            {
                                attrs: { type: 'submit' },
                                class: { loading: resolving },
                            },
                            'Crear cuenta'
                        ),
                    ]),
                ]
            );
        }
    );
}
