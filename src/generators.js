export function selectLinks(DOM, selector) {
    return DOM.select(selector)
        .events('click', { preventDefault: true, stopPropagation: true })
        .filter(event => event.currentTarget.hasAttribute('href'))
        .map(event => {
            const { currentTarget } = event;
            event.preventDefault();
            event.stopPropagation();

            return { path: currentTarget.getAttribute('href') };
        });
}
