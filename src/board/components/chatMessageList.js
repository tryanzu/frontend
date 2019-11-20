import { useEffect, useRef, useState, memo } from 'react';
import { useTitleNotification } from '../../hooks';
import classNames from 'classnames';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { MemoizedBasicMarkdown } from '../utils';
import { format, subSeconds, isAfter } from 'date-fns';
import { streamChatChannel } from '../../streams';
import { ChatLogItem } from './chatLogItem';
import { ChatMessageItem } from './chatMessageItem';

const tags = helpers(h);
const { div, i } = tags;
const { figure, img } = tags;
const { h5, span } = tags;

export const ChatMessageList = memo(function(props) {
    const { state, channel, isOnline, lockRef, effects, soundRef } = props;
    const bottomRef = useRef(null);
    const [list, setList] = useState([]);
    const [featured, setFeatured] = useState(false);
    const [, { pingNotification }] = useTitleNotification();
    const [loading, setLoading] = useState(false);
    const chan = channel.name;

    useEffect(
        () => {
            // This side effect will be executed every time a channel is load.
            // So in short it clears the message list state and subscribes to
            // the events stream.
            setList([]);
            setFeatured(false);
            setLoading(true);
            // Reactive message list from our chat source.
            const dispose = streamChatChannel(
                { realtime: state.realtime, chan },
                ({ list, starred }) => {
                    setList(lockRef.current ? list : list.slice(-50));
                    setFeatured(starred.length > 0 && starred[0]);
                    setLoading(false);
                    if (soundRef.current === false) {
                        pingNotification();
                    }
                    if (lockRef.current) {
                        return;
                    }
                    window.requestAnimationFrame(() => {
                        if (bottomRef.current) {
                            bottomRef.current.scrollIntoView({});
                        }
                    });
                }
            );
            // Unsubscribe will be called at unmount.
            return dispose;
        },
        [chan]
    );

    return div('.flex-auto.overflow-y-scroll.relative', [
        loading && div('.loading.loading-lg.mt2'),
        featured &&
            isAfter(featured.at, subSeconds(new Date(), 15)) &&
            div(
                '.starred',
                {},
                div([
                    h5([i('.icon-star-filled.mr1'), 'Mensaje destacado:']),
                    div('.tile', [
                        div('.tile-icon', { style: { width: '2rem' } }, [
                            figure('.avatar', [
                                featured.avatar &&
                                    img({ src: featured.avatar }),
                                i('.avatar-presence', {
                                    className: classNames({
                                        online: isOnline,
                                    }),
                                }),
                            ]),
                        ]),
                        div('.tile-content', [
                            div('.tile-title.mb2', [
                                span('.text-bold.text-primary', featured.from),
                                span('.subtext.ml2', format(featured.at, 'HH:mm')),
                            ]),
                            div('.tile-subtitle', {}, [
                                h(MemoizedBasicMarkdown, {
                                    content: featured.msg,
                                    onImageLoad: () => false,
                                }),
                            ]),
                        ]),
                    ]),
                ])
            ),
        div(
            '.pv3',
            list.map((message, k) => {
                if (message.type === 'log') {
                    return h(ChatLogItem, {
                        key: message.id,
                        message,
                    });
                }

                return h(ChatMessageItem, {
                    key: message.id,
                    short:
                        list[k - 1] &&
                        list[k - 1].from === message.from &&
                        (!list[k - 10] ||
                            k % 10 != 0 ||
                            (list[k - 10] &&
                                list[k - 10].from !== message.from)),
                    message,
                    isOnline: isOnline && isOnline.has(message.userId),
                    bottomRef,
                    effects,
                    lockRef,
                    chan,
                });
            })
        ),
        div('#bottom', { ref: bottomRef }),
    ]);
});
