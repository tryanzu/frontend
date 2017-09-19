import {h} from '@cycle/dom';
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';

const DEFAULT_STATE = {
	active: false,
	resolving: false,
	email: '',
	password: '',
	error: false
};

function intent(props$, dom, http) {
	const activeLogin$ = props$.filter(ev => ev.modal == 'signin')
        .mapTo(true)
        .fold(acc => !acc, false);

    const token$ = http.select('token')
    	.map(response$ => response$.replaceError(err => xs.of(err)))
    	.flatten();

    /**
     * DOM intents including:
     *
     * - email & password input
     * - login form submit
     */
    const email$ = dom.select('#email').events('input')
    	.map(ev => ev.target.value)
    	.startWith('');

    const password$ = dom.select('#password').events('input')
    	.map(ev => ev.target.value)
    	.startWith('');

    const sent$ = dom.select('form').events('submit', {preventDefault: true})
    	.mapTo(true)
    	.startWith(false);

    const fields$ = xs.combine(email$, password$);

    return {activeLogin$, fields$, sent$, token$};
}

function model(actions) {

	/**
	 * Write side effects.
	 */
	const requestToken$ = actions.sent$.filter(sent => sent === true)
		.compose(sampleCombine(actions.fields$))
		.map(([sent, [email, password]]) => ({
				method: 'POST',
				url: 'http://localhost:3200/v1/auth/get-token', 
				category: 'token',
				query: {email, password}
			})
		);

	const token$ = actions.token$.filter(res => !(res instanceof Error))
		.map(res => res.body.token);

	const opened$ = xs.merge(actions.activeLogin$, token$.mapTo(false));

	/**
	 * Reducers.
	 * Streams mapped to reducer functions.
	 */
	 const activeR$ = opened$.map(active => state => ({...state, active}));
	 const fieldsR$ = actions.fields$.map(([email, password]) => state => ({...state, email, password}));
	 const sentR$ = actions.sent$.map(sent => state => ({...state, resolving: sent}));
	 const tokenR$ = actions.token$.map(res => state => {
	 	return {
	 		...state, 
	 		resolving: false,
	 		error: res instanceof Error ? res : false
	 	};
	 });

	const state$ = xs.merge(activeR$, fieldsR$, sentR$, tokenR$)
		.fold((state, action) => action(state), DEFAULT_STATE);

	return {
		state$,
		token$,
		HTTP: requestToken$,
	};
}

function view(state$) {
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

export function LoginModal({DOM, HTTP, props}) {
	const actions = intent(props, DOM, HTTP);
	const model$ = model(actions);
	const view$ = view(model$.state$);

	return {
		DOM: view$,
		HTTP: model$.HTTP,
		token: model$.token$
	};
};