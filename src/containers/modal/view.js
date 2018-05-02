import xs from 'xstream';
import { h } from '@cycle/dom';

export function view(state$, childVTree$) {
    return xs.combine(state$, childVTree$).map(([state, childVNode]) => {
        if (state.modal.active == false) {
            return h('div');
        }

        return h('div.modal.active', { key: state.modal.modal }, [
            h('div.modal-overlay.modal-link', {
                dataset: { modal: state.modal.modal },
            }),
            childVNode,
        ]);
    });
}
