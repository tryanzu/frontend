import { useEffect } from 'react';
import useWindowVisibility from './useWindowVisibility';
import { audio } from '../board/utils';

export default function useTitleNotification() {
    const [isWindowActive, isWindowActiveRef] = useWindowVisibility();

    // Reset notification title as needed.
    useEffect(
        () => {
            if (isWindowActive && document.title.substr(0, 3) === '(*)') {
                document.title = document.title.substr(4);
            }
        },
        [isWindowActive]
    );

    function pingNotification() {
        if (!isWindowActiveRef.current) {
            document.title =
                document.title.substr(0, 3) === '(*)'
                    ? document.title
                    : `(*) ${document.title}`;
            audio.play();
        }
    }

    return [isWindowActive, { pingNotification }];
}
