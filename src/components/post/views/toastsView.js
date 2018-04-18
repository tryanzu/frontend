import { div } from '@cycle/dom';

export function toastsView({ state }) {
    const { toasts } = state.own;

    if (toasts.length === 0) {
        return div('.dn');
    }

    return toasts.map(toast =>
        div(
            {
                attrs: {
                    class: 'mb2 fade-in shadow-4 toast toast-' + toast.type,
                },
            },
            toast.content
        )
    );
}
