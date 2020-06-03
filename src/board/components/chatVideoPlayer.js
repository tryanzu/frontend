import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import YouTube from 'react-youtube';
import Twitch from 'react-twitch-embed-video';

const tags = helpers(h);
const { div } = tags;

export function ChatVideoPlayer({ channel }) {
    return div(
        '.ph3#video',
        {
            style: {
                minWidth: 515,
                zIndex: 100,
                top: 75,
                right: 35,
            },
        },
        [
            channel.youtubeVideo != '' &&
                h(
                    '.video-responsive.center',
                    { style: { maxWidth: '70%' } },
                    h(YouTube, {
                        videoId: channel.youtubeVideo,
                        opts: {
                            playerVars: {
                                // https://developers.google.com/youtube/player_parameters
                                autoplay: 0,
                            },
                        },
                    })
                ),
            channel.twitchVideo != '' &&
                h(
                    '.video-responsive.center',
                    { style: { maxWidth: '70%' } },
                    h(Twitch, {
                        channel: channel.twitchVideo,
                        layout: 'video',
                        muted: false,
                        targetClass: 'twitch-embed',
                    })
                ),
        ]
    );
}
