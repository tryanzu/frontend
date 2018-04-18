import xs from 'xstream';
import debounce from 'xstream/extra/debounce';

const ENTER_KEY = 13;

/**
 *
 * @param dom
 * @param socket
 * @param history
 */
export function intent(dom, socket) {
    /**
     * Some initial data will come right outta socket.io.
     *
     * This allows dynamic config & socket auth.
     */
    const signature$ = socket.get('user signature');
    const online$ = socket.get('online-list');
    const config$ = socket.get('config');
    const messages$ = socket.get('messages');
    const highlighted$ = socket.get('highlighted');

    /**
     * DOM intents including:
     *
     * - keyups from message box
     * - scroll on messages container
     * - change channel clicks
     */
    const msg$ = dom
        .select('.message')
        .events('keyup')
        .filter(e => {
            let trimmed = String(e.target.value).trim();
            return trimmed;
        })
        .map(e => ({
            type: 'message',
            sent: e.keyCode == ENTER_KEY,
            payload: String(e.target.value),
        }));

    const scroll$ = dom
        .select('.list-container')
        .events('scroll')
        .compose(debounce(60))
        .map(e => ({
            type: 'feed-scroll',
            lock:
                e.target.scrollHeight -
                    e.target.scrollTop -
                    e.target.clientHeight <
                1,
        }));

    const channel$ = dom
        .select('.channel')
        .events('click')
        .map(e => e.target.dataset.id);

    /**
     * Video player options.
     */
    const videoId$ = dom
        .select('#videoId')
        .events('change')
        .map(e => String(e.target.value));

    const videoPlayer$ = dom
        .select('#videoPlayer')
        .events('change')
        .map(e => e.target.checked);

    const videoLive$ = dom
        .select('#live')
        .events('change')
        .map(e => e.target.checked);

    const idActions$ = dom
        .select('.id-action')
        .events('click')
        .map(e => ({ type: e.target.dataset.type, id: e.target.dataset.id }));

    /**
     * Highlighted messages require a special stream of streams to be generated
     */
    const rhighlighted$ = highlighted$
        .map(
            list =>
                list.length > 0
                    ? xs
                          .periodic(12000)
                          .filter(x => x > 0)
                          .startWith(0)
                          .map(x => x % list.length)
                          .map(x => list[x])
                    : xs.empty()
        )
        .flatten();

    return {
        config$,
        signature$,
        msg$,
        scroll$,
        messages$,
        highlighted$,
        rhighlighted$,
        channel$,
        idActions$,
        online$,
        videoId$,
        videoPlayer$,
        videoLive$,
    };
}
