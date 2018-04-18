import classNames from 'classnames';
import virtualize from 'snabbdom-virtualize';
import { div, a, i, span } from '@cycle/dom';
import { markdown } from '../../../ui';
import { authorView } from './authorView';
import { replyView } from './replyView';

export function commentView(props) {
    const { comment, state } = props;
    const { user } = state.shared;
    const { voting, ui, votes } = state.own;

    const isVoting =
        voting !== false && voting.id == comment.id ? voting.intent : false;
    const noPadding = props.noPadding || false;

    // Loading vote status helper.
    const voted = votes[comment.id] || false;
    const replies = comment.replies || {};
    const repliesCount = replies.count || 0;
    const voteIcon = (intent, vnode) =>
        isVoting !== false && intent == isVoting ? div('.dib.loading') : vnode;
    const isCurrentUsersComment = user.id == comment.user_id;

    return div({ class: { pb3: noPadding == false }, key: comment.id }, [
        div('.flex', [
            div('.flex-auto', authorView(comment, 'Comentó')),
            div([
                a(
                    '.v-mid.pointer.reply-to',
                    {
                        class: {
                            dn: isCurrentUsersComment,
                            dib: !isCurrentUsersComment,
                        },
                        dataset: {
                            id: noPadding ? comment.reply_to : comment.id,
                        },
                    },
                    [i('.icon-reply-outline'), span('.pl2', 'Responder')]
                ),
                div('.dib.v-mid', [
                    a(
                        {
                            attrs: {
                                class: classNames(
                                    'dib',
                                    'v-mid',
                                    'mh2',
                                    'btn-icon',
                                    'vote',
                                    { active: voted === -1 }
                                ),
                            },
                            dataset: {
                                id: comment.id,
                                type: 'comment',
                                intent: 'down',
                            },
                        },
                        [
                            span(String(comment.votes.down)),
                            voteIcon('down', i('.icon-thumbs-down')),
                        ]
                    ),
                    a(
                        {
                            attrs: {
                                class: classNames(
                                    'dib',
                                    'v-mid',
                                    'btn-icon',
                                    'vote',
                                    { active: voted === 1 }
                                ),
                            },
                            dataset: {
                                id: comment.id,
                                type: 'comment',
                                intent: 'up',
                            },
                        },
                        [
                            span(String(comment.votes.up)),
                            voteIcon('up', i('.icon-thumbs-up')),
                        ]
                    ),
                ]),
            ]),
        ]),
        div(
            '.pt1',
            virtualize(`<p class="ma0">${markdown.render(comment.content)}</p>`)
        ),
        repliesCount > 0
            ? div(
                  '.pt2.nested-replies',
                  replies.list.map(comment =>
                      commentView({
                          comment: state.own.comments.map[comment.id],
                          state,
                          noPadding: true,
                      })
                  )
              )
            : div(),
        ui.replyTo === comment.id
            ? div(
                  comment.reply_type == 'post' ? '.pl4' : '.pl0',
                  replyView(user, ui, 'comment', comment.id, true)
              )
            : div(),
    ]);
}
