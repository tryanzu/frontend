import dropRepeats from 'xstream/extra/dropRepeats';

export function intent({ DOM, fractal }) {
    // DOM read effects.
    const overlayClick$ = DOM.select('.modal-link').events('click');

    // Compute a stream that holds the recent modal put into state. (outside world side effect)
    const modal$ = fractal.state$.compose(
        dropRepeats(
            (a, b) =>
                a.modal.active === b.modal.active &&
                a.modal.modal === b.modal.modal
        )
    );

    return {
        overlayClick$,
        modal$,
    };
}
