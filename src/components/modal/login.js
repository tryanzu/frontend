import {h} from '@cycle/dom';
import xs from 'xstream';

function intent(props$, dom) {
	const activeLogin$ = props$.filter(ev => ev.modal == 'signin')
        .mapTo(true)
        .fold(acc => !acc, false);

    const email$ = dom.select('#email').events('input')
    	.map(ev => ev.target.value)
    	.startWith('');

    const password$ = dom.select('#password').events('input')
    	.map(ev => ev.target.value)
    	.startWith('');

    const fields$ = xs.combine(email$, password$);

    const sent$ = dom.select('form').events('submit', {preventDefault: true})
    	.mapTo(true)
    	.startWith(false);

    return {activeLogin$, fields$, sent$};
}

function model(actions) {
	const requestToken$ = xs.combine(actions.sent$, actions.fields$).filter(([sent]) => sent === true)
		.map(([_, [email, password]]) => ({
				url: 'http://localhost:3200/v1/auth/get-token', 
				category: 'token',
				query: {
					email,
					password
				}
			})
		);

	const state$ = xs.combine(actions.activeLogin$, actions.fields$, actions.sent$);

	return {
		state$,
		HTTP: requestToken$
	};
}

function view(state$) {
	return state$.map(([active, [username, password], sent]) => {
		if (!active) {
			return h('div.dn');
		}

		return h('div.modal.active.modal-sm', [
            h('div.modal-overlay.modal-link', {dataset: {modal: 'signin'}}),
            h('div.modal-container.w5', [
                h('div.modal-header', [
                    h('button.btn.btn-clear.float-right.modal-link', {dataset: {modal: 'signin'}}),
                    h('div.modal-title.f5', 'Iniciar sesión')
                ]),  
                h('div.modal-body', [
                    h('div.content', [
                    	h('form', [
                    		h('div.form-group', [
	                            h('input.form-input.input-lg', {props: {value: username}, attrs: {id: 'email', type: 'text', placeholder: 'Correo electrónico'}})
	                        ]),
	                        h('div.form-group', [
	                            h('input.form-input.input-lg', {props: {value: password}, attrs: {id: 'password', type: 'password', placeholder: 'Contraseña'}})
	                        ]),
	                        h('button.btn.btn-primary.btn-block.btn-lg.f6', {attrs: {type: 'submit'}, class: {loading: sent}}, 'Iniciar sesión')
                    	])
                    ])
                ])
            ]),
        ]);
	});
}

export function LoginModal({DOM, props}) {
	const actions = intent(props, DOM);
	const model$ = model(actions);
	const view$ = view(model$.state$);

	return {
		DOM: view$,
		HTTP: model$.HTTP
	};
};