import xs from 'xstream';
import debounce from 'xstream/extra/debounce';

const ENTER_KEY = 13;
const ESC_KEY = 27;

/**
 *
 * @param dom
 * @param socket
 * @param history
 */
export function intent({DOM, HTTP, props}) {

    /**
     * Router read effects.
     */
    const linkPost$ = DOM.select('.feed .list a').events('click', {preventDefault: true})
        .map((event) => {
            const {target} = event;
            event.preventDefault();
            return {path: target.getAttribute('href'), id: target.dataset.postId};
        });

    /**
     * DOM intents including:
     */
    const scroll$ = DOM.select('.feed .list').events('scroll')
        .compose(debounce(60))
        .map(e => ({bottom: e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 1}));

    const fetch$ = scroll$.filter(e => e.bottom === true).mapTo({type: 'next'}).startWith({type: 'bootstrap'});

    /**
     * HTTP read effects including: 
     * - New requested posts.
     * - Fetched categories.
     * - Fetched individual posts.
     */
    const posts$ = HTTP.select('posts')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const categories$ = HTTP.select('categories')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body); 

    const post$ = HTTP.select('post')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    const subcategories$ = categories$.map(list => {
        return list
            .map(category => category.subcategories)
            .reduce((kvmap, subcategories) => {
                for (let k in subcategories) {
                    kvmap[subcategories[k].id] = subcategories[k];
                }

                return kvmap;
            }, {});
    });

    return {
        fetch$,
        posts$,
        post$,
        categories$,
        subcategories$,
        linkPost$,
        authToken$: props.authToken$,
    };
}