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
export function intent({DOM, HTTP}) {

    /**
     * DOM intents including:
     */
    const scroll$ = DOM.select('.list-container').events('scroll')
        .compose(debounce(60))
        .map(e => ({
            type: 'feed-scroll',
            bottom: e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 1
        }));

    const router$ = xs.empty();

    const fetch$ = scroll$.filter(e => e.bottom === true).map({type: 'next'}).startWith({type: 'bootstrap'});

    /**
     * HTTP read effects including: 
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
        categories$,
        subcategories$,
        router$
    };
}