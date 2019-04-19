import h from 'react-hyperscript';
import Markdown from 'react-markdown';
import emoji from 'emoji-dictionary';
import { memo } from 'react';
import { Link } from 'react-router-dom';

function emojiSupport(props) {
    return props.children.replace(
        /:\+1:|:-1:|:[\w-]+:/g,
        name => emoji.getUnicode(name) || name
    );
}

function linkSupport(props) {
    return props.href.match(/^(https?:)?\/\//)
        ? h('a', { href: props.href }, props.children)
        : h(Link, { to: props.href }, props.children);
}

export const MemoizedMarkdown = memo(({ content }) => {
    return h(Markdown, {
        source: content,
        renderers: { text: emojiSupport, link: linkSupport },
        escapeHtml: false,
    });
});

export function kvReducer(obj) {
    return (_, key, value = false) => {
        if (typeof key === 'object') {
            return state => ({
                ...state,
                [obj]: {
                    ...state[obj],
                    ...key,
                },
            });
        }
        return state => ({
            ...state,
            [obj]: {
                ...state[obj],
                [key]: value,
            },
        });
    };
}

export function jsonReq(req) {
    return req.then(response => response.json()).then(response => {
        const status = response.status || 'okay';
        const message =
            response.message || 'Invalid response, check network requests.';
        if (status !== 'okay') {
            throw message;
        }
        return response;
    });
}

export function channelToObs(socket, name = false) {
    return {
        subscribe: observer => {
            socket.on('connected', () => {
                // When is not the global namespace we need to explicitly tell
                // the remote to join us into that channel.
                if (name) {
                    socket.send(
                        JSON.stringify({
                            event: 'listen',
                            params: { chan: name },
                        })
                    );
                }
                const channel = name ? socket.channel(name) : socket;
                channel.onMessage(m => {
                    const msg = JSON.parse(m);
                    observer.next(msg);
                });
            });
        },
    };
}
