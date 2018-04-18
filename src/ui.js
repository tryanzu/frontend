import md from 'markdown-it';
import emoji from 'markdown-it-emoji';
import mila from 'markdown-it-link-attributes';

export const markdown = md({
    html: true,
    linkify: true,
    typographer: false,
}).disable('image');

markdown.use(emoji);
markdown.use(mila, {
    target: '_blank',
    rel: 'noopener',
    class: 'link blue hover-green',
});
