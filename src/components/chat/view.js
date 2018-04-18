import {
    h,
    main,
    div,
    h4,
    input,
    ul,
    li,
    img,
    span,
    p,
    a,
    b,
    iframe,
    nav,
} from '@cycle/dom';
import markdown from 'markdown-it';
import emoji from 'markdown-it-emoji';
import mila from 'markdown-it-link-attributes';
import virtualize from 'snabbdom-virtualize';

var md = markdown({ html: false, linkify: true, typographer: false }).disable(
    'image'
);
md.use(emoji);
md.use(mila, {
    target: '_blank',
    rel: 'noopener',
    class: 'link blue hover-green',
});

const ROLES = {
    guest: 0,
    user: 0,
    'category-moderator': 1,
    'super-moderator': 2,
    administrator: 3,
    developer: 4,
};

const Loggers = {
    muted: (author, user) => {
        return `${author.username} ha silenciado a ${
            user.username
        } por 5 minutos.`;
    },
    banned: (author, user) => {
        return `${author.username} ha baneado a ${user.username} por 1 día.`;
    },
};

export function view(state$) {
    return state$.map(state => {
        const channel = state.config.viewer;
        const nrole = ROLES[state.user.role];

        return main('.flex.flex-column.flex-auto.bg-near-white', [
            div(
                '.mw9.w-100.center.sans-serif.flex.flex-auto.flex-column.flex-row-ns',
                [
                    div(
                        '.fade-in.w-100.pl4-ns.pt4-ns.pb4',
                        {
                            class: {
                                dn: channel.youtubePlayer === false,
                                flex: channel.youtubePlayer !== false,
                                'flex-column': channel.youtubePlayer !== false,
                            },
                        },
                        [
                            channel.youtubePlayer === false
                                ? div()
                                : iframe('.bn.br2.flex-auto', {
                                      style: {
                                          maxHeight: '450px',
                                      },
                                      props: {
                                          width: '100%',
                                          src: `https://www.youtube.com/embed/${
                                              channel.youtubeVideo
                                          }`,
                                          frameborder: 0,
                                      },
                                      attrs: {
                                          allowfullscreen: 'true',
                                      },
                                  }),
                            state.highlighted == false
                                ? div()
                                : div('.flex.w-100.pt4', [
                                      div('.bg-white.flex-auto.shadow.br2', [
                                          h4(
                                              '.ph4.pt3.ma0.silver.fw4',
                                              'Comentarios destacados'
                                          ),
                                          div('.pa2.ph4.pb3', [
                                              img('.dib.v-mid.br-100', {
                                                  attrs: {
                                                      src:
                                                          state.highlighted
                                                              .image == null ||
                                                          state.highlighted
                                                              .image == ''
                                                              ? 'images/avatar.svg'
                                                              : state
                                                                    .highlighted
                                                                    .image,
                                                  },
                                                  style: {
                                                      width: '2.5rem',
                                                      height: '2.5rem',
                                                  },
                                              }),
                                              div('.dib.v-mid.w-80.pl3', [
                                                  span(
                                                      '.b',
                                                      state.highlighted.username
                                                  ),
                                                  p(
                                                      '.ma0.mt2',
                                                      virtualize(
                                                          `<span>${md.renderInline(
                                                              state.highlighted
                                                                  .content
                                                          )}</span>`
                                                      )
                                                  ),
                                              ]),
                                          ]),
                                      ]),
                                  ]),
                        ]
                    ),
                    div('.w-100.flex-auto.flex.pa4-ns', [
                        div(
                            '.bg-white.br2.flex-auto.shadow.relative.flex.flex-column',
                            [
                                nav(
                                    '.pa3.pb0.ma0.tc.bb.b--black-05.relative',
                                    {
                                        class: {
                                            tc: !channel.youtubePlayer,
                                            tl: channel.youtubePlayer,
                                        },
                                        style: { flex: '0 1 auto' },
                                    },
                                    [
                                        h('div', [
                                            h('h2.f6', channel.title),
                                            h(
                                                'p.ma0',
                                                {
                                                    class: {
                                                        pb1:
                                                            channel.youtubePlayer,
                                                    },
                                                },
                                                channel.subtitle
                                            ),
                                        ]),
                                        nrole >= 3
                                            ? h(
                                                  'div',
                                                  {
                                                      attrs: {
                                                          class: channel.youtubePlayer
                                                              ? 'dropdown pb1'
                                                              : 'dropdown absolute top-1 left-1',
                                                      },
                                                  },
                                                  [
                                                      h(
                                                          'a.dropdown-toggle.dib.v-mid.link.black-60.dark.hover-near-black.pointer.ba.b--light-gray.br2.ph2.pv1',
                                                          {
                                                              attrs: {
                                                                  tabindex: 0,
                                                              },
                                                          },
                                                          h('span.fa.fa-cog')
                                                      ),
                                                      h(
                                                          'ul.menu.tl',
                                                          {
                                                              style: {
                                                                  width:
                                                                      '220px',
                                                              },
                                                          },
                                                          [
                                                              h(
                                                                  'li.menu-item',
                                                                  [
                                                                      h(
                                                                          'span.db.pb2.b',
                                                                          'Configuración de video'
                                                                      ),
                                                                      h(
                                                                          'div.pb2',
                                                                          [
                                                                              h(
                                                                                  'input.ml2.b--light-gray',
                                                                                  {
                                                                                      props: {
                                                                                          type:
                                                                                              'checkbox',
                                                                                          id:
                                                                                              'videoPlayer',
                                                                                          checked:
                                                                                              channel.youtubePlayer,
                                                                                      },
                                                                                  }
                                                                              ),
                                                                              h(
                                                                                  'span.ml2',
                                                                                  'Activar video'
                                                                              ),
                                                                          ]
                                                                      ),
                                                                      h(
                                                                          'input.pa1.input-reset.ba.bg-white.b--light-gray.near-black.br2.outline-0',
                                                                          {
                                                                              props: {
                                                                                  id:
                                                                                      'videoId',
                                                                                  type:
                                                                                      'text',
                                                                                  value:
                                                                                      channel.youtubeVideo,
                                                                                  placeholder:
                                                                                      'ID de Youtube',
                                                                              },
                                                                          }
                                                                      ),
                                                                  ]
                                                              ),
                                                          ]
                                                      ),
                                                  ]
                                              )
                                            : h('div.dn'),
                                        h(
                                            'div',
                                            {
                                                attrs: {
                                                    class:
                                                        'dib dropdown dropdown-right ' +
                                                        (channel.youtubePlayer
                                                            ? 'pb1'
                                                            : 'absolute top-1 right-1'),
                                                },
                                            },
                                            [
                                                a(
                                                    '.dropdown-toggle.dib.v-mid.link.black-60.dark.hover-near-black.pointer.ba.b--light-gray.br2.ph2.pv1.ml2',
                                                    { attrs: { tabindex: 0 } },
                                                    [
                                                        span(
                                                            '.bg-green.br-100.dib.mr2',
                                                            {
                                                                style: {
                                                                    width:
                                                                        '10px',
                                                                    height:
                                                                        '10px',
                                                                },
                                                            }
                                                        ),
                                                        span(
                                                            '.dn.dib-m.dib-l',
                                                            String(
                                                                state.online
                                                                    .length
                                                            ) +
                                                                (channel.youtubePlayer ==
                                                                false
                                                                    ? ` ${
                                                                          state
                                                                              .online
                                                                              .length >
                                                                          1
                                                                              ? 'conectados'
                                                                              : 'conectado'
                                                                      }`
                                                                    : '')
                                                        ),
                                                    ]
                                                ),
                                                h(
                                                    'ul.menu',
                                                    state.online.map(u => {
                                                        return li(
                                                            '.menu-item.tl',
                                                            [
                                                                img(
                                                                    '.dib.v-mid.br-100',
                                                                    {
                                                                        attrs: {
                                                                            src:
                                                                                u.image ==
                                                                                    null ||
                                                                                u.image ==
                                                                                    ''
                                                                                    ? '/images/seal.svg'
                                                                                    : u.image,
                                                                        },
                                                                        style: {
                                                                            width:
                                                                                '20px',
                                                                            height:
                                                                                '20px',
                                                                        },
                                                                    }
                                                                ),
                                                                span(
                                                                    '.dib.v-mid.ml2',
                                                                    u.username
                                                                ),
                                                            ]
                                                        );
                                                    })
                                                ),
                                            ]
                                        ),
                                    ]
                                ),
                                div(
                                    '.pv3.h6.overflow-x-hidden.overflow-auto.list-container.relative',
                                    { style: { flex: '1 1 auto' } },
                                    [
                                        ul(
                                            '.list.pa0.ma0',
                                            state.list.map(
                                                (command, index, list) => {
                                                    const type = command.type;
                                                    const data = command.data;
                                                    const scrollHook = {
                                                        hook: {
                                                            insert: vnode => {
                                                                if (
                                                                    state.lock
                                                                ) {
                                                                    vnode.elm.parentElement.parentElement.scrollTop =
                                                                        vnode.elm.parentElement.scrollHeight;
                                                                }
                                                            },
                                                        },
                                                    };

                                                    return commandView(
                                                        type,
                                                        data,
                                                        list,
                                                        index,
                                                        scrollHook,
                                                        nrole
                                                    );
                                                }
                                            )
                                        ),
                                    ]
                                ),
                                div(
                                    '.white.bg-blue.absolute.pa2.ph3.br2.f6',
                                    {
                                        class: { dn: state.missing === 0 },
                                        style: {
                                            bottom: '90px',
                                            right: '1rem',
                                        },
                                    },
                                    [b(state.missing), span(' nuevos mensajes')]
                                ),
                                div(
                                    '.pa3.bt.b--light-gray.relative',
                                    { style: { flex: '0 1 auto' } },
                                    [
                                        input(
                                            '.pa2.input-reset.ba.bg-white.b--light-gray.bw1.near-black.w-100.message.br2.outline-0',
                                            {
                                                props: {
                                                    autofocus: true,
                                                    type: 'text',
                                                    placeholder:
                                                        'Escribe tu mensaje aquí',
                                                    value: state.message,
                                                    disabled:
                                                        state.user._id ===
                                                        false,
                                                },
                                            }
                                        ),
                                        state.user._id === false
                                            ? div(
                                                  '.absolute.top-0.left-0.w-100.tc.bg-near-black.white-90.pv2.h-100',
                                                  [
                                                      div('.dib.v-mid.pv3', [
                                                          a(
                                                              '.link.underline.white',
                                                              {
                                                                  attrs: {
                                                                      href:
                                                                          'https://buldar.com',
                                                                  },
                                                              },
                                                              'Únete'
                                                          ),
                                                          ' o ',
                                                          a(
                                                              '.link.underline.white',
                                                              {
                                                                  attrs: {
                                                                      href:
                                                                          'https://buldar.com',
                                                                  },
                                                              },
                                                              'Inicia sesión'
                                                          ),
                                                          ' para escribir en el chat.',
                                                      ]),
                                                  ]
                                              )
                                            : null,
                                    ]
                                ),
                                div(
                                    '.br2.br--bottom.w-100.bg-black.white.pv3.tc',
                                    {
                                        class: {
                                            dn:
                                                state.config.newVersion !==
                                                true,
                                        },
                                    },
                                    [
                                        'Nueva versión disponible, ',
                                        a(
                                            '.pointer.underline.link.fullReload',
                                            'click aquí'
                                        ),
                                        ' para cargar actualizaciones.',
                                    ]
                                ),
                            ]
                        ),
                    ]),
                ]
            ),
        ]);
    });
}

function commandView(type, data, list, index, scrollHook, rolePower) {
    const simple = index > 0 && list[index - 1].data.user_id === data.user_id;
    const nrole = ROLES[data.role];
    const role = new Array(nrole).fill();

    switch (type) {
        case 'MESSAGE':
            return li('.dt.hover-bg-near-white.w-100.ph3.pv1', scrollHook, [
                div(
                    '.dtc.v-mid.tc',
                    { style: { width: '3rem' } },
                    simple == false
                        ? img('.br-100.w2', {
                              attrs: {
                                  src: data.image
                                      ? data.image
                                      : 'images/avatar.svg',
                              },
                          })
                        : h('small.light-silver', hour(data.timestamp))
                ),
                div('.dtc.v-top.pl3', [
                    simple == false
                        ? span('.fw6.lh-title.black.db.mb1', [
                              data.username,
                              role.length > 0
                                  ? span(
                                        '.blue.ml1',
                                        role.map(() =>
                                            span('.icon-star-filled')
                                        )
                                    )
                                  : span(),
                              span('.ml1.fw5.silver', hour(data.timestamp)),
                          ])
                        : span(),
                    p(
                        '.fw4.mt0.mb0.mid-gray',
                        virtualize(
                            `<span>${md.renderInline(data.content)}</span>`
                        )
                    ),
                ]),
                div('.dtc.v-mid.actions', [
                    rolePower > 0 && simple == false
                        ? span(
                              '.f6.mh1.silver.fr.fa.fa-microphone-slash.hover-red.pointer.id-action',
                              {
                                  dataset: { id: data.user_id, type: 'mute' },
                                  props: { title: 'Silenciar por 5 minutos' },
                              }
                          )
                        : span(),
                    rolePower > 1 && simple == false
                        ? span(
                              '.f6.mh1.silver.fr.fa.fa-ban.hover-red.pointer.id-action',
                              {
                                  dataset: { id: data.user_id, type: 'ban' },
                                  props: { title: 'Baneo por 1 día' },
                              }
                          )
                        : span(),
                    rolePower > 2 && '_id' in data
                        ? span(
                              '.f6.mh1.silver.fr.fa.fa-star.hover-gold.pointer.id-action',
                              {
                                  dataset: { id: data._id, type: 'highlight' },
                                  props: {
                                      title: 'Marcar como mensaje destacado',
                                  },
                              }
                          )
                        : span(),
                ]),
            ]);
        case 'LOG':
            return li('.dt.hover-bg-near-white.w-100.ph3.pv2', scrollHook, [
                div(
                    '.dtc.tc',
                    { style: { width: '3rem' } },
                    span('.f7.blue', hour(data.timestamp))
                ),
                div(
                    '.dtc.v-mid.pl3',
                    p(
                        '.f6.fw4.mt0.mb0.near-black',
                        Loggers[data.action](data.author, data.user)
                    )
                ),
            ]);
    }
}

function addZero(i) {
    if (i < 10) {
        i = '0' + i;
    }
    return i;
}

function hour(ts) {
    const d = new Date(ts);
    const h = addZero(d.getHours());
    const m = addZero(d.getMinutes());

    return h + ':' + m;
}
