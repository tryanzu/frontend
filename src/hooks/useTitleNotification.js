import { useEffect } from 'react';
import useWindowVisibility from './useWindowVisibility';
import { audio, chatAudio } from '../board/utils';

const sounds = {
    default: audio,
    chat: chatAudio,
};

export default function useTitleNotification({ type = 'default' }) {
    const [isWindowActive, isWindowActiveRef] = useWindowVisibility();

    // Reset notification title as needed.
    useEffect(() => {
        if (isWindowActive && document.title.substr(0, 3) === '(*)') {
            document.title = document.title.substr(4);
        }
    }, [isWindowActive]);

    function pingNotification() {
        if (!isWindowActiveRef.current) {
            document.title =
                document.title.substr(0, 3) === '(*)'
                    ? document.title
                    : `(*) ${document.title}`;
            sounds[type].play();
        }
    }

    return [isWindowActive, { pingNotification }];
}
