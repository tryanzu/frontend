/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,})[ \.]*(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/,
  heading: /^ *(#{1,6}) +([^\n]+?) *#* *(?:\n+|$)/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: !this.options.sanitizer
          && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? this.options.sanitizer
          ? this.options.sanitizer(cap[0])
          : escape(cap[0])
        : cap[0]
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.text(escape(this.smartypants(cap[0])));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/---/g, '\u2014')
    // en-dashes
    .replace(/--/g, '\u2013')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  if (!this.options.mangle) return text;
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

Renderer.prototype.text = function(text) {
  return text;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  sanitizer: null,
  mangle: true,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

// @codekit-prepend "marked.js"
/*
 * angular-marked
 * (c) 2014 J. Harshbarger
 * Licensed MIT
 */

/* jshint undef: true, unused: true */
/* global angular:true */
/* global marked:true */
/* global module */
/* global require */

(function () {
  'use strict';

  /**
   * @ngdoc overview
   * @name index
   *
   * @description
   * AngularJS Markdown using [marked](https://github.com/chjj/marked).
   *
   * ## Why?
   *
   * I wanted to use [marked](https://github.com/chjj/marked) instead of [showdown](https://github.com/coreyti/showdown) as used in [angular-markdown-directive](https://github.com/btford/angular-markdown-directive) as well as expose the option to globally set defaults.
   *
   * ## How?
   *
   * - {@link hc.marked.directive:marked As a directive}
   * - {@link hc.marked.service:marked As a service}
   * - {@link hc.marked.service:markedProvider Set default options}
   *
   * @example

      Convert markdown to html at run time.  For example:

      <example module="app">
        <file name=".html">
          <form ng-controller="MainController">
            Markdown:<br />
            <textarea ng-model="my_markdown" cols="60" rows="5" class="span8" /><br />
            Output:<br />
            <div marked="my_markdown" />
          </form>
        </file>
        <file  name=".js">
          function MainController($scope) {
            $scope.my_markdown = "*This* **is** [markdown](https://daringfireball.net/projects/markdown/)";
          }
          angular.module('app', ['hc.marked']).controller('MainController', MainController);
        </file>
      </example>

    *
    */

    /**
     * @ngdoc overview
     * @name hc.marked
     * @description # angular-marked (core module)
       # Installation
      First include angular-marked.js in your HTML:

      ```js
        <script src="angular-marked.js">
      ```

      Then load the module in your application by adding it as a dependency:

      ```js
      angular.module('yourApp', ['hc.marked']);
      ```

      With that you're ready to get started!
     */

  if (typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = 'hc.marked';
  }

  angular.module('hc.marked', [])

    /**
    * @ngdoc service
    * @name hc.marked.service:marked
    * @requires $window
    * @description
    * A reference to the [marked](https://github.com/chjj/marked) parser.
    *
    * @example
    <example module="app">
      <file name=".html">
        <div ng-controller="MainController">
          html: {{html}}
        </div>
      </file>
      <file  name=".js">
        function MainController($scope, marked) {
          $scope.html = marked('#TEST');
        }
        angular.module('app', ['hc.marked']).controller('MainController', MainController);
      </file>
    </example>
   **/

   /**
   * @ngdoc service
   * @name hc.marked.service:markedProvider
   * @description
   * Use `markedProvider` to change the default behavior of the {@link hc.marked.service:marked marked} service.
   *
   * @example

    ## Example using [google-code-prettify syntax highlighter](https://code.google.com/p/google-code-prettify/) (must include google-code-prettify.js script).  Also works with [highlight.js Javascript syntax highlighter](http://highlightjs.org/).

    <example module="myApp">
    <file name=".js">
    angular.module('myApp', ['hc.marked'])
      .config(['markedProvider', function(markedProvider) {
        markedProvider.setOptions({
          gfm: true,
          tables: true,
          highlight: function (code) {
            return prettyPrintOne(code);
          }
        });
      }]);
    </file>
    <file name=".html">
      <marked>
      ```js
      angular.module('myApp', ['hc.marked'])
        .config(['markedProvider', function(markedProvider) {
          markedProvider.setOptions({
            gfm: true,
            tables: true,
            highlight: function (code) {
              return prettyPrintOne(code);
            }
          });
        }]);
      ```
      </marked>
    </file>
    </example>
  **/

  .provider('marked', function () {

    var self = this;

    /**
     * @ngdoc method
     * @name markedProvider#setOptions
     * @methodOf hc.marked.service:markedProvider
     *
     * @param {object} opts Default options for [marked](https://github.com/chjj/marked#options-1).
     */

    self.setRenderer = function (opts) {
      this.renderer = opts;
    };

    self.setOptions = function(opts) {  // Store options for later
      this.defaults = opts;
    };

    self.$get = ['$window', '$log', function ($window, $log) {

      var m =  (function() {

        if (typeof module !== 'undefined' && typeof exports === 'object') {
          return require('marked');
        } else {
          return $window.marked || marked;
        }

      })();

      if (angular.isUndefined(m)) {
        $log.error('angular-marked Error: marked not loaded.  See installation instructions.');
        return;
      }

      // override rendered markdown html
      // with custom definitions if defined
      if (self.renderer) {
        var r = new m.Renderer();
        var o = Object.keys(self.renderer),
            l = o.length;

        while (l--) {
          r[o[l]] = self.renderer[o[l]];
        }

        // add the new renderer to the options if need be
        self.defaults = self.defaults || {};
        self.defaults.renderer = r;
      }

      m.setOptions(self.defaults);

      return m;
    }];

  })

  // TODO: filter tests */
  //app.filter('marked', ['marked', function(marked) {
  //  return marked;
  //}]);

  /**
   * @ngdoc directive
   * @name hc.marked.directive:marked
   * @restrict AE
   * @element any
   *
   * @description
   * Compiles source test into HTML.
   *
   * @param {expression} marked The source text to be compiled.  If blank uses content as the source.
   * @param {expression=} opts Hash of options that override defaults.
   *
   * @example

     ## A simple block of text

      <example module="hc.marked">
        <file name="exampleA.html">
         * <marked>
         *   ### Markdown directive
         *
         *   *It works!*
         *
         *   *This* **is** [markdown](https://daringfireball.net/projects/markdown/) in the view.
         * </marked>
        </file>
      </example>

     ## Bind to a scope variable

      <example module="app">
        <file name="exampleB.html">
          <form ng-controller="MainController">
            Markdown:<br />
            <textarea ng-model="my_markdown" class="span8" cols="60" rows="5"></textarea><br />
            Output:<br />
            <blockquote marked="my_markdown"></blockquote>
          </form>
        </file>
        <file  name="exampleB.js">
          * function MainController($scope) {
          *     $scope.my_markdown = '*This* **is** [markdown](https://daringfireball.net/projects/markdown/)';
          *     $scope.my_markdown += ' in a scope variable';
          * }
          * angular.module('app', ['hc.marked']).controller('MainController', MainController);
        </file>
      </example>

      ## Include a markdown file:

       <example module="hc.marked">
         <file name="exampleC.html">
           <div marked src="'include.html'" />
         </file>
         * <file name="include.html">
         * *This* **is** [markdown](https://daringfireball.net/projects/markdown/) in a include file.
         * </file>
       </example>
   */

  .directive('marked', ['marked', '$templateRequest', function (marked, $templateRequest) {
    return {
      restrict: 'AE',
      replace: true,
      scope: {
        opts: '=',
        marked: '=',
        src: '='
      },
      link: function (scope, element, attrs) {
        set(scope.marked || element.text() || '');

        if (attrs.marked) {
          scope.$watch('marked', set);
        }

        if (attrs.src) {
          scope.$watch('src', function(src) {
            $templateRequest(src, true).then(function(response) {
              set(response);
            });
          });
        }

        function unindent(text) {
          if (!text) return text;

          var lines  = text
            .replace(/\t/g, '  ')
            .split(/\r?\n/);

          var i, l, min = null, line, len = lines.length;
          for (i = 0; i < len; i++) {
            line = lines[i];
            l = line.match(/^(\s*)/)[0].length;
            if (l === line.length) { continue; }
            min = (l < min || min === null) ? l : min;
          }

          if (min !== null && min > 0) {
            for (i = 0; i < len; i++) {
              lines[i] = lines[i].substr(min);
            }
          }
          return lines.join('\n');
        }

        function set(text) {
          text = unindent(text || '');
          element.html(marked(text, scope.opts || null));
        }

      }
    };
  }]);

}());

var iw = angular.module('idiotWizzy', []);

iw.directive('idiotWizzy', function ($window, $document) {
  return {
    restrict: 'E',
    scope: {
      model: '=',
      trigger: '=action'
    },
    templateUrl: '/js/partials/wizzy.html',
    link: function(scope, element, attrs) {
      var getSelection = function() {
        return window.getSelection();
      };

      scope.waiting = false;

      scope.publish = function() {
        if (scope.waiting == false) {
          scope.waiting = true;
          var http = scope.trigger();
          http.then(function(data) {
            // Allow to comment once again
            scope.waiting = false;
            scope.model = '';
          }, function(error) {});
        }
      };

      scope.apply = function(name) {
        // Get current text selection
        var selection = getSelection();
        var parentElement = selection.anchorNode.parentElement;
        if (parentElement == element[0].querySelector('.content')) {
          var range = selection.getRangeAt(0);
          var starts_at = range.startOffset;
          var ends_at   = range.endOffset;
          var content   = scope.model;
          console.log('starts: ' + starts_at + ' - ends_at: ' + ends_at);
          console.log(content.substr(starts_at, ends_at));

          markdown = content.substr(0, starts_at) + '*' + content.substr(starts_at, ends_at-starts_at) + '*' + content.substr(ends_at);
          scope.model = markdown;
        }
      };
    }
  };
});

iw.directive("contenteditable", function() {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, element, attrs, ngModel) {

      function read() {
        ngModel.$setViewValue(element.html());
      }

      ngModel.$render = function() {
        element.html(ngModel.$viewValue || "");
      };

      element.bind("blur keyup change", function() {
        scope.$apply(read);
      });
    }
  };
});

/* ng-infinite-scroll - v1.0.0 - 2013-02-23 */
var mod = angular.module('infinite-scroll', []);

mod.directive('infiniteScroll', ['$rootScope', '$window', '$timeout',
  function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
        $window = angular.element($window);
        scrollDistance = 0;
        if (attrs.infiniteScrollDistance != null) {
          scope.$watch(attrs.infiniteScrollDistance, function(value) {
            return scrollDistance = parseInt(value, 10);
          });
        }
        scrollEnabled = true;
        checkWhenEnabled = false;
        if (attrs.infiniteScrollDisabled != null) {
          scope.$watch(attrs.infiniteScrollDisabled, function(value) {
            scrollEnabled = !value;
            if (scrollEnabled && checkWhenEnabled) {
              checkWhenEnabled = false;
              return handler();
            }
          });
        }
        handler = function() {
          var elementBottom, remaining, shouldScroll, windowBottom;
          windowBottom = $($window).height() + $($window).scrollTop();
          elementBottom = $(elem).offset().top + $(elem).height();
          remaining = elementBottom - windowBottom;
          shouldScroll = remaining <= $($window).height() * scrollDistance;

          console.log('windowBottom:'+windowBottom);
          console.log('elementBottom:'+elementBottom);
          console.log('remaining:'+remaining);
          console.log('shouldScroll:'+shouldScroll);
          console.log('-');

          if (shouldScroll && scrollEnabled) {
            if ($rootScope.$$phase) {
              return scope.$eval(attrs.infiniteScroll);
            } else {
              return scope.$apply(attrs.infiniteScroll);
            }
          } else if (shouldScroll) {
            return checkWhenEnabled = true;
          }
        };
        $window.on('scroll', handler);
        scope.$on('$destroy', function() {
          return $window.off('scroll', handler);
        });
        return $timeout((function() {
          if (attrs.infiniteScrollImmediateCheck) {
            if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
              return handler();
            }
          } else {
            return handler();
          }
        }), 0);
      }
    };
  }
]);

/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.14.3 - 2015-10-23
 * License: MIT
 */
angular.module("ui.bootstrap",["ui.bootstrap.tpls","ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.dateparser","ui.bootstrap.position","ui.bootstrap.datepicker","ui.bootstrap.dropdown","ui.bootstrap.stackedMap","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.timepicker","ui.bootstrap.typeahead"]),angular.module("ui.bootstrap.tpls",["template/accordion/accordion-group.html","template/accordion/accordion.html","template/alert/alert.html","template/carousel/carousel.html","template/carousel/slide.html","template/datepicker/datepicker.html","template/datepicker/day.html","template/datepicker/month.html","template/datepicker/popup.html","template/datepicker/year.html","template/modal/backdrop.html","template/modal/window.html","template/pagination/pager.html","template/pagination/pagination.html","template/tooltip/tooltip-html-popup.html","template/tooltip/tooltip-popup.html","template/tooltip/tooltip-template-popup.html","template/popover/popover-html.html","template/popover/popover-template.html","template/popover/popover.html","template/progressbar/bar.html","template/progressbar/progress.html","template/progressbar/progressbar.html","template/rating/rating.html","template/tabs/tab.html","template/tabs/tabset.html","template/timepicker/timepicker.html","template/typeahead/typeahead-match.html","template/typeahead/typeahead-popup.html"]),angular.module("ui.bootstrap.collapse",[]).directive("uibCollapse",["$animate","$injector",function(a,b){var c=b.has("$animateCss")?b.get("$animateCss"):null;return{link:function(b,d,e){function f(){d.removeClass("collapse").addClass("collapsing").attr("aria-expanded",!0).attr("aria-hidden",!1),c?c(d,{addClass:"in",easing:"ease",to:{height:d[0].scrollHeight+"px"}}).start()["finally"](g):a.addClass(d,"in",{to:{height:d[0].scrollHeight+"px"}}).then(g)}function g(){d.removeClass("collapsing").addClass("collapse").css({height:"auto"})}function h(){return d.hasClass("collapse")||d.hasClass("in")?(d.css({height:d[0].scrollHeight+"px"}).removeClass("collapse").addClass("collapsing").attr("aria-expanded",!1).attr("aria-hidden",!0),void(c?c(d,{removeClass:"in",to:{height:"0"}}).start()["finally"](i):a.removeClass(d,"in",{to:{height:"0"}}).then(i))):i()}function i(){d.css({height:"0"}),d.removeClass("collapsing").addClass("collapse")}b.$watch(e.uibCollapse,function(a){a?h():f()})}}}]),angular.module("ui.bootstrap.collapse").value("$collapseSuppressWarning",!1).directive("collapse",["$animate","$injector","$log","$collapseSuppressWarning",function(a,b,c,d){var e=b.has("$animateCss")?b.get("$animateCss"):null;return{link:function(b,f,g){function h(){f.removeClass("collapse").addClass("collapsing").attr("aria-expanded",!0).attr("aria-hidden",!1),e?e(f,{easing:"ease",to:{height:f[0].scrollHeight+"px"}}).start().done(i):a.animate(f,{},{height:f[0].scrollHeight+"px"}).then(i)}function i(){f.removeClass("collapsing").addClass("collapse in").css({height:"auto"})}function j(){return f.hasClass("collapse")||f.hasClass("in")?(f.css({height:f[0].scrollHeight+"px"}).removeClass("collapse in").addClass("collapsing").attr("aria-expanded",!1).attr("aria-hidden",!0),void(e?e(f,{to:{height:"0"}}).start().done(k):a.animate(f,{},{height:"0"}).then(k))):k()}function k(){f.css({height:"0"}),f.removeClass("collapsing").addClass("collapse")}d||c.warn("collapse is now deprecated. Use uib-collapse instead."),b.$watch(g.collapse,function(a){a?j():h()})}}}]),angular.module("ui.bootstrap.accordion",["ui.bootstrap.collapse"]).constant("uibAccordionConfig",{closeOthers:!0}).controller("UibAccordionController",["$scope","$attrs","uibAccordionConfig",function(a,b,c){this.groups=[],this.closeOthers=function(d){var e=angular.isDefined(b.closeOthers)?a.$eval(b.closeOthers):c.closeOthers;e&&angular.forEach(this.groups,function(a){a!==d&&(a.isOpen=!1)})},this.addGroup=function(a){var b=this;this.groups.push(a),a.$on("$destroy",function(c){b.removeGroup(a)})},this.removeGroup=function(a){var b=this.groups.indexOf(a);-1!==b&&this.groups.splice(b,1)}}]).directive("uibAccordion",function(){return{controller:"UibAccordionController",controllerAs:"accordion",transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/accordion/accordion.html"}}}).directive("uibAccordionGroup",function(){return{require:"^uibAccordion",transclude:!0,replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/accordion/accordion-group.html"},scope:{heading:"@",isOpen:"=?",isDisabled:"=?"},controller:function(){this.setHeading=function(a){this.heading=a}},link:function(a,b,c,d){d.addGroup(a),a.openClass=c.openClass||"panel-open",a.panelClass=c.panelClass,a.$watch("isOpen",function(c){b.toggleClass(a.openClass,!!c),c&&d.closeOthers(a)}),a.toggleOpen=function(b){a.isDisabled||b&&32!==b.which||(a.isOpen=!a.isOpen)}}}}).directive("uibAccordionHeading",function(){return{transclude:!0,template:"",replace:!0,require:"^uibAccordionGroup",link:function(a,b,c,d,e){d.setHeading(e(a,angular.noop))}}}).directive("uibAccordionTransclude",function(){return{require:["?^uibAccordionGroup","?^accordionGroup"],link:function(a,b,c,d){d=d[0]?d[0]:d[1],a.$watch(function(){return d[c.uibAccordionTransclude]},function(a){a&&(b.find("span").html(""),b.find("span").append(a))})}}}),angular.module("ui.bootstrap.accordion").value("$accordionSuppressWarning",!1).controller("AccordionController",["$scope","$attrs","$controller","$log","$accordionSuppressWarning",function(a,b,c,d,e){e||d.warn("AccordionController is now deprecated. Use UibAccordionController instead."),angular.extend(this,c("UibAccordionController",{$scope:a,$attrs:b}))}]).directive("accordion",["$log","$accordionSuppressWarning",function(a,b){return{restrict:"EA",controller:"AccordionController",controllerAs:"accordion",transclude:!0,replace:!1,templateUrl:function(a,b){return b.templateUrl||"template/accordion/accordion.html"},link:function(){b||a.warn("accordion is now deprecated. Use uib-accordion instead.")}}}]).directive("accordionGroup",["$log","$accordionSuppressWarning",function(a,b){return{require:"^accordion",restrict:"EA",transclude:!0,replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/accordion/accordion-group.html"},scope:{heading:"@",isOpen:"=?",isDisabled:"=?"},controller:function(){this.setHeading=function(a){this.heading=a}},link:function(c,d,e,f){b||a.warn("accordion-group is now deprecated. Use uib-accordion-group instead."),f.addGroup(c),c.openClass=e.openClass||"panel-open",c.panelClass=e.panelClass,c.$watch("isOpen",function(a){d.toggleClass(c.openClass,!!a),a&&f.closeOthers(c)}),c.toggleOpen=function(a){c.isDisabled||a&&32!==a.which||(c.isOpen=!c.isOpen)}}}}]).directive("accordionHeading",["$log","$accordionSuppressWarning",function(a,b){return{restrict:"EA",transclude:!0,template:"",replace:!0,require:"^accordionGroup",link:function(c,d,e,f,g){b||a.warn("accordion-heading is now deprecated. Use uib-accordion-heading instead."),f.setHeading(g(c,angular.noop))}}}]).directive("accordionTransclude",["$log","$accordionSuppressWarning",function(a,b){return{require:"^accordionGroup",link:function(c,d,e,f){b||a.warn("accordion-transclude is now deprecated. Use uib-accordion-transclude instead."),c.$watch(function(){return f[e.accordionTransclude]},function(a){a&&(d.find("span").html(""),d.find("span").append(a))})}}}]),angular.module("ui.bootstrap.alert",[]).controller("UibAlertController",["$scope","$attrs","$interpolate","$timeout",function(a,b,c,d){a.closeable=!!b.close;var e=angular.isDefined(b.dismissOnTimeout)?c(b.dismissOnTimeout)(a.$parent):null;e&&d(function(){a.close()},parseInt(e,10))}]).directive("uibAlert",function(){return{controller:"UibAlertController",controllerAs:"alert",templateUrl:function(a,b){return b.templateUrl||"template/alert/alert.html"},transclude:!0,replace:!0,scope:{type:"@",close:"&"}}}),angular.module("ui.bootstrap.alert").value("$alertSuppressWarning",!1).controller("AlertController",["$scope","$attrs","$controller","$log","$alertSuppressWarning",function(a,b,c,d,e){e||d.warn("AlertController is now deprecated. Use UibAlertController instead."),angular.extend(this,c("UibAlertController",{$scope:a,$attrs:b}))}]).directive("alert",["$log","$alertSuppressWarning",function(a,b){return{controller:"AlertController",controllerAs:"alert",templateUrl:function(a,b){return b.templateUrl||"template/alert/alert.html"},transclude:!0,replace:!0,scope:{type:"@",close:"&"},link:function(){b||a.warn("alert is now deprecated. Use uib-alert instead.")}}}]),angular.module("ui.bootstrap.buttons",[]).constant("uibButtonConfig",{activeClass:"active",toggleEvent:"click"}).controller("UibButtonsController",["uibButtonConfig",function(a){this.activeClass=a.activeClass||"active",this.toggleEvent=a.toggleEvent||"click"}]).directive("uibBtnRadio",function(){return{require:["uibBtnRadio","ngModel"],controller:"UibButtonsController",controllerAs:"buttons",link:function(a,b,c,d){var e=d[0],f=d[1];b.find("input").css({display:"none"}),f.$render=function(){b.toggleClass(e.activeClass,angular.equals(f.$modelValue,a.$eval(c.uibBtnRadio)))},b.on(e.toggleEvent,function(){if(!c.disabled){var d=b.hasClass(e.activeClass);(!d||angular.isDefined(c.uncheckable))&&a.$apply(function(){f.$setViewValue(d?null:a.$eval(c.uibBtnRadio)),f.$render()})}})}}}).directive("uibBtnCheckbox",function(){return{require:["uibBtnCheckbox","ngModel"],controller:"UibButtonsController",controllerAs:"button",link:function(a,b,c,d){function e(){return g(c.btnCheckboxTrue,!0)}function f(){return g(c.btnCheckboxFalse,!1)}function g(b,c){return angular.isDefined(b)?a.$eval(b):c}var h=d[0],i=d[1];b.find("input").css({display:"none"}),i.$render=function(){b.toggleClass(h.activeClass,angular.equals(i.$modelValue,e()))},b.on(h.toggleEvent,function(){c.disabled||a.$apply(function(){i.$setViewValue(b.hasClass(h.activeClass)?f():e()),i.$render()})})}}}),angular.module("ui.bootstrap.buttons").value("$buttonsSuppressWarning",!1).controller("ButtonsController",["$controller","$log","$buttonsSuppressWarning",function(a,b,c){c||b.warn("ButtonsController is now deprecated. Use UibButtonsController instead."),angular.extend(this,a("UibButtonsController"))}]).directive("btnRadio",["$log","$buttonsSuppressWarning",function(a,b){return{require:["btnRadio","ngModel"],controller:"ButtonsController",controllerAs:"buttons",link:function(c,d,e,f){b||a.warn("btn-radio is now deprecated. Use uib-btn-radio instead.");var g=f[0],h=f[1];d.find("input").css({display:"none"}),h.$render=function(){d.toggleClass(g.activeClass,angular.equals(h.$modelValue,c.$eval(e.btnRadio)))},d.bind(g.toggleEvent,function(){if(!e.disabled){var a=d.hasClass(g.activeClass);(!a||angular.isDefined(e.uncheckable))&&c.$apply(function(){h.$setViewValue(a?null:c.$eval(e.btnRadio)),h.$render()})}})}}}]).directive("btnCheckbox",["$document","$log","$buttonsSuppressWarning",function(a,b,c){return{require:["btnCheckbox","ngModel"],controller:"ButtonsController",controllerAs:"button",link:function(d,e,f,g){function h(){return j(f.btnCheckboxTrue,!0)}function i(){return j(f.btnCheckboxFalse,!1)}function j(a,b){var c=d.$eval(a);return angular.isDefined(c)?c:b}c||b.warn("btn-checkbox is now deprecated. Use uib-btn-checkbox instead.");var k=g[0],l=g[1];e.find("input").css({display:"none"}),l.$render=function(){e.toggleClass(k.activeClass,angular.equals(l.$modelValue,h()))},e.bind(k.toggleEvent,function(){f.disabled||d.$apply(function(){l.$setViewValue(e.hasClass(k.activeClass)?i():h()),l.$render()})}),e.on("keypress",function(b){f.disabled||32!==b.which||a[0].activeElement!==e[0]||d.$apply(function(){l.$setViewValue(e.hasClass(k.activeClass)?i():h()),l.$render()})})}}}]),angular.module("ui.bootstrap.carousel",[]).controller("UibCarouselController",["$scope","$element","$interval","$animate",function(a,b,c,d){function e(b,c,e){s||(angular.extend(b,{direction:e,active:!0}),angular.extend(m.currentSlide||{},{direction:e,active:!1}),d.enabled()&&!a.noTransition&&!a.$currentTransition&&b.$element&&m.slides.length>1&&(b.$element.data(q,b.direction),m.currentSlide&&m.currentSlide.$element&&m.currentSlide.$element.data(q,b.direction),a.$currentTransition=!0,o?d.on("addClass",b.$element,function(b,c){"close"===c&&(a.$currentTransition=null,d.off("addClass",b))}):b.$element.one("$animate:close",function(){a.$currentTransition=null})),m.currentSlide=b,r=c,g())}function f(a){if(angular.isUndefined(n[a].index))return n[a];var b;n.length;for(b=0;b<n.length;++b)if(n[b].index==a)return n[b]}function g(){h();var b=+a.interval;!isNaN(b)&&b>0&&(k=c(i,b))}function h(){k&&(c.cancel(k),k=null)}function i(){var b=+a.interval;l&&!isNaN(b)&&b>0&&n.length?a.next():a.pause()}function j(b){b.length||(a.$currentTransition=null)}var k,l,m=this,n=m.slides=a.slides=[],o=angular.version.minor>=4,p="uib-noTransition",q="uib-slideDirection",r=-1;m.currentSlide=null;var s=!1;m.select=a.select=function(b,c){var d=a.indexOfSlide(b);void 0===c&&(c=d>m.getCurrentIndex()?"next":"prev"),b&&b!==m.currentSlide&&!a.$currentTransition&&e(b,d,c)},a.$on("$destroy",function(){s=!0}),m.getCurrentIndex=function(){return m.currentSlide&&angular.isDefined(m.currentSlide.index)?+m.currentSlide.index:r},a.indexOfSlide=function(a){return angular.isDefined(a.index)?+a.index:n.indexOf(a)},a.next=function(){var b=(m.getCurrentIndex()+1)%n.length;return 0===b&&a.noWrap()?void a.pause():m.select(f(b),"next")},a.prev=function(){var b=m.getCurrentIndex()-1<0?n.length-1:m.getCurrentIndex()-1;return a.noWrap()&&b===n.length-1?void a.pause():m.select(f(b),"prev")},a.isActive=function(a){return m.currentSlide===a},a.$watch("interval",g),a.$watchCollection("slides",j),a.$on("$destroy",h),a.play=function(){l||(l=!0,g())},a.pause=function(){a.noPause||(l=!1,h())},m.addSlide=function(b,c){b.$element=c,n.push(b),1===n.length||b.active?(m.select(n[n.length-1]),1===n.length&&a.play()):b.active=!1},m.removeSlide=function(a){angular.isDefined(a.index)&&n.sort(function(a,b){return+a.index>+b.index});var b=n.indexOf(a);n.splice(b,1),n.length>0&&a.active?b>=n.length?m.select(n[b-1]):m.select(n[b]):r>b&&r--,0===n.length&&(m.currentSlide=null)},a.$watch("noTransition",function(a){b.data(p,a)})}]).directive("uibCarousel",[function(){return{transclude:!0,replace:!0,controller:"UibCarouselController",controllerAs:"carousel",require:"carousel",templateUrl:function(a,b){return b.templateUrl||"template/carousel/carousel.html"},scope:{interval:"=",noTransition:"=",noPause:"=",noWrap:"&"}}}]).directive("uibSlide",function(){return{require:"^uibCarousel",restrict:"EA",transclude:!0,replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/carousel/slide.html"},scope:{active:"=?",actual:"=?",index:"=?"},link:function(a,b,c,d){d.addSlide(a,b),a.$on("$destroy",function(){d.removeSlide(a)}),a.$watch("active",function(b){b&&d.select(a)})}}}).animation(".item",["$injector","$animate",function(a,b){function c(a,b,c){a.removeClass(b),c&&c()}var d="uib-noTransition",e="uib-slideDirection",f=null;return a.has("$animateCss")&&(f=a.get("$animateCss")),{beforeAddClass:function(a,g,h){if("active"==g&&a.parent()&&a.parent().parent()&&!a.parent().parent().data(d)){var i=!1,j=a.data(e),k="next"==j?"left":"right",l=c.bind(this,a,k+" "+j,h);return a.addClass(j),f?f(a,{addClass:k}).start().done(l):b.addClass(a,k).then(function(){i||l(),h()}),function(){i=!0}}h()},beforeRemoveClass:function(a,g,h){if("active"===g&&a.parent()&&a.parent().parent()&&!a.parent().parent().data(d)){var i=!1,j=a.data(e),k="next"==j?"left":"right",l=c.bind(this,a,k,h);return f?f(a,{addClass:k}).start().done(l):b.addClass(a,k).then(function(){i||l(),h()}),function(){i=!0}}h()}}}]),angular.module("ui.bootstrap.carousel").value("$carouselSuppressWarning",!1).controller("CarouselController",["$scope","$element","$controller","$log","$carouselSuppressWarning",function(a,b,c,d,e){e||d.warn("CarouselController is now deprecated. Use UibCarouselController instead."),angular.extend(this,c("UibCarouselController",{$scope:a,$element:b}))}]).directive("carousel",["$log","$carouselSuppressWarning",function(a,b){return{transclude:!0,replace:!0,controller:"CarouselController",controllerAs:"carousel",require:"carousel",templateUrl:function(a,b){return b.templateUrl||"template/carousel/carousel.html"},scope:{interval:"=",noTransition:"=",noPause:"=",noWrap:"&"},link:function(){b||a.warn("carousel is now deprecated. Use uib-carousel instead.")}}}]).directive("slide",["$log","$carouselSuppressWarning",function(a,b){return{require:"^carousel",transclude:!0,replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/carousel/slide.html"},scope:{active:"=?",actual:"=?",index:"=?"},link:function(c,d,e,f){b||a.warn("slide is now deprecated. Use uib-slide instead."),f.addSlide(c,d),c.$on("$destroy",function(){f.removeSlide(c)}),c.$watch("active",function(a){a&&f.select(c)})}}}]),angular.module("ui.bootstrap.dateparser",[]).service("uibDateParser",["$log","$locale","orderByFilter",function(a,b,c){function d(a){var b=[],d=a.split("");return angular.forEach(g,function(c,e){var f=a.indexOf(e);if(f>-1){a=a.split(""),d[f]="("+c.regex+")",a[f]="$";for(var g=f+1,h=f+e.length;h>g;g++)d[g]="",a[g]="$";a=a.join(""),b.push({index:f,apply:c.apply})}}),{regex:new RegExp("^"+d.join("")+"$"),map:c(b,"index")}}function e(a,b,c){return 1>c?!1:1===b&&c>28?29===c&&(a%4===0&&a%100!==0||a%400===0):3===b||5===b||8===b||10===b?31>c:!0}var f,g,h=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;this.init=function(){f=b.id,this.parsers={},g={yyyy:{regex:"\\d{4}",apply:function(a){this.year=+a}},yy:{regex:"\\d{2}",apply:function(a){this.year=+a+2e3}},y:{regex:"\\d{1,4}",apply:function(a){this.year=+a}},MMMM:{regex:b.DATETIME_FORMATS.MONTH.join("|"),apply:function(a){this.month=b.DATETIME_FORMATS.MONTH.indexOf(a)}},MMM:{regex:b.DATETIME_FORMATS.SHORTMONTH.join("|"),apply:function(a){this.month=b.DATETIME_FORMATS.SHORTMONTH.indexOf(a)}},MM:{regex:"0[1-9]|1[0-2]",apply:function(a){this.month=a-1}},M:{regex:"[1-9]|1[0-2]",apply:function(a){this.month=a-1}},dd:{regex:"[0-2][0-9]{1}|3[0-1]{1}",apply:function(a){this.date=+a}},d:{regex:"[1-2]?[0-9]{1}|3[0-1]{1}",apply:function(a){this.date=+a}},EEEE:{regex:b.DATETIME_FORMATS.DAY.join("|")},EEE:{regex:b.DATETIME_FORMATS.SHORTDAY.join("|")},HH:{regex:"(?:0|1)[0-9]|2[0-3]",apply:function(a){this.hours=+a}},hh:{regex:"0[0-9]|1[0-2]",apply:function(a){this.hours=+a}},H:{regex:"1?[0-9]|2[0-3]",apply:function(a){this.hours=+a}},h:{regex:"[0-9]|1[0-2]",apply:function(a){this.hours=+a}},mm:{regex:"[0-5][0-9]",apply:function(a){this.minutes=+a}},m:{regex:"[0-9]|[1-5][0-9]",apply:function(a){this.minutes=+a}},sss:{regex:"[0-9][0-9][0-9]",apply:function(a){this.milliseconds=+a}},ss:{regex:"[0-5][0-9]",apply:function(a){this.seconds=+a}},s:{regex:"[0-9]|[1-5][0-9]",apply:function(a){this.seconds=+a}},a:{regex:b.DATETIME_FORMATS.AMPMS.join("|"),apply:function(a){12===this.hours&&(this.hours=0),"PM"===a&&(this.hours+=12)}}}},this.init(),this.parse=function(c,g,i){if(!angular.isString(c)||!g)return c;g=b.DATETIME_FORMATS[g]||g,g=g.replace(h,"\\$&"),b.id!==f&&this.init(),this.parsers[g]||(this.parsers[g]=d(g));var j=this.parsers[g],k=j.regex,l=j.map,m=c.match(k);if(m&&m.length){var n,o;angular.isDate(i)&&!isNaN(i.getTime())?n={year:i.getFullYear(),month:i.getMonth(),date:i.getDate(),hours:i.getHours(),minutes:i.getMinutes(),seconds:i.getSeconds(),milliseconds:i.getMilliseconds()}:(i&&a.warn("dateparser:","baseDate is not a valid date"),n={year:1900,month:0,date:1,hours:0,minutes:0,seconds:0,milliseconds:0});for(var p=1,q=m.length;q>p;p++){var r=l[p-1];r.apply&&r.apply.call(n,m[p])}return e(n.year,n.month,n.date)&&(angular.isDate(i)&&!isNaN(i.getTime())?(o=new Date(i),o.setFullYear(n.year,n.month,n.date,n.hours,n.minutes,n.seconds,n.milliseconds||0)):o=new Date(n.year,n.month,n.date,n.hours,n.minutes,n.seconds,n.milliseconds||0)),o}}}]),angular.module("ui.bootstrap.dateparser").value("$dateParserSuppressWarning",!1).service("dateParser",["$log","$dateParserSuppressWarning","uibDateParser",function(a,b,c){b||a.warn("dateParser is now deprecated. Use uibDateParser instead."),angular.extend(this,c)}]),angular.module("ui.bootstrap.position",[]).factory("$uibPosition",["$document","$window",function(a,b){function c(a,c){return a.currentStyle?a.currentStyle[c]:b.getComputedStyle?b.getComputedStyle(a)[c]:a.style[c]}function d(a){return"static"===(c(a,"position")||"static")}var e=function(b){for(var c=a[0],e=b.offsetParent||c;e&&e!==c&&d(e);)e=e.offsetParent;return e||c};return{position:function(b){var c=this.offset(b),d={top:0,left:0},f=e(b[0]);f!=a[0]&&(d=this.offset(angular.element(f)),d.top+=f.clientTop-f.scrollTop,d.left+=f.clientLeft-f.scrollLeft);var g=b[0].getBoundingClientRect();return{width:g.width||b.prop("offsetWidth"),height:g.height||b.prop("offsetHeight"),top:c.top-d.top,left:c.left-d.left}},offset:function(c){var d=c[0].getBoundingClientRect();return{width:d.width||c.prop("offsetWidth"),height:d.height||c.prop("offsetHeight"),top:d.top+(b.pageYOffset||a[0].documentElement.scrollTop),left:d.left+(b.pageXOffset||a[0].documentElement.scrollLeft)}},positionElements:function(a,b,c,d){var e,f,g,h,i=c.split("-"),j=i[0],k=i[1]||"center";e=d?this.offset(a):this.position(a),f=b.prop("offsetWidth"),g=b.prop("offsetHeight");var l={center:function(){return e.left+e.width/2-f/2},left:function(){return e.left},right:function(){return e.left+e.width}},m={center:function(){return e.top+e.height/2-g/2},top:function(){return e.top},bottom:function(){return e.top+e.height}};switch(j){case"right":h={top:m[k](),left:l[j]()};break;case"left":h={top:m[k](),left:e.left-f};break;case"bottom":h={top:m[j](),left:l[k]()};break;default:h={top:e.top-g,left:l[k]()}}return h}}}]),angular.module("ui.bootstrap.position").value("$positionSuppressWarning",!1).service("$position",["$log","$positionSuppressWarning","$uibPosition",function(a,b,c){b||a.warn("$position is now deprecated. Use $uibPosition instead."),angular.extend(this,c)}]),angular.module("ui.bootstrap.datepicker",["ui.bootstrap.dateparser","ui.bootstrap.position"]).value("$datepickerSuppressError",!1).constant("uibDatepickerConfig",{formatDay:"dd",formatMonth:"MMMM",formatYear:"yyyy",formatDayHeader:"EEE",formatDayTitle:"MMMM yyyy",formatMonthTitle:"yyyy",datepickerMode:"day",minMode:"day",maxMode:"year",showWeeks:!0,startingDay:0,yearRange:20,minDate:null,maxDate:null,shortcutPropagation:!1}).controller("UibDatepickerController",["$scope","$attrs","$parse","$interpolate","$log","dateFilter","uibDatepickerConfig","$datepickerSuppressError",function(a,b,c,d,e,f,g,h){var i=this,j={$setViewValue:angular.noop};this.modes=["day","month","year"],angular.forEach(["formatDay","formatMonth","formatYear","formatDayHeader","formatDayTitle","formatMonthTitle","showWeeks","startingDay","yearRange","shortcutPropagation"],function(c,e){i[c]=angular.isDefined(b[c])?6>e?d(b[c])(a.$parent):a.$parent.$eval(b[c]):g[c]}),angular.forEach(["minDate","maxDate"],function(d){b[d]?a.$parent.$watch(c(b[d]),function(a){i[d]=a?new Date(a):null,i.refreshView()}):i[d]=g[d]?new Date(g[d]):null}),angular.forEach(["minMode","maxMode"],function(d){b[d]?a.$parent.$watch(c(b[d]),function(c){i[d]=angular.isDefined(c)?c:b[d],a[d]=i[d],("minMode"==d&&i.modes.indexOf(a.datepickerMode)<i.modes.indexOf(i[d])||"maxMode"==d&&i.modes.indexOf(a.datepickerMode)>i.modes.indexOf(i[d]))&&(a.datepickerMode=i[d])}):(i[d]=g[d]||null,a[d]=i[d])}),a.datepickerMode=a.datepickerMode||g.datepickerMode,a.uniqueId="datepicker-"+a.$id+"-"+Math.floor(1e4*Math.random()),angular.isDefined(b.initDate)?(this.activeDate=a.$parent.$eval(b.initDate)||new Date,a.$parent.$watch(b.initDate,function(a){a&&(j.$isEmpty(j.$modelValue)||j.$invalid)&&(i.activeDate=a,i.refreshView())})):this.activeDate=new Date,a.isActive=function(b){return 0===i.compare(b.date,i.activeDate)?(a.activeDateId=b.uid,!0):!1},this.init=function(a){j=a,j.$render=function(){i.render()}},this.render=function(){if(j.$viewValue){var a=new Date(j.$viewValue),b=!isNaN(a);b?this.activeDate=a:h||e.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')}this.refreshView()},this.refreshView=function(){if(this.element){this._refreshView();var a=j.$viewValue?new Date(j.$viewValue):null;j.$setValidity("dateDisabled",!a||this.element&&!this.isDisabled(a))}},this.createDateObject=function(a,b){var c=j.$viewValue?new Date(j.$viewValue):null;return{date:a,label:f(a,b),selected:c&&0===this.compare(a,c),disabled:this.isDisabled(a),current:0===this.compare(a,new Date),customClass:this.customClass(a)}},this.isDisabled=function(c){return this.minDate&&this.compare(c,this.minDate)<0||this.maxDate&&this.compare(c,this.maxDate)>0||b.dateDisabled&&a.dateDisabled({date:c,mode:a.datepickerMode})},this.customClass=function(b){return a.customClass({date:b,mode:a.datepickerMode})},this.split=function(a,b){for(var c=[];a.length>0;)c.push(a.splice(0,b));return c},a.select=function(b){if(a.datepickerMode===i.minMode){var c=j.$viewValue?new Date(j.$viewValue):new Date(0,0,0,0,0,0,0);c.setFullYear(b.getFullYear(),b.getMonth(),b.getDate()),j.$setViewValue(c),j.$render()}else i.activeDate=b,a.datepickerMode=i.modes[i.modes.indexOf(a.datepickerMode)-1]},a.move=function(a){var b=i.activeDate.getFullYear()+a*(i.step.years||0),c=i.activeDate.getMonth()+a*(i.step.months||0);i.activeDate.setFullYear(b,c,1),i.refreshView()},a.toggleMode=function(b){b=b||1,a.datepickerMode===i.maxMode&&1===b||a.datepickerMode===i.minMode&&-1===b||(a.datepickerMode=i.modes[i.modes.indexOf(a.datepickerMode)+b])},a.keys={13:"enter",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down"};var k=function(){i.element[0].focus()};a.$on("uib:datepicker.focus",k),a.keydown=function(b){var c=a.keys[b.which];if(c&&!b.shiftKey&&!b.altKey)if(b.preventDefault(),i.shortcutPropagation||b.stopPropagation(),"enter"===c||"space"===c){if(i.isDisabled(i.activeDate))return;a.select(i.activeDate)}else!b.ctrlKey||"up"!==c&&"down"!==c?(i.handleKeyDown(c,b),i.refreshView()):a.toggleMode("up"===c?1:-1)}}]).controller("UibDaypickerController",["$scope","$element","dateFilter",function(a,b,c){function d(a,b){return 1!==b||a%4!==0||a%100===0&&a%400!==0?f[b]:29}function e(a){var b=new Date(a);b.setDate(b.getDate()+4-(b.getDay()||7));var c=b.getTime();return b.setMonth(0),b.setDate(1),Math.floor(Math.round((c-b)/864e5)/7)+1}var f=[31,28,31,30,31,30,31,31,30,31,30,31];this.step={months:1},this.element=b,this.init=function(b){angular.extend(b,this),a.showWeeks=b.showWeeks,b.refreshView()},this.getDates=function(a,b){for(var c,d=new Array(b),e=new Date(a),f=0;b>f;)c=new Date(e),d[f++]=c,e.setDate(e.getDate()+1);return d},this._refreshView=function(){var b=this.activeDate.getFullYear(),d=this.activeDate.getMonth(),f=new Date(this.activeDate);f.setFullYear(b,d,1);var g=this.startingDay-f.getDay(),h=g>0?7-g:-g,i=new Date(f);h>0&&i.setDate(-h+1);for(var j=this.getDates(i,42),k=0;42>k;k++)j[k]=angular.extend(this.createDateObject(j[k],this.formatDay),{secondary:j[k].getMonth()!==d,uid:a.uniqueId+"-"+k});a.labels=new Array(7);for(var l=0;7>l;l++)a.labels[l]={abbr:c(j[l].date,this.formatDayHeader),full:c(j[l].date,"EEEE")};if(a.title=c(this.activeDate,this.formatDayTitle),a.rows=this.split(j,7),a.showWeeks){a.weekNumbers=[];for(var m=(11-this.startingDay)%7,n=a.rows.length,o=0;n>o;o++)a.weekNumbers.push(e(a.rows[o][m].date))}},this.compare=function(a,b){return new Date(a.getFullYear(),a.getMonth(),a.getDate())-new Date(b.getFullYear(),b.getMonth(),b.getDate())},this.handleKeyDown=function(a,b){var c=this.activeDate.getDate();if("left"===a)c-=1;else if("up"===a)c-=7;else if("right"===a)c+=1;else if("down"===a)c+=7;else if("pageup"===a||"pagedown"===a){var e=this.activeDate.getMonth()+("pageup"===a?-1:1);this.activeDate.setMonth(e,1),c=Math.min(d(this.activeDate.getFullYear(),this.activeDate.getMonth()),c)}else"home"===a?c=1:"end"===a&&(c=d(this.activeDate.getFullYear(),this.activeDate.getMonth()));this.activeDate.setDate(c)}}]).controller("UibMonthpickerController",["$scope","$element","dateFilter",function(a,b,c){this.step={years:1},this.element=b,this.init=function(a){angular.extend(a,this),a.refreshView()},this._refreshView=function(){for(var b,d=new Array(12),e=this.activeDate.getFullYear(),f=0;12>f;f++)b=new Date(this.activeDate),b.setFullYear(e,f,1),d[f]=angular.extend(this.createDateObject(b,this.formatMonth),{uid:a.uniqueId+"-"+f});a.title=c(this.activeDate,this.formatMonthTitle),a.rows=this.split(d,3)},this.compare=function(a,b){return new Date(a.getFullYear(),a.getMonth())-new Date(b.getFullYear(),b.getMonth())},this.handleKeyDown=function(a,b){var c=this.activeDate.getMonth();if("left"===a)c-=1;else if("up"===a)c-=3;else if("right"===a)c+=1;else if("down"===a)c+=3;else if("pageup"===a||"pagedown"===a){var d=this.activeDate.getFullYear()+("pageup"===a?-1:1);this.activeDate.setFullYear(d)}else"home"===a?c=0:"end"===a&&(c=11);this.activeDate.setMonth(c)}}]).controller("UibYearpickerController",["$scope","$element","dateFilter",function(a,b,c){function d(a){return parseInt((a-1)/e,10)*e+1}var e;this.element=b,this.yearpickerInit=function(){e=this.yearRange,this.step={years:e}},this._refreshView=function(){for(var b,c=new Array(e),f=0,g=d(this.activeDate.getFullYear());e>f;f++)b=new Date(this.activeDate),b.setFullYear(g+f,0,1),c[f]=angular.extend(this.createDateObject(b,this.formatYear),{uid:a.uniqueId+"-"+f});a.title=[c[0].label,c[e-1].label].join(" - "),a.rows=this.split(c,5)},this.compare=function(a,b){return a.getFullYear()-b.getFullYear()},this.handleKeyDown=function(a,b){var c=this.activeDate.getFullYear();"left"===a?c-=1:"up"===a?c-=5:"right"===a?c+=1:"down"===a?c+=5:"pageup"===a||"pagedown"===a?c+=("pageup"===a?-1:1)*this.step.years:"home"===a?c=d(this.activeDate.getFullYear()):"end"===a&&(c=d(this.activeDate.getFullYear())+e-1),this.activeDate.setFullYear(c)}}]).directive("uibDatepicker",function(){return{replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/datepicker.html"},scope:{datepickerMode:"=?",dateDisabled:"&",customClass:"&",shortcutPropagation:"&?"},require:["uibDatepicker","^ngModel"],controller:"UibDatepickerController",controllerAs:"datepicker",link:function(a,b,c,d){var e=d[0],f=d[1];e.init(f)}}}).directive("uibDaypicker",function(){return{replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/day.html"},require:["^?uibDatepicker","uibDaypicker","^?datepicker"],controller:"UibDaypickerController",link:function(a,b,c,d){var e=d[0]||d[2],f=d[1];f.init(e)}}}).directive("uibMonthpicker",function(){return{replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/month.html"},require:["^?uibDatepicker","uibMonthpicker","^?datepicker"],controller:"UibMonthpickerController",link:function(a,b,c,d){var e=d[0]||d[2],f=d[1];f.init(e)}}}).directive("uibYearpicker",function(){return{replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/year.html"},require:["^?uibDatepicker","uibYearpicker","^?datepicker"],controller:"UibYearpickerController",link:function(a,b,c,d){var e=d[0]||d[2];angular.extend(e,d[1]),e.yearpickerInit(),e.refreshView()}}}).constant("uibDatepickerPopupConfig",{datepickerPopup:"yyyy-MM-dd",datepickerPopupTemplateUrl:"template/datepicker/popup.html",datepickerTemplateUrl:"template/datepicker/datepicker.html",html5Types:{date:"yyyy-MM-dd","datetime-local":"yyyy-MM-ddTHH:mm:ss.sss",month:"yyyy-MM"},currentText:"Today",clearText:"Clear",closeText:"Done",closeOnDateSelection:!0,appendToBody:!1,showButtonBar:!0,onOpenFocus:!0}).controller("UibDatepickerPopupController",["$scope","$element","$attrs","$compile","$parse","$document","$rootScope","$uibPosition","dateFilter","uibDateParser","uibDatepickerPopupConfig","$timeout",function(a,b,c,d,e,f,g,h,i,j,k,l){
function m(a){return a.replace(/([A-Z])/g,function(a){return"-"+a.toLowerCase()})}function n(b){if(angular.isNumber(b)&&(b=new Date(b)),b){if(angular.isDate(b)&&!isNaN(b))return b;if(angular.isString(b)){var c=j.parse(b,r,a.date);return isNaN(c)?void 0:c}return void 0}return null}function o(a,b){var d=a||b;if(!c.ngRequired&&!d)return!0;if(angular.isNumber(d)&&(d=new Date(d)),d){if(angular.isDate(d)&&!isNaN(d))return!0;if(angular.isString(d)){var e=j.parse(d,r);return!isNaN(e)}return!1}return!0}function p(c){var d=A[0],e=b[0].contains(c.target),f=void 0!==d.contains&&d.contains(c.target);!a.isOpen||e||f||a.$apply(function(){a.isOpen=!1})}function q(c){27===c.which&&a.isOpen?(c.preventDefault(),c.stopPropagation(),a.$apply(function(){a.isOpen=!1}),b[0].focus()):40!==c.which||a.isOpen||(c.preventDefault(),c.stopPropagation(),a.$apply(function(){a.isOpen=!0}))}var r,s,t,u,v,w,x,y,z,A,B={},C=!1;a.watchData={},this.init=function(h){if(z=h,s=angular.isDefined(c.closeOnDateSelection)?a.$parent.$eval(c.closeOnDateSelection):k.closeOnDateSelection,t=angular.isDefined(c.datepickerAppendToBody)?a.$parent.$eval(c.datepickerAppendToBody):k.appendToBody,u=angular.isDefined(c.onOpenFocus)?a.$parent.$eval(c.onOpenFocus):k.onOpenFocus,v=angular.isDefined(c.datepickerPopupTemplateUrl)?c.datepickerPopupTemplateUrl:k.datepickerPopupTemplateUrl,w=angular.isDefined(c.datepickerTemplateUrl)?c.datepickerTemplateUrl:k.datepickerTemplateUrl,a.showButtonBar=angular.isDefined(c.showButtonBar)?a.$parent.$eval(c.showButtonBar):k.showButtonBar,k.html5Types[c.type]?(r=k.html5Types[c.type],C=!0):(r=c.datepickerPopup||c.uibDatepickerPopup||k.datepickerPopup,c.$observe("uibDatepickerPopup",function(a,b){var c=a||k.datepickerPopup;if(c!==r&&(r=c,z.$modelValue=null,!r))throw new Error("uibDatepickerPopup must have a date format specified.")})),!r)throw new Error("uibDatepickerPopup must have a date format specified.");if(C&&c.datepickerPopup)throw new Error("HTML5 date input types do not support custom formats.");if(x=angular.element("<div uib-datepicker-popup-wrap><div uib-datepicker></div></div>"),x.attr({"ng-model":"date","ng-change":"dateSelection(date)","template-url":v}),y=angular.element(x.children()[0]),y.attr("template-url",w),C&&"month"===c.type&&(y.attr("datepicker-mode",'"month"'),y.attr("min-mode","month")),c.datepickerOptions){var l=a.$parent.$eval(c.datepickerOptions);l&&l.initDate&&(a.initDate=l.initDate,y.attr("init-date","initDate"),delete l.initDate),angular.forEach(l,function(a,b){y.attr(m(b),a)})}angular.forEach(["minMode","maxMode","minDate","maxDate","datepickerMode","initDate","shortcutPropagation"],function(b){if(c[b]){var d=e(c[b]);if(a.$parent.$watch(d,function(c){a.watchData[b]=c,("minDate"===b||"maxDate"===b)&&(B[b]=new Date(c))}),y.attr(m(b),"watchData."+b),"datepickerMode"===b){var f=d.assign;a.$watch("watchData."+b,function(b,c){angular.isFunction(f)&&b!==c&&f(a.$parent,b)})}}}),c.dateDisabled&&y.attr("date-disabled","dateDisabled({ date: date, mode: mode })"),c.showWeeks&&y.attr("show-weeks",c.showWeeks),c.customClass&&y.attr("custom-class","customClass({ date: date, mode: mode })"),C?z.$formatters.push(function(b){return a.date=b,b}):(z.$$parserName="date",z.$validators.date=o,z.$parsers.unshift(n),z.$formatters.push(function(b){return a.date=b,z.$isEmpty(b)?b:i(b,r)})),z.$viewChangeListeners.push(function(){a.date=j.parse(z.$viewValue,r,a.date)}),b.bind("keydown",q),A=d(x)(a),x.remove(),t?f.find("body").append(A):b.after(A),a.$on("$destroy",function(){a.isOpen===!0&&(g.$$phase||a.$apply(function(){a.isOpen=!1})),A.remove(),b.unbind("keydown",q),f.unbind("click",p)})},a.getText=function(b){return a[b+"Text"]||k[b+"Text"]},a.isDisabled=function(b){return"today"===b&&(b=new Date),a.watchData.minDate&&a.compare(b,B.minDate)<0||a.watchData.maxDate&&a.compare(b,B.maxDate)>0},a.compare=function(a,b){return new Date(a.getFullYear(),a.getMonth(),a.getDate())-new Date(b.getFullYear(),b.getMonth(),b.getDate())},a.dateSelection=function(c){angular.isDefined(c)&&(a.date=c);var d=a.date?i(a.date,r):null;b.val(d),z.$setViewValue(d),s&&(a.isOpen=!1,b[0].focus())},a.keydown=function(c){27===c.which&&(a.isOpen=!1,b[0].focus())},a.select=function(b){if("today"===b){var c=new Date;angular.isDate(a.date)?(b=new Date(a.date),b.setFullYear(c.getFullYear(),c.getMonth(),c.getDate())):b=new Date(c.setHours(0,0,0,0))}a.dateSelection(b)},a.close=function(){a.isOpen=!1,b[0].focus()},a.$watch("isOpen",function(c){c?(a.position=t?h.offset(b):h.position(b),a.position.top=a.position.top+b.prop("offsetHeight"),l(function(){u&&a.$broadcast("uib:datepicker.focus"),f.bind("click",p)},0,!1)):f.unbind("click",p)})}]).directive("uibDatepickerPopup",function(){return{require:["ngModel","uibDatepickerPopup"],controller:"UibDatepickerPopupController",scope:{isOpen:"=?",currentText:"@",clearText:"@",closeText:"@",dateDisabled:"&",customClass:"&"},link:function(a,b,c,d){var e=d[0],f=d[1];f.init(e)}}}).directive("uibDatepickerPopupWrap",function(){return{replace:!0,transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/popup.html"}}}),angular.module("ui.bootstrap.datepicker").value("$datepickerSuppressWarning",!1).controller("DatepickerController",["$scope","$attrs","$parse","$interpolate","$log","dateFilter","uibDatepickerConfig","$datepickerSuppressError","$datepickerSuppressWarning",function(a,b,c,d,e,f,g,h,i){i||e.warn("DatepickerController is now deprecated. Use UibDatepickerController instead.");var j=this,k={$setViewValue:angular.noop};this.modes=["day","month","year"],angular.forEach(["formatDay","formatMonth","formatYear","formatDayHeader","formatDayTitle","formatMonthTitle","showWeeks","startingDay","yearRange","shortcutPropagation"],function(c,e){j[c]=angular.isDefined(b[c])?6>e?d(b[c])(a.$parent):a.$parent.$eval(b[c]):g[c]}),angular.forEach(["minDate","maxDate"],function(d){b[d]?a.$parent.$watch(c(b[d]),function(a){j[d]=a?new Date(a):null,j.refreshView()}):j[d]=g[d]?new Date(g[d]):null}),angular.forEach(["minMode","maxMode"],function(d){b[d]?a.$parent.$watch(c(b[d]),function(c){j[d]=angular.isDefined(c)?c:b[d],a[d]=j[d],("minMode"==d&&j.modes.indexOf(a.datepickerMode)<j.modes.indexOf(j[d])||"maxMode"==d&&j.modes.indexOf(a.datepickerMode)>j.modes.indexOf(j[d]))&&(a.datepickerMode=j[d])}):(j[d]=g[d]||null,a[d]=j[d])}),a.datepickerMode=a.datepickerMode||g.datepickerMode,a.uniqueId="datepicker-"+a.$id+"-"+Math.floor(1e4*Math.random()),angular.isDefined(b.initDate)?(this.activeDate=a.$parent.$eval(b.initDate)||new Date,a.$parent.$watch(b.initDate,function(a){a&&(k.$isEmpty(k.$modelValue)||k.$invalid)&&(j.activeDate=a,j.refreshView())})):this.activeDate=new Date,a.isActive=function(b){return 0===j.compare(b.date,j.activeDate)?(a.activeDateId=b.uid,!0):!1},this.init=function(a){k=a,k.$render=function(){j.render()}},this.render=function(){if(k.$viewValue){var a=new Date(k.$viewValue),b=!isNaN(a);b?this.activeDate=a:h||e.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')}this.refreshView()},this.refreshView=function(){if(this.element){this._refreshView();var a=k.$viewValue?new Date(k.$viewValue):null;k.$setValidity("dateDisabled",!a||this.element&&!this.isDisabled(a))}},this.createDateObject=function(a,b){var c=k.$viewValue?new Date(k.$viewValue):null;return{date:a,label:f(a,b),selected:c&&0===this.compare(a,c),disabled:this.isDisabled(a),current:0===this.compare(a,new Date),customClass:this.customClass(a)}},this.isDisabled=function(c){return this.minDate&&this.compare(c,this.minDate)<0||this.maxDate&&this.compare(c,this.maxDate)>0||b.dateDisabled&&a.dateDisabled({date:c,mode:a.datepickerMode})},this.customClass=function(b){return a.customClass({date:b,mode:a.datepickerMode})},this.split=function(a,b){for(var c=[];a.length>0;)c.push(a.splice(0,b));return c},this.fixTimeZone=function(a){var b=a.getHours();a.setHours(23===b?b+2:0)},a.select=function(b){if(a.datepickerMode===j.minMode){var c=k.$viewValue?new Date(k.$viewValue):new Date(0,0,0,0,0,0,0);c.setFullYear(b.getFullYear(),b.getMonth(),b.getDate()),k.$setViewValue(c),k.$render()}else j.activeDate=b,a.datepickerMode=j.modes[j.modes.indexOf(a.datepickerMode)-1]},a.move=function(a){var b=j.activeDate.getFullYear()+a*(j.step.years||0),c=j.activeDate.getMonth()+a*(j.step.months||0);j.activeDate.setFullYear(b,c,1),j.refreshView()},a.toggleMode=function(b){b=b||1,a.datepickerMode===j.maxMode&&1===b||a.datepickerMode===j.minMode&&-1===b||(a.datepickerMode=j.modes[j.modes.indexOf(a.datepickerMode)+b])},a.keys={13:"enter",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down"};var l=function(){j.element[0].focus()};a.$on("uib:datepicker.focus",l),a.keydown=function(b){var c=a.keys[b.which];if(c&&!b.shiftKey&&!b.altKey)if(b.preventDefault(),j.shortcutPropagation||b.stopPropagation(),"enter"===c||"space"===c){if(j.isDisabled(j.activeDate))return;a.select(j.activeDate)}else!b.ctrlKey||"up"!==c&&"down"!==c?(j.handleKeyDown(c,b),j.refreshView()):a.toggleMode("up"===c?1:-1)}}]).directive("datepicker",["$log","$datepickerSuppressWarning",function(a,b){return{replace:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/datepicker.html"},scope:{datepickerMode:"=?",dateDisabled:"&",customClass:"&",shortcutPropagation:"&?"},require:["datepicker","^ngModel"],controller:"DatepickerController",controllerAs:"datepicker",link:function(c,d,e,f){b||a.warn("datepicker is now deprecated. Use uib-datepicker instead.");var g=f[0],h=f[1];g.init(h)}}}]).directive("daypicker",["$log","$datepickerSuppressWarning",function(a,b){return{replace:!0,templateUrl:"template/datepicker/day.html",require:["^datepicker","daypicker"],controller:"UibDaypickerController",link:function(c,d,e,f){b||a.warn("daypicker is now deprecated. Use uib-daypicker instead.");var g=f[0],h=f[1];h.init(g)}}}]).directive("monthpicker",["$log","$datepickerSuppressWarning",function(a,b){return{replace:!0,templateUrl:"template/datepicker/month.html",require:["^datepicker","monthpicker"],controller:"UibMonthpickerController",link:function(c,d,e,f){b||a.warn("monthpicker is now deprecated. Use uib-monthpicker instead.");var g=f[0],h=f[1];h.init(g)}}}]).directive("yearpicker",["$log","$datepickerSuppressWarning",function(a,b){return{replace:!0,templateUrl:"template/datepicker/year.html",require:["^datepicker","yearpicker"],controller:"UibYearpickerController",link:function(c,d,e,f){b||a.warn("yearpicker is now deprecated. Use uib-yearpicker instead.");var g=f[0];angular.extend(g,f[1]),g.yearpickerInit(),g.refreshView()}}}]).directive("datepickerPopup",["$log","$datepickerSuppressWarning",function(a,b){return{require:["ngModel","datepickerPopup"],controller:"UibDatepickerPopupController",scope:{isOpen:"=?",currentText:"@",clearText:"@",closeText:"@",dateDisabled:"&",customClass:"&"},link:function(c,d,e,f){b||a.warn("datepicker-popup is now deprecated. Use uib-datepicker-popup instead.");var g=f[0],h=f[1];h.init(g)}}}]).directive("datepickerPopupWrap",["$log","$datepickerSuppressWarning",function(a,b){return{replace:!0,transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/datepicker/popup.html"},link:function(){b||a.warn("datepicker-popup-wrap is now deprecated. Use uib-datepicker-popup-wrap instead.")}}}]),angular.module("ui.bootstrap.dropdown",["ui.bootstrap.position"]).constant("uibDropdownConfig",{openClass:"open"}).service("uibDropdownService",["$document","$rootScope",function(a,b){var c=null;this.open=function(b){c||(a.bind("click",d),a.bind("keydown",e)),c&&c!==b&&(c.isOpen=!1),c=b},this.close=function(b){c===b&&(c=null,a.unbind("click",d),a.unbind("keydown",e))};var d=function(a){if(c&&(!a||"disabled"!==c.getAutoClose())){var d=c.getToggleElement();if(!(a&&d&&d[0].contains(a.target))){var e=c.getDropdownElement();a&&"outsideClick"===c.getAutoClose()&&e&&e[0].contains(a.target)||(c.isOpen=!1,b.$$phase||c.$apply())}}},e=function(a){27===a.which?(c.focusToggleElement(),d()):c.isKeynavEnabled()&&/(38|40)/.test(a.which)&&c.isOpen&&(a.preventDefault(),a.stopPropagation(),c.focusDropdownEntry(a.which))}}]).controller("UibDropdownController",["$scope","$element","$attrs","$parse","uibDropdownConfig","uibDropdownService","$animate","$uibPosition","$document","$compile","$templateRequest",function(a,b,c,d,e,f,g,h,i,j,k){var l,m,n=this,o=a.$new(),p=e.openClass,q=angular.noop,r=c.onToggle?d(c.onToggle):angular.noop,s=!1,t=!1;b.addClass("dropdown"),this.init=function(){c.isOpen&&(m=d(c.isOpen),q=m.assign,a.$watch(m,function(a){o.isOpen=!!a})),s=angular.isDefined(c.dropdownAppendToBody),t=angular.isDefined(c.uibKeyboardNav),s&&n.dropdownMenu&&(i.find("body").append(n.dropdownMenu),b.on("$destroy",function(){n.dropdownMenu.remove()}))},this.toggle=function(a){return o.isOpen=arguments.length?!!a:!o.isOpen},this.isOpen=function(){return o.isOpen},o.getToggleElement=function(){return n.toggleElement},o.getAutoClose=function(){return c.autoClose||"always"},o.getElement=function(){return b},o.isKeynavEnabled=function(){return t},o.focusDropdownEntry=function(a){var c=n.dropdownMenu?angular.element(n.dropdownMenu).find("a"):angular.element(b).find("ul").eq(0).find("a");switch(a){case 40:angular.isNumber(n.selectedOption)?n.selectedOption=n.selectedOption===c.length-1?n.selectedOption:n.selectedOption+1:n.selectedOption=0;break;case 38:angular.isNumber(n.selectedOption)?n.selectedOption=0===n.selectedOption?0:n.selectedOption-1:n.selectedOption=c.length-1}c[n.selectedOption].focus()},o.getDropdownElement=function(){return n.dropdownMenu},o.focusToggleElement=function(){n.toggleElement&&n.toggleElement[0].focus()},o.$watch("isOpen",function(c,d){if(s&&n.dropdownMenu){var e=h.positionElements(b,n.dropdownMenu,"bottom-left",!0),i={top:e.top+"px",display:c?"block":"none"},m=n.dropdownMenu.hasClass("dropdown-menu-right");m?(i.left="auto",i.right=window.innerWidth-(e.left+b.prop("offsetWidth"))+"px"):(i.left=e.left+"px",i.right="auto"),n.dropdownMenu.css(i)}if(g[c?"addClass":"removeClass"](b,p).then(function(){angular.isDefined(c)&&c!==d&&r(a,{open:!!c})}),c)n.dropdownMenuTemplateUrl&&k(n.dropdownMenuTemplateUrl).then(function(a){l=o.$new(),j(a.trim())(l,function(a){var b=a;n.dropdownMenu.replaceWith(b),n.dropdownMenu=b})}),o.focusToggleElement(),f.open(o);else{if(n.dropdownMenuTemplateUrl){l&&l.$destroy();var t=angular.element('<ul class="dropdown-menu"></ul>');n.dropdownMenu.replaceWith(t),n.dropdownMenu=t}f.close(o),n.selectedOption=null}angular.isFunction(q)&&q(a,c)}),a.$on("$locationChangeSuccess",function(){"disabled"!==o.getAutoClose()&&(o.isOpen=!1)});var u=a.$on("$destroy",function(){o.$destroy()});o.$on("$destroy",u)}]).directive("uibDropdown",function(){return{controller:"UibDropdownController",link:function(a,b,c,d){d.init()}}}).directive("uibDropdownMenu",function(){return{restrict:"AC",require:"?^uibDropdown",link:function(a,b,c,d){if(d&&!angular.isDefined(c.dropdownNested)){b.addClass("dropdown-menu");var e=c.templateUrl;e&&(d.dropdownMenuTemplateUrl=e),d.dropdownMenu||(d.dropdownMenu=b)}}}}).directive("uibKeyboardNav",function(){return{restrict:"A",require:"?^uibDropdown",link:function(a,b,c,d){b.bind("keydown",function(a){if(-1!==[38,40].indexOf(a.which)){a.preventDefault(),a.stopPropagation();var b=d.dropdownMenu.find("a");switch(a.which){case 40:angular.isNumber(d.selectedOption)?d.selectedOption=d.selectedOption===b.length-1?d.selectedOption:d.selectedOption+1:d.selectedOption=0;break;case 38:angular.isNumber(d.selectedOption)?d.selectedOption=0===d.selectedOption?0:d.selectedOption-1:d.selectedOption=b.length-1}b[d.selectedOption].focus()}})}}}).directive("uibDropdownToggle",function(){return{require:"?^uibDropdown",link:function(a,b,c,d){if(d){b.addClass("dropdown-toggle"),d.toggleElement=b;var e=function(e){e.preventDefault(),b.hasClass("disabled")||c.disabled||a.$apply(function(){d.toggle()})};b.bind("click",e),b.attr({"aria-haspopup":!0,"aria-expanded":!1}),a.$watch(d.isOpen,function(a){b.attr("aria-expanded",!!a)}),a.$on("$destroy",function(){b.unbind("click",e)})}}}}),angular.module("ui.bootstrap.dropdown").value("$dropdownSuppressWarning",!1).service("dropdownService",["$log","$dropdownSuppressWarning","uibDropdownService",function(a,b,c){b||a.warn("dropdownService is now deprecated. Use uibDropdownService instead."),angular.extend(this,c)}]).controller("DropdownController",["$scope","$element","$attrs","$parse","uibDropdownConfig","uibDropdownService","$animate","$uibPosition","$document","$compile","$templateRequest","$log","$dropdownSuppressWarning",function(a,b,c,d,e,f,g,h,i,j,k,l,m){m||l.warn("DropdownController is now deprecated. Use UibDropdownController instead.");var n,o,p=this,q=a.$new(),r=e.openClass,s=angular.noop,t=c.onToggle?d(c.onToggle):angular.noop,u=!1,v=!1;b.addClass("dropdown"),this.init=function(){c.isOpen&&(o=d(c.isOpen),s=o.assign,a.$watch(o,function(a){q.isOpen=!!a})),u=angular.isDefined(c.dropdownAppendToBody),v=angular.isDefined(c.uibKeyboardNav),u&&p.dropdownMenu&&(i.find("body").append(p.dropdownMenu),b.on("$destroy",function(){p.dropdownMenu.remove()}))},this.toggle=function(a){return q.isOpen=arguments.length?!!a:!q.isOpen},this.isOpen=function(){return q.isOpen},q.getToggleElement=function(){return p.toggleElement},q.getAutoClose=function(){return c.autoClose||"always"},q.getElement=function(){return b},q.isKeynavEnabled=function(){return v},q.focusDropdownEntry=function(a){var c=p.dropdownMenu?angular.element(p.dropdownMenu).find("a"):angular.element(b).find("ul").eq(0).find("a");switch(a){case 40:angular.isNumber(p.selectedOption)?p.selectedOption=p.selectedOption===c.length-1?p.selectedOption:p.selectedOption+1:p.selectedOption=0;break;case 38:angular.isNumber(p.selectedOption)?p.selectedOption=0===p.selectedOption?0:p.selectedOption-1:p.selectedOption=c.length-1}c[p.selectedOption].focus()},q.getDropdownElement=function(){return p.dropdownMenu},q.focusToggleElement=function(){p.toggleElement&&p.toggleElement[0].focus()},q.$watch("isOpen",function(c,d){if(u&&p.dropdownMenu){var e=h.positionElements(b,p.dropdownMenu,"bottom-left",!0),i={top:e.top+"px",display:c?"block":"none"},l=p.dropdownMenu.hasClass("dropdown-menu-right");l?(i.left="auto",i.right=window.innerWidth-(e.left+b.prop("offsetWidth"))+"px"):(i.left=e.left+"px",i.right="auto"),p.dropdownMenu.css(i)}if(g[c?"addClass":"removeClass"](b,r).then(function(){angular.isDefined(c)&&c!==d&&t(a,{open:!!c})}),c)p.dropdownMenuTemplateUrl&&k(p.dropdownMenuTemplateUrl).then(function(a){n=q.$new(),j(a.trim())(n,function(a){var b=a;p.dropdownMenu.replaceWith(b),p.dropdownMenu=b})}),q.focusToggleElement(),f.open(q);else{if(p.dropdownMenuTemplateUrl){n&&n.$destroy();var m=angular.element('<ul class="dropdown-menu"></ul>');p.dropdownMenu.replaceWith(m),p.dropdownMenu=m}f.close(q),p.selectedOption=null}angular.isFunction(s)&&s(a,c)}),a.$on("$locationChangeSuccess",function(){"disabled"!==q.getAutoClose()&&(q.isOpen=!1)});var w=a.$on("$destroy",function(){q.$destroy()});q.$on("$destroy",w)}]).directive("dropdown",["$log","$dropdownSuppressWarning",function(a,b){return{controller:"DropdownController",link:function(c,d,e,f){b||a.warn("dropdown is now deprecated. Use uib-dropdown instead."),f.init()}}}]).directive("dropdownMenu",["$log","$dropdownSuppressWarning",function(a,b){return{restrict:"AC",require:"?^dropdown",link:function(c,d,e,f){if(f&&!angular.isDefined(e.dropdownNested)){b||a.warn("dropdown-menu is now deprecated. Use uib-dropdown-menu instead."),d.addClass("dropdown-menu");var g=e.templateUrl;g&&(f.dropdownMenuTemplateUrl=g),f.dropdownMenu||(f.dropdownMenu=d)}}}}]).directive("keyboardNav",["$log","$dropdownSuppressWarning",function(a,b){return{restrict:"A",require:"?^dropdown",link:function(c,d,e,f){b||a.warn("keyboard-nav is now deprecated. Use uib-keyboard-nav instead."),d.bind("keydown",function(a){if(-1!==[38,40].indexOf(a.which)){a.preventDefault(),a.stopPropagation();var b=f.dropdownMenu.find("a");switch(a.which){case 40:angular.isNumber(f.selectedOption)?f.selectedOption=f.selectedOption===b.length-1?f.selectedOption:f.selectedOption+1:f.selectedOption=0;break;case 38:angular.isNumber(f.selectedOption)?f.selectedOption=0===f.selectedOption?0:f.selectedOption-1:f.selectedOption=b.length-1}b[f.selectedOption].focus()}})}}}]).directive("dropdownToggle",["$log","$dropdownSuppressWarning",function(a,b){return{require:"?^dropdown",link:function(c,d,e,f){if(b||a.warn("dropdown-toggle is now deprecated. Use uib-dropdown-toggle instead."),f){d.addClass("dropdown-toggle"),f.toggleElement=d;var g=function(a){a.preventDefault(),d.hasClass("disabled")||e.disabled||c.$apply(function(){f.toggle()})};d.bind("click",g),d.attr({"aria-haspopup":!0,"aria-expanded":!1}),c.$watch(f.isOpen,function(a){d.attr("aria-expanded",!!a)}),c.$on("$destroy",function(){d.unbind("click",g)})}}}}]),angular.module("ui.bootstrap.stackedMap",[]).factory("$$stackedMap",function(){return{createNew:function(){var a=[];return{add:function(b,c){a.push({key:b,value:c})},get:function(b){for(var c=0;c<a.length;c++)if(b==a[c].key)return a[c]},keys:function(){for(var b=[],c=0;c<a.length;c++)b.push(a[c].key);return b},top:function(){return a[a.length-1]},remove:function(b){for(var c=-1,d=0;d<a.length;d++)if(b==a[d].key){c=d;break}return a.splice(c,1)[0]},removeTop:function(){return a.splice(a.length-1,1)[0]},length:function(){return a.length}}}}}),angular.module("ui.bootstrap.modal",["ui.bootstrap.stackedMap"]).factory("$$multiMap",function(){return{createNew:function(){var a={};return{entries:function(){return Object.keys(a).map(function(b){return{key:b,value:a[b]}})},get:function(b){return a[b]},hasKey:function(b){return!!a[b]},keys:function(){return Object.keys(a)},put:function(b,c){a[b]||(a[b]=[]),a[b].push(c)},remove:function(b,c){var d=a[b];if(d){var e=d.indexOf(c);-1!==e&&d.splice(e,1),d.length||delete a[b]}}}}}}).directive("uibModalBackdrop",["$animate","$injector","$uibModalStack",function(a,b,c){function d(b,d,f){d.addClass("modal-backdrop"),f.modalInClass&&(e?e(d,{addClass:f.modalInClass}).start():a.addClass(d,f.modalInClass),b.$on(c.NOW_CLOSING_EVENT,function(b,c){var g=c();e?e(d,{removeClass:f.modalInClass}).start().then(g):a.removeClass(d,f.modalInClass).then(g)}))}var e=null;return b.has("$animateCss")&&(e=b.get("$animateCss")),{replace:!0,templateUrl:"template/modal/backdrop.html",compile:function(a,b){return a.addClass(b.backdropClass),d}}}]).directive("uibModalWindow",["$uibModalStack","$q","$animate","$injector",function(a,b,c,d){var e=null;return d.has("$animateCss")&&(e=d.get("$animateCss")),{scope:{index:"@"},replace:!0,transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/modal/window.html"},link:function(d,f,g){f.addClass(g.windowClass||""),f.addClass(g.windowTopClass||""),d.size=g.size,d.close=function(b){var c=a.getTop();c&&c.value.backdrop&&"static"!==c.value.backdrop&&b.target===b.currentTarget&&(b.preventDefault(),b.stopPropagation(),a.dismiss(c.key,"backdrop click"))},f.on("click",d.close),d.$isRendered=!0;var h=b.defer();g.$observe("modalRender",function(a){"true"==a&&h.resolve()}),h.promise.then(function(){var h=null;g.modalInClass&&(h=e?e(f,{addClass:g.modalInClass}).start():c.addClass(f,g.modalInClass),d.$on(a.NOW_CLOSING_EVENT,function(a,b){var d=b();e?e(f,{removeClass:g.modalInClass}).start().then(d):c.removeClass(f,g.modalInClass).then(d)})),b.when(h).then(function(){var a=f[0].querySelector("[autofocus]");a?a.focus():f[0].focus()});var i=a.getTop();i&&a.modalRendered(i.key)})}}}]).directive("uibModalAnimationClass",function(){return{compile:function(a,b){b.modalAnimation&&a.addClass(b.uibModalAnimationClass)}}}).directive("uibModalTransclude",function(){return{link:function(a,b,c,d,e){e(a.$parent,function(a){b.empty(),b.append(a)})}}}).factory("$uibModalStack",["$animate","$timeout","$document","$compile","$rootScope","$q","$injector","$$multiMap","$$stackedMap",function(a,b,c,d,e,f,g,h,i){function j(){for(var a=-1,b=u.keys(),c=0;c<b.length;c++)u.get(b[c]).value.backdrop&&(a=c);return a}function k(a,b){var d=c.find("body").eq(0),e=u.get(a).value;u.remove(a),n(e.modalDomEl,e.modalScope,function(){var b=e.openedClass||t;v.remove(b,a),d.toggleClass(b,v.hasKey(b)),l(!0)}),m(),b&&b.focus?b.focus():d.focus()}function l(a){var b;u.length()>0&&(b=u.top().value,b.modalDomEl.toggleClass(b.windowTopClass||"",a))}function m(){if(q&&-1==j()){var a=r;n(q,r,function(){a=null}),q=void 0,r=void 0}}function n(b,c,d){function e(){e.done||(e.done=!0,p?p(b,{event:"leave"}).start().then(function(){b.remove()}):a.leave(b),c.$destroy(),d&&d())}var g,h=null,i=function(){return g||(g=f.defer(),h=g.promise),function(){g.resolve()}};return c.$broadcast(w.NOW_CLOSING_EVENT,i),f.when(h).then(e)}function o(a,b,c){return!a.value.modalScope.$broadcast("modal.closing",b,c).defaultPrevented}var p=null;g.has("$animateCss")&&(p=g.get("$animateCss"));var q,r,s,t="modal-open",u=i.createNew(),v=h.createNew(),w={NOW_CLOSING_EVENT:"modal.stack.now-closing"},x=0,y="a[href], area[href], input:not([disabled]), button:not([disabled]),select:not([disabled]), textarea:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable=true]";return e.$watch(j,function(a){r&&(r.index=a)}),c.bind("keydown",function(a){if(a.isDefaultPrevented())return a;var b=u.top();if(b&&b.value.keyboard)switch(a.which){case 27:a.preventDefault(),e.$apply(function(){w.dismiss(b.key,"escape key press")});break;case 9:w.loadFocusElementList(b);var c=!1;a.shiftKey?w.isFocusInFirstItem(a)&&(c=w.focusLastFocusableElement()):w.isFocusInLastItem(a)&&(c=w.focusFirstFocusableElement()),c&&(a.preventDefault(),a.stopPropagation())}}),w.open=function(a,b){var f=c[0].activeElement,g=b.openedClass||t;l(!1),u.add(a,{deferred:b.deferred,renderDeferred:b.renderDeferred,modalScope:b.scope,backdrop:b.backdrop,keyboard:b.keyboard,openedClass:b.openedClass,windowTopClass:b.windowTopClass}),v.put(g,a);var h=c.find("body").eq(0),i=j();if(i>=0&&!q){r=e.$new(!0),r.index=i;var k=angular.element('<div uib-modal-backdrop="modal-backdrop"></div>');k.attr("backdrop-class",b.backdropClass),b.animation&&k.attr("modal-animation","true"),q=d(k)(r),h.append(q)}var m=angular.element('<div uib-modal-window="modal-window"></div>');m.attr({"template-url":b.windowTemplateUrl,"window-class":b.windowClass,"window-top-class":b.windowTopClass,size:b.size,index:u.length()-1,animate:"animate"}).html(b.content),b.animation&&m.attr("modal-animation","true");var n=d(m)(b.scope);u.top().value.modalDomEl=n,u.top().value.modalOpener=f,h.append(n),h.addClass(g),w.clearFocusListCache()},w.close=function(a,b){var c=u.get(a);return c&&o(c,b,!0)?(c.value.modalScope.$$uibDestructionScheduled=!0,c.value.deferred.resolve(b),k(a,c.value.modalOpener),!0):!c},w.dismiss=function(a,b){var c=u.get(a);return c&&o(c,b,!1)?(c.value.modalScope.$$uibDestructionScheduled=!0,c.value.deferred.reject(b),k(a,c.value.modalOpener),!0):!c},w.dismissAll=function(a){for(var b=this.getTop();b&&this.dismiss(b.key,a);)b=this.getTop()},w.getTop=function(){return u.top()},w.modalRendered=function(a){var b=u.get(a);b&&b.value.renderDeferred.resolve()},w.focusFirstFocusableElement=function(){return s.length>0?(s[0].focus(),!0):!1},w.focusLastFocusableElement=function(){return s.length>0?(s[s.length-1].focus(),!0):!1},w.isFocusInFirstItem=function(a){return s.length>0?(a.target||a.srcElement)==s[0]:!1},w.isFocusInLastItem=function(a){return s.length>0?(a.target||a.srcElement)==s[s.length-1]:!1},w.clearFocusListCache=function(){s=[],x=0},w.loadFocusElementList=function(a){if((void 0===s||!s.length)&&a){var b=a.value.modalDomEl;b&&b.length&&(s=b[0].querySelectorAll(y))}},w}]).provider("$uibModal",function(){var a={options:{animation:!0,backdrop:!0,keyboard:!0},$get:["$injector","$rootScope","$q","$templateRequest","$controller","$uibModalStack","$modalSuppressWarning","$log",function(b,c,d,e,f,g,h,i){function j(a){return a.template?d.when(a.template):e(angular.isFunction(a.templateUrl)?a.templateUrl():a.templateUrl)}function k(a){var c=[];return angular.forEach(a,function(a){angular.isFunction(a)||angular.isArray(a)?c.push(d.when(b.invoke(a))):angular.isString(a)?c.push(d.when(b.get(a))):c.push(d.when(a))}),c}var l={},m=null;return l.getPromiseChain=function(){return m},l.open=function(b){function e(){return r}var l=d.defer(),n=d.defer(),o=d.defer(),p={result:l.promise,opened:n.promise,rendered:o.promise,close:function(a){return g.close(p,a)},dismiss:function(a){return g.dismiss(p,a)}};if(b=angular.extend({},a.options,b),b.resolve=b.resolve||{},!b.template&&!b.templateUrl)throw new Error("One of template or templateUrl options is required.");var q,r=d.all([j(b)].concat(k(b.resolve)));return q=m=d.all([m]).then(e,e).then(function(a){var d=(b.scope||c).$new();d.$close=p.close,d.$dismiss=p.dismiss,d.$on("$destroy",function(){d.$$uibDestructionScheduled||d.$dismiss("$uibUnscheduledDestruction")});var e,j={},k=1;b.controller&&(j.$scope=d,j.$uibModalInstance=p,Object.defineProperty(j,"$modalInstance",{get:function(){return h||i.warn("$modalInstance is now deprecated. Use $uibModalInstance instead."),p}}),angular.forEach(b.resolve,function(b,c){j[c]=a[k++]}),e=f(b.controller,j),b.controllerAs&&(b.bindToController&&angular.extend(e,d),d[b.controllerAs]=e)),g.open(p,{scope:d,deferred:l,renderDeferred:o,content:a[0],animation:b.animation,backdrop:b.backdrop,keyboard:b.keyboard,backdropClass:b.backdropClass,windowTopClass:b.windowTopClass,windowClass:b.windowClass,windowTemplateUrl:b.windowTemplateUrl,size:b.size,openedClass:b.openedClass}),n.resolve(!0)},function(a){n.reject(a),l.reject(a)})["finally"](function(){m===q&&(m=null)}),p},l}]};return a}),angular.module("ui.bootstrap.modal").value("$modalSuppressWarning",!1).directive("modalBackdrop",["$animate","$injector","$modalStack","$log","$modalSuppressWarning",function(a,b,c,d,e){function f(b,f,h){e||d.warn("modal-backdrop is now deprecated. Use uib-modal-backdrop instead."),f.addClass("modal-backdrop"),h.modalInClass&&(g?g(f,{addClass:h.modalInClass}).start():a.addClass(f,h.modalInClass),b.$on(c.NOW_CLOSING_EVENT,function(b,c){var d=c();g?g(f,{removeClass:h.modalInClass}).start().then(d):a.removeClass(f,h.modalInClass).then(d)}))}var g=null;return b.has("$animateCss")&&(g=b.get("$animateCss")),{replace:!0,templateUrl:"template/modal/backdrop.html",compile:function(a,b){return a.addClass(b.backdropClass),f}}}]).directive("modalWindow",["$modalStack","$q","$animate","$injector","$log","$modalSuppressWarning",function(a,b,c,d,e,f){var g=null;return d.has("$animateCss")&&(g=d.get("$animateCss")),{scope:{index:"@"},replace:!0,transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/modal/window.html"},link:function(d,h,i){f||e.warn("modal-window is now deprecated. Use uib-modal-window instead."),h.addClass(i.windowClass||""),h.addClass(i.windowTopClass||""),d.size=i.size,d.close=function(b){var c=a.getTop();c&&c.value.backdrop&&"static"!==c.value.backdrop&&b.target===b.currentTarget&&(b.preventDefault(),b.stopPropagation(),a.dismiss(c.key,"backdrop click"))},h.on("click",d.close),d.$isRendered=!0;var j=b.defer();i.$observe("modalRender",function(a){"true"==a&&j.resolve()}),j.promise.then(function(){var e=null;i.modalInClass&&(e=g?g(h,{addClass:i.modalInClass}).start():c.addClass(h,i.modalInClass),d.$on(a.NOW_CLOSING_EVENT,function(a,b){var d=b();g?g(h,{removeClass:i.modalInClass}).start().then(d):c.removeClass(h,i.modalInClass).then(d)})),b.when(e).then(function(){var a=h[0].querySelector("[autofocus]");a?a.focus():h[0].focus()});var f=a.getTop();f&&a.modalRendered(f.key)})}}}]).directive("modalAnimationClass",["$log","$modalSuppressWarning",function(a,b){return{compile:function(c,d){b||a.warn("modal-animation-class is now deprecated. Use uib-modal-animation-class instead."),d.modalAnimation&&c.addClass(d.modalAnimationClass)}}}]).directive("modalTransclude",["$log","$modalSuppressWarning",function(a,b){return{link:function(c,d,e,f,g){
b||a.warn("modal-transclude is now deprecated. Use uib-modal-transclude instead."),g(c.$parent,function(a){d.empty(),d.append(a)})}}}]).service("$modalStack",["$animate","$timeout","$document","$compile","$rootScope","$q","$injector","$$multiMap","$$stackedMap","$uibModalStack","$log","$modalSuppressWarning",function(a,b,c,d,e,f,g,h,i,j,k,l){l||k.warn("$modalStack is now deprecated. Use $uibModalStack instead."),angular.extend(this,j)}]).provider("$modal",["$uibModalProvider",function(a){angular.extend(this,a),this.$get=["$injector","$log","$modalSuppressWarning",function(b,c,d){return d||c.warn("$modal is now deprecated. Use $uibModal instead."),b.invoke(a.$get)}]}]),angular.module("ui.bootstrap.pagination",[]).controller("UibPaginationController",["$scope","$attrs","$parse",function(a,b,c){var d=this,e={$setViewValue:angular.noop},f=b.numPages?c(b.numPages).assign:angular.noop;this.init=function(g,h){e=g,this.config=h,e.$render=function(){d.render()},b.itemsPerPage?a.$parent.$watch(c(b.itemsPerPage),function(b){d.itemsPerPage=parseInt(b,10),a.totalPages=d.calculateTotalPages()}):this.itemsPerPage=h.itemsPerPage,a.$watch("totalItems",function(){a.totalPages=d.calculateTotalPages()}),a.$watch("totalPages",function(b){f(a.$parent,b),a.page>b?a.selectPage(b):e.$render()})},this.calculateTotalPages=function(){var b=this.itemsPerPage<1?1:Math.ceil(a.totalItems/this.itemsPerPage);return Math.max(b||0,1)},this.render=function(){a.page=parseInt(e.$viewValue,10)||1},a.selectPage=function(b,c){c&&c.preventDefault();var d=!a.ngDisabled||!c;d&&a.page!==b&&b>0&&b<=a.totalPages&&(c&&c.target&&c.target.blur(),e.$setViewValue(b),e.$render())},a.getText=function(b){return a[b+"Text"]||d.config[b+"Text"]},a.noPrevious=function(){return 1===a.page},a.noNext=function(){return a.page===a.totalPages}}]).constant("uibPaginationConfig",{itemsPerPage:10,boundaryLinks:!1,directionLinks:!0,firstText:"First",previousText:"Previous",nextText:"Next",lastText:"Last",rotate:!0}).directive("uibPagination",["$parse","uibPaginationConfig",function(a,b){return{restrict:"EA",scope:{totalItems:"=",firstText:"@",previousText:"@",nextText:"@",lastText:"@",ngDisabled:"="},require:["uibPagination","?ngModel"],controller:"UibPaginationController",controllerAs:"pagination",templateUrl:function(a,b){return b.templateUrl||"template/pagination/pagination.html"},replace:!0,link:function(c,d,e,f){function g(a,b,c){return{number:a,text:b,active:c}}function h(a,b){var c=[],d=1,e=b,f=angular.isDefined(k)&&b>k;f&&(l?(d=Math.max(a-Math.floor(k/2),1),e=d+k-1,e>b&&(e=b,d=e-k+1)):(d=(Math.ceil(a/k)-1)*k+1,e=Math.min(d+k-1,b)));for(var h=d;e>=h;h++){var i=g(h,h,h===a);c.push(i)}if(f&&!l){if(d>1){var j=g(d-1,"...",!1);c.unshift(j)}if(b>e){var m=g(e+1,"...",!1);c.push(m)}}return c}var i=f[0],j=f[1];if(j){var k=angular.isDefined(e.maxSize)?c.$parent.$eval(e.maxSize):b.maxSize,l=angular.isDefined(e.rotate)?c.$parent.$eval(e.rotate):b.rotate;c.boundaryLinks=angular.isDefined(e.boundaryLinks)?c.$parent.$eval(e.boundaryLinks):b.boundaryLinks,c.directionLinks=angular.isDefined(e.directionLinks)?c.$parent.$eval(e.directionLinks):b.directionLinks,i.init(j,b),e.maxSize&&c.$parent.$watch(a(e.maxSize),function(a){k=parseInt(a,10),i.render()});var m=i.render;i.render=function(){m(),c.page>0&&c.page<=c.totalPages&&(c.pages=h(c.page,c.totalPages))}}}}}]).constant("uibPagerConfig",{itemsPerPage:10,previousText:"« Previous",nextText:"Next »",align:!0}).directive("uibPager",["uibPagerConfig",function(a){return{restrict:"EA",scope:{totalItems:"=",previousText:"@",nextText:"@",ngDisabled:"="},require:["uibPager","?ngModel"],controller:"UibPaginationController",controllerAs:"pagination",templateUrl:function(a,b){return b.templateUrl||"template/pagination/pager.html"},replace:!0,link:function(b,c,d,e){var f=e[0],g=e[1];g&&(b.align=angular.isDefined(d.align)?b.$parent.$eval(d.align):a.align,f.init(g,a))}}}]),angular.module("ui.bootstrap.pagination").value("$paginationSuppressWarning",!1).controller("PaginationController",["$scope","$attrs","$parse","$log","$paginationSuppressWarning",function(a,b,c,d,e){e||d.warn("PaginationController is now deprecated. Use UibPaginationController instead.");var f=this,g={$setViewValue:angular.noop},h=b.numPages?c(b.numPages).assign:angular.noop;this.init=function(d,e){g=d,this.config=e,g.$render=function(){f.render()},b.itemsPerPage?a.$parent.$watch(c(b.itemsPerPage),function(b){f.itemsPerPage=parseInt(b,10),a.totalPages=f.calculateTotalPages()}):this.itemsPerPage=e.itemsPerPage,a.$watch("totalItems",function(){a.totalPages=f.calculateTotalPages()}),a.$watch("totalPages",function(b){h(a.$parent,b),a.page>b?a.selectPage(b):g.$render()})},this.calculateTotalPages=function(){var b=this.itemsPerPage<1?1:Math.ceil(a.totalItems/this.itemsPerPage);return Math.max(b||0,1)},this.render=function(){a.page=parseInt(g.$viewValue,10)||1},a.selectPage=function(b,c){c&&c.preventDefault();var d=!a.ngDisabled||!c;d&&a.page!==b&&b>0&&b<=a.totalPages&&(c&&c.target&&c.target.blur(),g.$setViewValue(b),g.$render())},a.getText=function(b){return a[b+"Text"]||f.config[b+"Text"]},a.noPrevious=function(){return 1===a.page},a.noNext=function(){return a.page===a.totalPages}}]).directive("pagination",["$parse","uibPaginationConfig","$log","$paginationSuppressWarning",function(a,b,c,d){return{restrict:"EA",scope:{totalItems:"=",firstText:"@",previousText:"@",nextText:"@",lastText:"@",ngDisabled:"="},require:["pagination","?ngModel"],controller:"PaginationController",controllerAs:"pagination",templateUrl:function(a,b){return b.templateUrl||"template/pagination/pagination.html"},replace:!0,link:function(e,f,g,h){function i(a,b,c){return{number:a,text:b,active:c}}function j(a,b){var c=[],d=1,e=b,f=angular.isDefined(m)&&b>m;f&&(n?(d=Math.max(a-Math.floor(m/2),1),e=d+m-1,e>b&&(e=b,d=e-m+1)):(d=(Math.ceil(a/m)-1)*m+1,e=Math.min(d+m-1,b)));for(var g=d;e>=g;g++){var h=i(g,g,g===a);c.push(h)}if(f&&!n){if(d>1){var j=i(d-1,"...",!1);c.unshift(j)}if(b>e){var k=i(e+1,"...",!1);c.push(k)}}return c}d||c.warn("pagination is now deprecated. Use uib-pagination instead.");var k=h[0],l=h[1];if(l){var m=angular.isDefined(g.maxSize)?e.$parent.$eval(g.maxSize):b.maxSize,n=angular.isDefined(g.rotate)?e.$parent.$eval(g.rotate):b.rotate;e.boundaryLinks=angular.isDefined(g.boundaryLinks)?e.$parent.$eval(g.boundaryLinks):b.boundaryLinks,e.directionLinks=angular.isDefined(g.directionLinks)?e.$parent.$eval(g.directionLinks):b.directionLinks,k.init(l,b),g.maxSize&&e.$parent.$watch(a(g.maxSize),function(a){m=parseInt(a,10),k.render()});var o=k.render;k.render=function(){o(),e.page>0&&e.page<=e.totalPages&&(e.pages=j(e.page,e.totalPages))}}}}}]).directive("pager",["uibPagerConfig","$log","$paginationSuppressWarning",function(a,b,c){return{restrict:"EA",scope:{totalItems:"=",previousText:"@",nextText:"@",ngDisabled:"="},require:["pager","?ngModel"],controller:"PaginationController",controllerAs:"pagination",templateUrl:function(a,b){return b.templateUrl||"template/pagination/pager.html"},replace:!0,link:function(d,e,f,g){c||b.warn("pager is now deprecated. Use uib-pager instead.");var h=g[0],i=g[1];i&&(d.align=angular.isDefined(f.align)?d.$parent.$eval(f.align):a.align,h.init(i,a))}}}]),angular.module("ui.bootstrap.tooltip",["ui.bootstrap.position","ui.bootstrap.stackedMap"]).provider("$uibTooltip",function(){function a(a){var b=/[A-Z]/g,c="-";return a.replace(b,function(a,b){return(b?c:"")+a.toLowerCase()})}var b={placement:"top",animation:!0,popupDelay:0,popupCloseDelay:0,useContentExp:!1},c={mouseenter:"mouseleave",click:"click",focus:"blur",none:""},d={};this.options=function(a){angular.extend(d,a)},this.setTriggers=function(a){angular.extend(c,a)},this.$get=["$window","$compile","$timeout","$document","$uibPosition","$interpolate","$rootScope","$parse","$$stackedMap",function(e,f,g,h,i,j,k,l,m){var n=m.createNew();return h.on("keypress",function(a){if(27===a.which){var b=n.top();b&&(b.value.close(),n.removeTop(),b=null)}}),function(e,k,m,o){function p(a){var b=(a||o.trigger||m).split(" "),d=b.map(function(a){return c[a]||a});return{show:b,hide:d}}o=angular.extend({},b,d,o);var q=a(e),r=j.startSymbol(),s=j.endSymbol(),t="<div "+q+'-popup title="'+r+"title"+s+'" '+(o.useContentExp?'content-exp="contentExp()" ':'content="'+r+"content"+s+'" ')+'placement="'+r+"placement"+s+'" popup-class="'+r+"popupClass"+s+'" animation="animation" is-open="isOpen"origin-scope="origScope" style="visibility: hidden; display: block; top: -9999px; left: -9999px;"></div>';return{compile:function(a,b){var c=f(t);return function(a,b,d,f){function j(){L.isOpen?q():m()}function m(){(!K||a.$eval(d[k+"Enable"]))&&(u(),x(),L.popupDelay?F||(F=g(r,L.popupDelay,!1)):r())}function q(){s(),L.popupCloseDelay?G||(G=g(t,L.popupCloseDelay,!1)):t()}function r(){return s(),u(),L.content?(v(),void L.$evalAsync(function(){L.isOpen=!0,y(!0),Q()})):angular.noop}function s(){F&&(g.cancel(F),F=null),H&&(g.cancel(H),H=null)}function t(){s(),u(),L&&L.$evalAsync(function(){L.isOpen=!1,y(!1),L.animation?E||(E=g(w,150,!1)):w()})}function u(){G&&(g.cancel(G),G=null),E&&(g.cancel(E),E=null)}function v(){C||(D=L.$new(),C=c(D,function(a){I?h.find("body").append(a):b.after(a)}),z())}function w(){A(),E=null,C&&(C.remove(),C=null),D&&(D.$destroy(),D=null)}function x(){L.title=d[k+"Title"],O?L.content=O(a):L.content=d[e],L.popupClass=d[k+"Class"],L.placement=angular.isDefined(d[k+"Placement"])?d[k+"Placement"]:o.placement;var b=parseInt(d[k+"PopupDelay"],10),c=parseInt(d[k+"PopupCloseDelay"],10);L.popupDelay=isNaN(b)?o.popupDelay:b,L.popupCloseDelay=isNaN(c)?o.popupCloseDelay:c}function y(b){N&&angular.isFunction(N.assign)&&N.assign(a,b)}function z(){P.length=0,O?(P.push(a.$watch(O,function(a){L.content=a,!a&&L.isOpen&&t()})),P.push(D.$watch(function(){M||(M=!0,D.$$postDigest(function(){M=!1,L&&L.isOpen&&Q()}))}))):P.push(d.$observe(e,function(a){L.content=a,!a&&L.isOpen?t():Q()})),P.push(d.$observe(k+"Title",function(a){L.title=a,L.isOpen&&Q()})),P.push(d.$observe(k+"Placement",function(a){L.placement=a?a:o.placement,L.isOpen&&Q()}))}function A(){P.length&&(angular.forEach(P,function(a){a()}),P.length=0)}function B(){var a=d[k+"Trigger"];R(),J=p(a),"none"!==J.show&&J.show.forEach(function(a,c){a===J.hide[c]?b[0].addEventListener(a,j):a&&(b[0].addEventListener(a,m),J.hide[c].split(" ").forEach(function(a){b[0].addEventListener(a,q)})),b.on("keypress",function(a){27===a.which&&q()})})}var C,D,E,F,G,H,I=angular.isDefined(o.appendToBody)?o.appendToBody:!1,J=p(void 0),K=angular.isDefined(d[k+"Enable"]),L=a.$new(!0),M=!1,N=angular.isDefined(d[k+"IsOpen"])?l(d[k+"IsOpen"]):!1,O=o.useContentExp?l(d[e]):!1,P=[],Q=function(){C&&C.html()&&(H||(H=g(function(){C.css({top:0,left:0});var a=i.positionElements(b,C,L.placement,I);a.top+="px",a.left+="px",a.visibility="visible",C.css(a),H=null},0,!1)))};L.origScope=a,L.isOpen=!1,n.add(L,{close:t}),L.contentExp=function(){return L.content},d.$observe("disabled",function(a){a&&s(),a&&L.isOpen&&t()}),N&&a.$watch(N,function(a){L&&!a===L.isOpen&&j()});var R=function(){J.show.forEach(function(a){b.unbind(a,m)}),J.hide.forEach(function(a){a.split(" ").forEach(function(a){b[0].removeEventListener(a,q)})})};B();var S=a.$eval(d[k+"Animation"]);L.animation=angular.isDefined(S)?!!S:o.animation;var T=a.$eval(d[k+"AppendToBody"]);I=angular.isDefined(T)?T:I,I&&a.$on("$locationChangeSuccess",function(){L.isOpen&&t()}),a.$on("$destroy",function(){s(),u(),R(),w(),n.remove(L),L=null})}}}}}]}).directive("uibTooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest",function(a,b,c,d){return{link:function(e,f,g){var h,i,j,k=e.$eval(g.tooltipTemplateTranscludeScope),l=0,m=function(){i&&(i.remove(),i=null),h&&(h.$destroy(),h=null),j&&(a.leave(j).then(function(){i=null}),i=j,j=null)};e.$watch(b.parseAsResourceUrl(g.uibTooltipTemplateTransclude),function(b){var g=++l;b?(d(b,!0).then(function(d){if(g===l){var e=k.$new(),i=d,n=c(i)(e,function(b){m(),a.enter(b,f)});h=e,j=n,h.$emit("$includeContentLoaded",b)}},function(){g===l&&(m(),e.$emit("$includeContentError",b))}),e.$emit("$includeContentRequested",b)):m()}),e.$on("$destroy",m)}}}]).directive("uibTooltipClasses",function(){return{restrict:"A",link:function(a,b,c){a.placement&&b.addClass(a.placement),a.popupClass&&b.addClass(a.popupClass),a.animation()&&b.addClass(c.tooltipAnimationClass)}}}).directive("uibTooltipPopup",function(){return{replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-popup.html",link:function(a,b){b.addClass("tooltip")}}}).directive("uibTooltip",["$uibTooltip",function(a){return a("uibTooltip","tooltip","mouseenter")}]).directive("uibTooltipTemplatePopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/tooltip/tooltip-template-popup.html",link:function(a,b){b.addClass("tooltip")}}}).directive("uibTooltipTemplate",["$uibTooltip",function(a){return a("uibTooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("uibTooltipHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-html-popup.html",link:function(a,b){b.addClass("tooltip")}}}).directive("uibTooltipHtml",["$uibTooltip",function(a){return a("uibTooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]),angular.module("ui.bootstrap.tooltip").value("$tooltipSuppressWarning",!1).provider("$tooltip",["$uibTooltipProvider",function(a){angular.extend(this,a),this.$get=["$log","$tooltipSuppressWarning","$injector",function(b,c,d){return c||b.warn("$tooltip is now deprecated. Use $uibTooltip instead."),d.invoke(a.$get)}]}]).directive("tooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest","$log","$tooltipSuppressWarning",function(a,b,c,d,e,f){return{link:function(g,h,i){f||e.warn("tooltip-template-transclude is now deprecated. Use uib-tooltip-template-transclude instead.");var j,k,l,m=g.$eval(i.tooltipTemplateTranscludeScope),n=0,o=function(){k&&(k.remove(),k=null),j&&(j.$destroy(),j=null),l&&(a.leave(l).then(function(){k=null}),k=l,l=null)};g.$watch(b.parseAsResourceUrl(i.tooltipTemplateTransclude),function(b){var e=++n;b?(d(b,!0).then(function(d){if(e===n){var f=m.$new(),g=d,i=c(g)(f,function(b){o(),a.enter(b,h)});j=f,l=i,j.$emit("$includeContentLoaded",b)}},function(){e===n&&(o(),g.$emit("$includeContentError",b))}),g.$emit("$includeContentRequested",b)):o()}),g.$on("$destroy",o)}}}]).directive("tooltipClasses",["$log","$tooltipSuppressWarning",function(a,b){return{restrict:"A",link:function(c,d,e){b||a.warn("tooltip-classes is now deprecated. Use uib-tooltip-classes instead."),c.placement&&d.addClass(c.placement),c.popupClass&&d.addClass(c.popupClass),c.animation()&&d.addClass(e.tooltipAnimationClass)}}}]).directive("tooltipPopup",["$log","$tooltipSuppressWarning",function(a,b){return{replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-popup.html",link:function(c,d){b||a.warn("tooltip-popup is now deprecated. Use uib-tooltip-popup instead."),d.addClass("tooltip")}}}]).directive("tooltip",["$tooltip",function(a){return a("tooltip","tooltip","mouseenter")}]).directive("tooltipTemplatePopup",["$log","$tooltipSuppressWarning",function(a,b){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/tooltip/tooltip-template-popup.html",link:function(c,d){b||a.warn("tooltip-template-popup is now deprecated. Use uib-tooltip-template-popup instead."),d.addClass("tooltip")}}}]).directive("tooltipTemplate",["$tooltip",function(a){return a("tooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("tooltipHtmlPopup",["$log","$tooltipSuppressWarning",function(a,b){return{replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-html-popup.html",link:function(c,d){b||a.warn("tooltip-html-popup is now deprecated. Use uib-tooltip-html-popup instead."),d.addClass("tooltip")}}}]).directive("tooltipHtml",["$tooltip",function(a){return a("tooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]),angular.module("ui.bootstrap.popover",["ui.bootstrap.tooltip"]).directive("uibPopoverTemplatePopup",function(){return{replace:!0,scope:{title:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/popover/popover-template.html",link:function(a,b){b.addClass("popover")}}}).directive("uibPopoverTemplate",["$uibTooltip",function(a){return a("uibPopoverTemplate","popover","click",{useContentExp:!0})}]).directive("uibPopoverHtmlPopup",function(){return{replace:!0,scope:{contentExp:"&",title:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/popover/popover-html.html",link:function(a,b){b.addClass("popover")}}}).directive("uibPopoverHtml",["$uibTooltip",function(a){return a("uibPopoverHtml","popover","click",{useContentExp:!0})}]).directive("uibPopoverPopup",function(){return{replace:!0,scope:{title:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/popover/popover.html",link:function(a,b){b.addClass("popover")}}}).directive("uibPopover",["$uibTooltip",function(a){return a("uibPopover","popover","click")}]),angular.module("ui.bootstrap.popover").value("$popoverSuppressWarning",!1).directive("popoverTemplatePopup",["$log","$popoverSuppressWarning",function(a,b){return{replace:!0,scope:{title:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/popover/popover-template.html",link:function(c,d){b||a.warn("popover-template-popup is now deprecated. Use uib-popover-template-popup instead."),d.addClass("popover")}}}]).directive("popoverTemplate",["$tooltip",function(a){return a("popoverTemplate","popover","click",{useContentExp:!0})}]).directive("popoverHtmlPopup",["$log","$popoverSuppressWarning",function(a,b){return{replace:!0,scope:{contentExp:"&",title:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/popover/popover-html.html",link:function(c,d){b||a.warn("popover-html-popup is now deprecated. Use uib-popover-html-popup instead."),d.addClass("popover")}}}]).directive("popoverHtml",["$tooltip",function(a){return a("popoverHtml","popover","click",{useContentExp:!0})}]).directive("popoverPopup",["$log","$popoverSuppressWarning",function(a,b){return{replace:!0,scope:{title:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/popover/popover.html",link:function(c,d){b||a.warn("popover-popup is now deprecated. Use uib-popover-popup instead."),d.addClass("popover")}}}]).directive("popover",["$tooltip",function(a){return a("popover","popover","click")}]),angular.module("ui.bootstrap.progressbar",[]).constant("uibProgressConfig",{animate:!0,max:100}).controller("UibProgressController",["$scope","$attrs","uibProgressConfig",function(a,b,c){var d=this,e=angular.isDefined(b.animate)?a.$parent.$eval(b.animate):c.animate;this.bars=[],a.max=angular.isDefined(a.max)?a.max:c.max,this.addBar=function(b,c,f){e||c.css({transition:"none"}),this.bars.push(b),b.max=a.max,b.title=f&&angular.isDefined(f.title)?f.title:"progressbar",b.$watch("value",function(a){b.recalculatePercentage()}),b.recalculatePercentage=function(){var a=d.bars.reduce(function(a,b){return b.percent=+(100*b.value/b.max).toFixed(2),a+b.percent},0);a>100&&(b.percent-=a-100)},b.$on("$destroy",function(){c=null,d.removeBar(b)})},this.removeBar=function(a){this.bars.splice(this.bars.indexOf(a),1),this.bars.forEach(function(a){a.recalculatePercentage()})},a.$watch("max",function(b){d.bars.forEach(function(b){b.max=a.max,b.recalculatePercentage()})})}]).directive("uibProgress",function(){return{replace:!0,transclude:!0,controller:"UibProgressController",require:"uibProgress",scope:{max:"=?"},templateUrl:"template/progressbar/progress.html"}}).directive("uibBar",function(){return{replace:!0,transclude:!0,require:"^uibProgress",scope:{value:"=",type:"@"},templateUrl:"template/progressbar/bar.html",link:function(a,b,c,d){d.addBar(a,b,c)}}}).directive("uibProgressbar",function(){return{replace:!0,transclude:!0,controller:"UibProgressController",scope:{value:"=",max:"=?",type:"@"},templateUrl:"template/progressbar/progressbar.html",link:function(a,b,c,d){d.addBar(a,angular.element(b.children()[0]),{title:c.title})}}}),angular.module("ui.bootstrap.progressbar").value("$progressSuppressWarning",!1).controller("ProgressController",["$scope","$attrs","uibProgressConfig","$log","$progressSuppressWarning",function(a,b,c,d,e){e||d.warn("ProgressController is now deprecated. Use UibProgressController instead.");var f=this,g=angular.isDefined(b.animate)?a.$parent.$eval(b.animate):c.animate;this.bars=[],a.max=angular.isDefined(a.max)?a.max:c.max,this.addBar=function(b,c,d){g||c.css({transition:"none"}),this.bars.push(b),b.max=a.max,b.title=d&&angular.isDefined(d.title)?d.title:"progressbar",b.$watch("value",function(a){b.recalculatePercentage()}),b.recalculatePercentage=function(){b.percent=+(100*b.value/b.max).toFixed(2);var a=f.bars.reduce(function(a,b){return a+b.percent},0);a>100&&(b.percent-=a-100)},b.$on("$destroy",function(){c=null,f.removeBar(b)})},this.removeBar=function(a){this.bars.splice(this.bars.indexOf(a),1)},a.$watch("max",function(b){f.bars.forEach(function(b){b.max=a.max,b.recalculatePercentage()})})}]).directive("progress",["$log","$progressSuppressWarning",function(a,b){return{replace:!0,transclude:!0,controller:"ProgressController",require:"progress",scope:{max:"=?",title:"@?"},templateUrl:"template/progressbar/progress.html",link:function(){b||a.warn("progress is now deprecated. Use uib-progress instead.")}}}]).directive("bar",["$log","$progressSuppressWarning",function(a,b){return{replace:!0,transclude:!0,require:"^progress",scope:{value:"=",type:"@"},templateUrl:"template/progressbar/bar.html",link:function(c,d,e,f){b||a.warn("bar is now deprecated. Use uib-bar instead."),f.addBar(c,d)}}}]).directive("progressbar",["$log","$progressSuppressWarning",function(a,b){return{replace:!0,transclude:!0,controller:"ProgressController",scope:{value:"=",max:"=?",type:"@"},templateUrl:"template/progressbar/progressbar.html",link:function(c,d,e,f){b||a.warn("progressbar is now deprecated. Use uib-progressbar instead."),f.addBar(c,angular.element(d.children()[0]),{title:e.title})}}}]),angular.module("ui.bootstrap.rating",[]).constant("uibRatingConfig",{max:5,stateOn:null,stateOff:null,titles:["one","two","three","four","five"]}).controller("UibRatingController",["$scope","$attrs","uibRatingConfig",function(a,b,c){var d={$setViewValue:angular.noop};this.init=function(e){d=e,d.$render=this.render,d.$formatters.push(function(a){return angular.isNumber(a)&&a<<0!==a&&(a=Math.round(a)),a}),this.stateOn=angular.isDefined(b.stateOn)?a.$parent.$eval(b.stateOn):c.stateOn,this.stateOff=angular.isDefined(b.stateOff)?a.$parent.$eval(b.stateOff):c.stateOff;var f=angular.isDefined(b.titles)?a.$parent.$eval(b.titles):c.titles;this.titles=angular.isArray(f)&&f.length>0?f:c.titles;var g=angular.isDefined(b.ratingStates)?a.$parent.$eval(b.ratingStates):new Array(angular.isDefined(b.max)?a.$parent.$eval(b.max):c.max);a.range=this.buildTemplateObjects(g)},this.buildTemplateObjects=function(a){for(var b=0,c=a.length;c>b;b++)a[b]=angular.extend({index:b},{stateOn:this.stateOn,stateOff:this.stateOff,title:this.getTitle(b)},a[b]);return a},this.getTitle=function(a){return a>=this.titles.length?a+1:this.titles[a]},a.rate=function(b){!a.readonly&&b>=0&&b<=a.range.length&&(d.$setViewValue(d.$viewValue===b?0:b),d.$render())},a.enter=function(b){a.readonly||(a.value=b),a.onHover({value:b})},a.reset=function(){a.value=d.$viewValue,a.onLeave()},a.onKeydown=function(b){/(37|38|39|40)/.test(b.which)&&(b.preventDefault(),b.stopPropagation(),a.rate(a.value+(38===b.which||39===b.which?1:-1)))},this.render=function(){a.value=d.$viewValue}}]).directive("uibRating",function(){return{require:["uibRating","ngModel"],scope:{readonly:"=?",onHover:"&",onLeave:"&"},controller:"UibRatingController",templateUrl:"template/rating/rating.html",replace:!0,link:function(a,b,c,d){var e=d[0],f=d[1];e.init(f)}}}),angular.module("ui.bootstrap.rating").value("$ratingSuppressWarning",!1).controller("RatingController",["$scope","$attrs","$controller","$log","$ratingSuppressWarning",function(a,b,c,d,e){e||d.warn("RatingController is now deprecated. Use UibRatingController instead."),angular.extend(this,c("UibRatingController",{$scope:a,$attrs:b}))}]).directive("rating",["$log","$ratingSuppressWarning",function(a,b){return{require:["rating","ngModel"],scope:{readonly:"=?",onHover:"&",onLeave:"&"},controller:"RatingController",templateUrl:"template/rating/rating.html",replace:!0,link:function(c,d,e,f){b||a.warn("rating is now deprecated. Use uib-rating instead.");var g=f[0],h=f[1];g.init(h)}}}]),angular.module("ui.bootstrap.tabs",[]).controller("UibTabsetController",["$scope",function(a){var b=this,c=b.tabs=a.tabs=[];b.select=function(a){angular.forEach(c,function(b){b.active&&b!==a&&(b.active=!1,b.onDeselect(),a.selectCalled=!1)}),a.active=!0,a.selectCalled||(a.onSelect(),a.selectCalled=!0)},b.addTab=function(a){c.push(a),1===c.length&&a.active!==!1?a.active=!0:a.active?b.select(a):a.active=!1},b.removeTab=function(a){var e=c.indexOf(a);if(a.active&&c.length>1&&!d){var f=e==c.length-1?e-1:e+1;b.select(c[f])}c.splice(e,1)};var d;a.$on("$destroy",function(){d=!0})}]).directive("uibTabset",function(){return{restrict:"EA",transclude:!0,replace:!0,scope:{type:"@"},controller:"UibTabsetController",templateUrl:"template/tabs/tabset.html",link:function(a,b,c){a.vertical=angular.isDefined(c.vertical)?a.$parent.$eval(c.vertical):!1,a.justified=angular.isDefined(c.justified)?a.$parent.$eval(c.justified):!1}}}).directive("uibTab",["$parse",function(a){return{require:"^uibTabset",restrict:"EA",replace:!0,templateUrl:"template/tabs/tab.html",transclude:!0,scope:{active:"=?",heading:"@",onSelect:"&select",onDeselect:"&deselect"},controller:function(){},link:function(b,c,d,e,f){b.$watch("active",function(a){a&&e.select(b)}),b.disabled=!1,d.disable&&b.$parent.$watch(a(d.disable),function(a){b.disabled=!!a}),b.select=function(){b.disabled||(b.active=!0)},e.addTab(b),b.$on("$destroy",function(){e.removeTab(b)}),b.$transcludeFn=f}}}]).directive("uibTabHeadingTransclude",function(){return{restrict:"A",require:["?^uibTab","?^tab"],link:function(a,b){a.$watch("headingElement",function(a){a&&(b.html(""),b.append(a))})}}}).directive("uibTabContentTransclude",function(){function a(a){return a.tagName&&(a.hasAttribute("tab-heading")||a.hasAttribute("data-tab-heading")||a.hasAttribute("x-tab-heading")||a.hasAttribute("uib-tab-heading")||a.hasAttribute("data-uib-tab-heading")||a.hasAttribute("x-uib-tab-heading")||"tab-heading"===a.tagName.toLowerCase()||"data-tab-heading"===a.tagName.toLowerCase()||"x-tab-heading"===a.tagName.toLowerCase()||"uib-tab-heading"===a.tagName.toLowerCase()||"data-uib-tab-heading"===a.tagName.toLowerCase()||"x-uib-tab-heading"===a.tagName.toLowerCase())}return{restrict:"A",require:["?^uibTabset","?^tabset"],link:function(b,c,d){var e=b.$eval(d.uibTabContentTransclude);e.$transcludeFn(e.$parent,function(b){angular.forEach(b,function(b){a(b)?e.headingElement=b:c.append(b)})})}}}),angular.module("ui.bootstrap.tabs").value("$tabsSuppressWarning",!1).controller("TabsetController",["$scope","$controller","$log","$tabsSuppressWarning",function(a,b,c,d){d||c.warn("TabsetController is now deprecated. Use UibTabsetController instead."),angular.extend(this,b("UibTabsetController",{$scope:a}))}]).directive("tabset",["$log","$tabsSuppressWarning",function(a,b){return{restrict:"EA",transclude:!0,replace:!0,scope:{type:"@"},controller:"TabsetController",templateUrl:"template/tabs/tabset.html",link:function(c,d,e){b||a.warn("tabset is now deprecated. Use uib-tabset instead."),c.vertical=angular.isDefined(e.vertical)?c.$parent.$eval(e.vertical):!1,c.justified=angular.isDefined(e.justified)?c.$parent.$eval(e.justified):!1}}}]).directive("tab",["$parse","$log","$tabsSuppressWarning",function(a,b,c){return{require:"^tabset",restrict:"EA",replace:!0,templateUrl:"template/tabs/tab.html",transclude:!0,scope:{active:"=?",heading:"@",onSelect:"&select",onDeselect:"&deselect"},controller:function(){},link:function(d,e,f,g,h){c||b.warn("tab is now deprecated. Use uib-tab instead."),d.$watch("active",function(a){a&&g.select(d)}),d.disabled=!1,f.disable&&d.$parent.$watch(a(f.disable),function(a){d.disabled=!!a}),d.select=function(){d.disabled||(d.active=!0)},g.addTab(d),d.$on("$destroy",function(){g.removeTab(d)}),d.$transcludeFn=h}}}]).directive("tabHeadingTransclude",["$log","$tabsSuppressWarning",function(a,b){return{restrict:"A",require:"^tab",link:function(c,d){b||a.warn("tab-heading-transclude is now deprecated. Use uib-tab-heading-transclude instead."),c.$watch("headingElement",function(a){a&&(d.html(""),d.append(a))})}}}]).directive("tabContentTransclude",["$log","$tabsSuppressWarning",function(a,b){function c(a){return a.tagName&&(a.hasAttribute("tab-heading")||a.hasAttribute("data-tab-heading")||a.hasAttribute("x-tab-heading")||"tab-heading"===a.tagName.toLowerCase()||"data-tab-heading"===a.tagName.toLowerCase()||"x-tab-heading"===a.tagName.toLowerCase())}return{restrict:"A",require:"^tabset",link:function(d,e,f){b||a.warn("tab-content-transclude is now deprecated. Use uib-tab-content-transclude instead.");var g=d.$eval(f.tabContentTransclude);g.$transcludeFn(g.$parent,function(a){angular.forEach(a,function(a){c(a)?g.headingElement=a:e.append(a)})})}}}]),angular.module("ui.bootstrap.timepicker",[]).constant("uibTimepickerConfig",{hourStep:1,minuteStep:1,showMeridian:!0,meridians:null,readonlyInput:!1,mousewheel:!0,arrowkeys:!0,showSpinners:!0}).controller("UibTimepickerController",["$scope","$element","$attrs","$parse","$log","$locale","uibTimepickerConfig",function(a,b,c,d,e,f,g){function h(){var b=parseInt(a.hours,10),c=a.showMeridian?b>0&&13>b:b>=0&&24>b;return c?(a.showMeridian&&(12===b&&(b=0),a.meridian===r[1]&&(b+=12)),b):void 0}function i(){var b=parseInt(a.minutes,10);return b>=0&&60>b?b:void 0}function j(a){return angular.isDefined(a)&&a.toString().length<2?"0"+a:a.toString()}function k(a){l(),q.$setViewValue(new Date(p)),m(a)}function l(){q.$setValidity("time",!0),a.invalidHours=!1,a.invalidMinutes=!1}function m(b){var c=p.getHours(),d=p.getMinutes();a.showMeridian&&(c=0===c||12===c?12:c%12),a.hours="h"===b?c:j(c),"m"!==b&&(a.minutes=j(d)),a.meridian=p.getHours()<12?r[0]:r[1]}function n(a,b){var c=new Date(a.getTime()+6e4*b),d=new Date(a);return d.setHours(c.getHours(),c.getMinutes()),d}function o(a){p=n(p,a),k()}var p=new Date,q={$setViewValue:angular.noop},r=angular.isDefined(c.meridians)?a.$parent.$eval(c.meridians):g.meridians||f.DATETIME_FORMATS.AMPMS;a.tabindex=angular.isDefined(c.tabindex)?c.tabindex:0,b.removeAttr("tabindex"),this.init=function(b,d){q=b,q.$render=this.render,q.$formatters.unshift(function(a){return a?new Date(a):null});var e=d.eq(0),f=d.eq(1),h=angular.isDefined(c.mousewheel)?a.$parent.$eval(c.mousewheel):g.mousewheel;h&&this.setupMousewheelEvents(e,f);var i=angular.isDefined(c.arrowkeys)?a.$parent.$eval(c.arrowkeys):g.arrowkeys;i&&this.setupArrowkeyEvents(e,f),a.readonlyInput=angular.isDefined(c.readonlyInput)?a.$parent.$eval(c.readonlyInput):g.readonlyInput,this.setupInputEvents(e,f)};var s=g.hourStep;c.hourStep&&a.$parent.$watch(d(c.hourStep),function(a){s=parseInt(a,10)});var t=g.minuteStep;c.minuteStep&&a.$parent.$watch(d(c.minuteStep),function(a){t=parseInt(a,10)});var u;a.$parent.$watch(d(c.min),function(a){var b=new Date(a);u=isNaN(b)?void 0:b});var v;a.$parent.$watch(d(c.max),function(a){var b=new Date(a);v=isNaN(b)?void 0:b}),a.noIncrementHours=function(){var a=n(p,60*s);
return a>v||p>a&&u>a},a.noDecrementHours=function(){var a=n(p,60*-s);return u>a||a>p&&a>v},a.noIncrementMinutes=function(){var a=n(p,t);return a>v||p>a&&u>a},a.noDecrementMinutes=function(){var a=n(p,-t);return u>a||a>p&&a>v},a.noToggleMeridian=function(){return p.getHours()<13?n(p,720)>v:n(p,-720)<u},a.showMeridian=g.showMeridian,c.showMeridian&&a.$parent.$watch(d(c.showMeridian),function(b){if(a.showMeridian=!!b,q.$error.time){var c=h(),d=i();angular.isDefined(c)&&angular.isDefined(d)&&(p.setHours(c),k())}else m()}),this.setupMousewheelEvents=function(b,c){var d=function(a){a.originalEvent&&(a=a.originalEvent);var b=a.wheelDelta?a.wheelDelta:-a.deltaY;return a.detail||b>0};b.bind("mousewheel wheel",function(b){a.$apply(d(b)?a.incrementHours():a.decrementHours()),b.preventDefault()}),c.bind("mousewheel wheel",function(b){a.$apply(d(b)?a.incrementMinutes():a.decrementMinutes()),b.preventDefault()})},this.setupArrowkeyEvents=function(b,c){b.bind("keydown",function(b){38===b.which?(b.preventDefault(),a.incrementHours(),a.$apply()):40===b.which&&(b.preventDefault(),a.decrementHours(),a.$apply())}),c.bind("keydown",function(b){38===b.which?(b.preventDefault(),a.incrementMinutes(),a.$apply()):40===b.which&&(b.preventDefault(),a.decrementMinutes(),a.$apply())})},this.setupInputEvents=function(b,c){if(a.readonlyInput)return a.updateHours=angular.noop,void(a.updateMinutes=angular.noop);var d=function(b,c){q.$setViewValue(null),q.$setValidity("time",!1),angular.isDefined(b)&&(a.invalidHours=b),angular.isDefined(c)&&(a.invalidMinutes=c)};a.updateHours=function(){var a=h(),b=i();angular.isDefined(a)&&angular.isDefined(b)?(p.setHours(a),u>p||p>v?d(!0):k("h")):d(!0)},b.bind("blur",function(b){!a.invalidHours&&a.hours<10&&a.$apply(function(){a.hours=j(a.hours)})}),a.updateMinutes=function(){var a=i(),b=h();angular.isDefined(a)&&angular.isDefined(b)?(p.setMinutes(a),u>p||p>v?d(void 0,!0):k("m")):d(void 0,!0)},c.bind("blur",function(b){!a.invalidMinutes&&a.minutes<10&&a.$apply(function(){a.minutes=j(a.minutes)})})},this.render=function(){var b=q.$viewValue;isNaN(b)?(q.$setValidity("time",!1),e.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')):(b&&(p=b),u>p||p>v?(q.$setValidity("time",!1),a.invalidHours=!0,a.invalidMinutes=!0):l(),m())},a.showSpinners=angular.isDefined(c.showSpinners)?a.$parent.$eval(c.showSpinners):g.showSpinners,a.incrementHours=function(){a.noIncrementHours()||o(60*s)},a.decrementHours=function(){a.noDecrementHours()||o(60*-s)},a.incrementMinutes=function(){a.noIncrementMinutes()||o(t)},a.decrementMinutes=function(){a.noDecrementMinutes()||o(-t)},a.toggleMeridian=function(){a.noToggleMeridian()||o(720*(p.getHours()<12?1:-1))}}]).directive("uibTimepicker",function(){return{restrict:"EA",require:["uibTimepicker","?^ngModel"],controller:"UibTimepickerController",controllerAs:"timepicker",replace:!0,scope:{},templateUrl:function(a,b){return b.templateUrl||"template/timepicker/timepicker.html"},link:function(a,b,c,d){var e=d[0],f=d[1];f&&e.init(f,b.find("input"))}}}),angular.module("ui.bootstrap.timepicker").value("$timepickerSuppressWarning",!1).controller("TimepickerController",["$scope","$element","$attrs","$controller","$log","$timepickerSuppressWarning",function(a,b,c,d,e,f){f||e.warn("TimepickerController is now deprecated. Use UibTimepickerController instead."),angular.extend(this,d("UibTimepickerController",{$scope:a,$element:b,$attrs:c}))}]).directive("timepicker",["$log","$timepickerSuppressWarning",function(a,b){return{restrict:"EA",require:["timepicker","?^ngModel"],controller:"TimepickerController",controllerAs:"timepicker",replace:!0,scope:{},templateUrl:function(a,b){return b.templateUrl||"template/timepicker/timepicker.html"},link:function(c,d,e,f){b||a.warn("timepicker is now deprecated. Use uib-timepicker instead.");var g=f[0],h=f[1];h&&g.init(h,d.find("input"))}}}]),angular.module("ui.bootstrap.typeahead",["ui.bootstrap.position"]).factory("uibTypeaheadParser",["$parse",function(a){var b=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;return{parse:function(c){var d=c.match(b);if(!d)throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "'+c+'".');return{itemName:d[3],source:a(d[4]),viewMapper:a(d[2]||d[1]),modelMapper:a(d[1])}}}}]).controller("UibTypeaheadController",["$scope","$element","$attrs","$compile","$parse","$q","$timeout","$document","$window","$rootScope","$uibPosition","uibTypeaheadParser",function(a,b,c,d,e,f,g,h,i,j,k,l){function m(){K.moveInProgress||(K.moveInProgress=!0,K.$digest()),S&&g.cancel(S),S=g(function(){K.matches.length&&n(),K.moveInProgress=!1},r)}function n(){K.position=C?k.offset(b):k.position(b),K.position.top+=b.prop("offsetHeight")}var o,p,q=[9,13,27,38,40],r=200,s=a.$eval(c.typeaheadMinLength);s||0===s||(s=1);var t,u,v=a.$eval(c.typeaheadWaitMs)||0,w=a.$eval(c.typeaheadEditable)!==!1,x=e(c.typeaheadLoading).assign||angular.noop,y=e(c.typeaheadOnSelect),z=angular.isDefined(c.typeaheadSelectOnBlur)?a.$eval(c.typeaheadSelectOnBlur):!1,A=e(c.typeaheadNoResults).assign||angular.noop,B=c.typeaheadInputFormatter?e(c.typeaheadInputFormatter):void 0,C=c.typeaheadAppendToBody?a.$eval(c.typeaheadAppendToBody):!1,D=c.typeaheadAppendToElementId||!1,E=a.$eval(c.typeaheadFocusFirst)!==!1,F=c.typeaheadSelectOnExact?a.$eval(c.typeaheadSelectOnExact):!1,G=e(c.ngModel),H=e(c.ngModel+"($$$p)"),I=function(b,c){return angular.isFunction(G(a))&&p&&p.$options&&p.$options.getterSetter?H(b,{$$$p:c}):G.assign(b,c)},J=l.parse(c.uibTypeahead),K=a.$new(),L=a.$on("$destroy",function(){K.$destroy()});K.$on("$destroy",L);var M="typeahead-"+K.$id+"-"+Math.floor(1e4*Math.random());b.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":M});var N=angular.element("<div uib-typeahead-popup></div>");N.attr({id:M,matches:"matches",active:"activeIdx",select:"select(activeIdx)","move-in-progress":"moveInProgress",query:"query",position:"position"}),angular.isDefined(c.typeaheadTemplateUrl)&&N.attr("template-url",c.typeaheadTemplateUrl),angular.isDefined(c.typeaheadPopupTemplateUrl)&&N.attr("popup-template-url",c.typeaheadPopupTemplateUrl);var O=function(){K.matches=[],K.activeIdx=-1,b.attr("aria-expanded",!1)},P=function(a){return M+"-option-"+a};K.$watch("activeIdx",function(a){0>a?b.removeAttr("aria-activedescendant"):b.attr("aria-activedescendant",P(a))});var Q=function(a,b){return K.matches.length>b&&a?a.toUpperCase()===K.matches[b].label.toUpperCase():!1},R=function(c){var d={$viewValue:c};x(a,!0),A(a,!1),f.when(J.source(a,d)).then(function(e){var f=c===o.$viewValue;if(f&&t)if(e&&e.length>0){K.activeIdx=E?0:-1,A(a,!1),K.matches.length=0;for(var g=0;g<e.length;g++)d[J.itemName]=e[g],K.matches.push({id:P(g),label:J.viewMapper(K,d),model:e[g]});K.query=c,n(),b.attr("aria-expanded",!0),F&&1===K.matches.length&&Q(c,0)&&K.select(0)}else O(),A(a,!0);f&&x(a,!1)},function(){O(),x(a,!1),A(a,!0)})};C&&(angular.element(i).bind("resize",m),h.find("body").bind("scroll",m));var S;K.moveInProgress=!1,K.query=void 0;var T,U=function(a){T=g(function(){R(a)},v)},V=function(){T&&g.cancel(T)};O(),K.select=function(d){var e,f,h={};u=!0,h[J.itemName]=f=K.matches[d].model,e=J.modelMapper(a,h),I(a,e),o.$setValidity("editable",!0),o.$setValidity("parse",!0),y(a,{$item:f,$model:e,$label:J.viewMapper(a,h)}),O(),K.$eval(c.typeaheadFocusOnSelect)!==!1&&g(function(){b[0].focus()},0,!1)},b.bind("keydown",function(a){if(0!==K.matches.length&&-1!==q.indexOf(a.which)){if(-1===K.activeIdx&&(9===a.which||13===a.which))return O(),void K.$digest();a.preventDefault(),40===a.which?(K.activeIdx=(K.activeIdx+1)%K.matches.length,K.$digest()):38===a.which?(K.activeIdx=(K.activeIdx>0?K.activeIdx:K.matches.length)-1,K.$digest()):13===a.which||9===a.which?K.$apply(function(){K.select(K.activeIdx)}):27===a.which&&(a.stopPropagation(),O(),K.$digest())}}),b.bind("blur",function(){z&&K.matches.length&&-1!==K.activeIdx&&!u&&(u=!0,K.$apply(function(){K.select(K.activeIdx)})),t=!1,u=!1});var W=function(a){b[0]!==a.target&&3!==a.which&&0!==K.matches.length&&(O(),j.$$phase||K.$digest())};h.bind("click",W),a.$on("$destroy",function(){h.unbind("click",W),(C||D)&&X.remove(),C&&(angular.element(i).unbind("resize",m),h.find("body").unbind("scroll",m)),N.remove()});var X=d(N)(K);C?h.find("body").append(X):D!==!1?angular.element(h[0].getElementById(D)).append(X):b.after(X),this.init=function(b,c){o=b,p=c,o.$parsers.unshift(function(b){return t=!0,0===s||b&&b.length>=s?v>0?(V(),U(b)):R(b):(x(a,!1),V(),O()),w?b:b?void o.$setValidity("editable",!1):(o.$setValidity("editable",!0),null)}),o.$formatters.push(function(b){var c,d,e={};return w||o.$setValidity("editable",!0),B?(e.$model=b,B(a,e)):(e[J.itemName]=b,c=J.viewMapper(a,e),e[J.itemName]=void 0,d=J.viewMapper(a,e),c!==d?c:b)})}}]).directive("uibTypeahead",function(){return{controller:"UibTypeaheadController",require:["ngModel","^?ngModelOptions","uibTypeahead"],link:function(a,b,c,d){d[2].init(d[0],d[1])}}}).directive("uibTypeaheadPopup",function(){return{scope:{matches:"=",query:"=",active:"=",position:"&",moveInProgress:"=",select:"&"},replace:!0,templateUrl:function(a,b){return b.popupTemplateUrl||"template/typeahead/typeahead-popup.html"},link:function(a,b,c){a.templateUrl=c.templateUrl,a.isOpen=function(){return a.matches.length>0},a.isActive=function(b){return a.active==b},a.selectActive=function(b){a.active=b},a.selectMatch=function(b){a.select({activeIdx:b})}}}}).directive("uibTypeaheadMatch",["$templateRequest","$compile","$parse",function(a,b,c){return{scope:{index:"=",match:"=",query:"="},link:function(d,e,f){var g=c(f.templateUrl)(d.$parent)||"template/typeahead/typeahead-match.html";a(g).then(function(a){b(a.trim())(d,function(a){e.replaceWith(a)})})}}}]).filter("uibTypeaheadHighlight",["$sce","$injector","$log",function(a,b,c){function d(a){return a.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}function e(a){return/<.*>/g.test(a)}var f;return f=b.has("$sanitize"),function(b,g){return!f&&e(b)&&c.warn("Unsafe use of typeahead please use ngSanitize"),b=g?(""+b).replace(new RegExp(d(g),"gi"),"<strong>$&</strong>"):b,f||(b=a.trustAsHtml(b)),b}}]),angular.module("ui.bootstrap.typeahead").value("$typeaheadSuppressWarning",!1).service("typeaheadParser",["$parse","uibTypeaheadParser","$log","$typeaheadSuppressWarning",function(a,b,c,d){return d||c.warn("typeaheadParser is now deprecated. Use uibTypeaheadParser instead."),b}]).directive("typeahead",["$compile","$parse","$q","$timeout","$document","$window","$rootScope","$uibPosition","typeaheadParser","$log","$typeaheadSuppressWarning",function(a,b,c,d,e,f,g,h,i,j,k){var l=[9,13,27,38,40],m=200;return{require:["ngModel","^?ngModelOptions"],link:function(n,o,p,q){function r(){N.moveInProgress||(N.moveInProgress=!0,N.$digest()),V&&d.cancel(V),V=d(function(){N.matches.length&&s(),N.moveInProgress=!1},m)}function s(){N.position=F?h.offset(o):h.position(o),N.position.top+=o.prop("offsetHeight")}k||j.warn("typeahead is now deprecated. Use uib-typeahead instead.");var t=q[0],u=q[1],v=n.$eval(p.typeaheadMinLength);v||0===v||(v=1);var w,x,y=n.$eval(p.typeaheadWaitMs)||0,z=n.$eval(p.typeaheadEditable)!==!1,A=b(p.typeaheadLoading).assign||angular.noop,B=b(p.typeaheadOnSelect),C=angular.isDefined(p.typeaheadSelectOnBlur)?n.$eval(p.typeaheadSelectOnBlur):!1,D=b(p.typeaheadNoResults).assign||angular.noop,E=p.typeaheadInputFormatter?b(p.typeaheadInputFormatter):void 0,F=p.typeaheadAppendToBody?n.$eval(p.typeaheadAppendToBody):!1,G=p.typeaheadAppendToElementId||!1,H=n.$eval(p.typeaheadFocusFirst)!==!1,I=p.typeaheadSelectOnExact?n.$eval(p.typeaheadSelectOnExact):!1,J=b(p.ngModel),K=b(p.ngModel+"($$$p)"),L=function(a,b){return angular.isFunction(J(n))&&u&&u.$options&&u.$options.getterSetter?K(a,{$$$p:b}):J.assign(a,b)},M=i.parse(p.typeahead),N=n.$new(),O=n.$on("$destroy",function(){N.$destroy()});N.$on("$destroy",O);var P="typeahead-"+N.$id+"-"+Math.floor(1e4*Math.random());o.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":P});var Q=angular.element("<div typeahead-popup></div>");Q.attr({id:P,matches:"matches",active:"activeIdx",select:"select(activeIdx)","move-in-progress":"moveInProgress",query:"query",position:"position"}),angular.isDefined(p.typeaheadTemplateUrl)&&Q.attr("template-url",p.typeaheadTemplateUrl),angular.isDefined(p.typeaheadPopupTemplateUrl)&&Q.attr("popup-template-url",p.typeaheadPopupTemplateUrl);var R=function(){N.matches=[],N.activeIdx=-1,o.attr("aria-expanded",!1)},S=function(a){return P+"-option-"+a};N.$watch("activeIdx",function(a){0>a?o.removeAttr("aria-activedescendant"):o.attr("aria-activedescendant",S(a))});var T=function(a,b){return N.matches.length>b&&a?a.toUpperCase()===N.matches[b].label.toUpperCase():!1},U=function(a){var b={$viewValue:a};A(n,!0),D(n,!1),c.when(M.source(n,b)).then(function(c){var d=a===t.$viewValue;if(d&&w)if(c&&c.length>0){N.activeIdx=H?0:-1,D(n,!1),N.matches.length=0;for(var e=0;e<c.length;e++)b[M.itemName]=c[e],N.matches.push({id:S(e),label:M.viewMapper(N,b),model:c[e]});N.query=a,s(),o.attr("aria-expanded",!0),I&&1===N.matches.length&&T(a,0)&&N.select(0)}else R(),D(n,!0);d&&A(n,!1)},function(){R(),A(n,!1),D(n,!0)})};F&&(angular.element(f).bind("resize",r),e.find("body").bind("scroll",r));var V;N.moveInProgress=!1,R(),N.query=void 0;var W,X=function(a){W=d(function(){U(a)},y)},Y=function(){W&&d.cancel(W)};t.$parsers.unshift(function(a){return w=!0,0===v||a&&a.length>=v?y>0?(Y(),X(a)):U(a):(A(n,!1),Y(),R()),z?a:a?void t.$setValidity("editable",!1):(t.$setValidity("editable",!0),null)}),t.$formatters.push(function(a){var b,c,d={};return z||t.$setValidity("editable",!0),E?(d.$model=a,E(n,d)):(d[M.itemName]=a,b=M.viewMapper(n,d),d[M.itemName]=void 0,c=M.viewMapper(n,d),b!==c?b:a)}),N.select=function(a){var b,c,e={};x=!0,e[M.itemName]=c=N.matches[a].model,b=M.modelMapper(n,e),L(n,b),t.$setValidity("editable",!0),t.$setValidity("parse",!0),B(n,{$item:c,$model:b,$label:M.viewMapper(n,e)}),R(),N.$eval(p.typeaheadFocusOnSelect)!==!1&&d(function(){o[0].focus()},0,!1)},o.bind("keydown",function(a){if(0!==N.matches.length&&-1!==l.indexOf(a.which)){if(-1===N.activeIdx&&(9===a.which||13===a.which))return R(),void N.$digest();a.preventDefault(),40===a.which?(N.activeIdx=(N.activeIdx+1)%N.matches.length,N.$digest()):38===a.which?(N.activeIdx=(N.activeIdx>0?N.activeIdx:N.matches.length)-1,N.$digest()):13===a.which||9===a.which?N.$apply(function(){N.select(N.activeIdx)}):27===a.which&&(a.stopPropagation(),R(),N.$digest())}}),o.bind("blur",function(){C&&N.matches.length&&-1!==N.activeIdx&&!x&&(x=!0,N.$apply(function(){N.select(N.activeIdx)})),w=!1,x=!1});var Z=function(a){o[0]!==a.target&&3!==a.which&&0!==N.matches.length&&(R(),g.$$phase||N.$digest())};e.bind("click",Z),n.$on("$destroy",function(){e.unbind("click",Z),(F||G)&&$.remove(),F&&(angular.element(f).unbind("resize",r),e.find("body").unbind("scroll",r)),Q.remove()});var $=a(Q)(N);F?e.find("body").append($):G!==!1?angular.element(e[0].getElementById(G)).append($):o.after($)}}}]).directive("typeaheadPopup",["$typeaheadSuppressWarning","$log",function(a,b){return{scope:{matches:"=",query:"=",active:"=",position:"&",moveInProgress:"=",select:"&"},replace:!0,templateUrl:function(a,b){return b.popupTemplateUrl||"template/typeahead/typeahead-popup.html"},link:function(c,d,e){a||b.warn("typeahead-popup is now deprecated. Use uib-typeahead-popup instead."),c.templateUrl=e.templateUrl,c.isOpen=function(){return c.matches.length>0},c.isActive=function(a){return c.active==a},c.selectActive=function(a){c.active=a},c.selectMatch=function(a){c.select({activeIdx:a})}}}}]).directive("typeaheadMatch",["$templateRequest","$compile","$parse","$typeaheadSuppressWarning","$log",function(a,b,c,d,e){return{restrict:"EA",scope:{index:"=",match:"=",query:"="},link:function(f,g,h){d||e.warn("typeahead-match is now deprecated. Use uib-typeahead-match instead.");var i=c(h.templateUrl)(f.$parent)||"template/typeahead/typeahead-match.html";a(i).then(function(a){b(a.trim())(f,function(a){g.replaceWith(a)})})}}}]).filter("typeaheadHighlight",["$sce","$injector","$log","$typeaheadSuppressWarning",function(a,b,c,d){function e(a){return a.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}function f(a){return/<.*>/g.test(a)}var g;return g=b.has("$sanitize"),function(b,h){return d||c.warn("typeaheadHighlight is now deprecated. Use uibTypeaheadHighlight instead."),!g&&f(b)&&c.warn("Unsafe use of typeahead please use ngSanitize"),b=h?(""+b).replace(new RegExp(e(h),"gi"),"<strong>$&</strong>"):b,g||(b=a.trustAsHtml(b)),b}}]),angular.module("template/accordion/accordion-group.html",[]).run(["$templateCache",function(a){a.put("template/accordion/accordion-group.html",'<div class="panel {{panelClass || \'panel-default\'}}">\n  <div class="panel-heading" ng-keypress="toggleOpen($event)">\n    <h4 class="panel-title">\n      <a href tabindex="0" class="accordion-toggle" ng-click="toggleOpen()" uib-accordion-transclude="heading"><span ng-class="{\'text-muted\': isDisabled}">{{heading}}</span></a>\n    </h4>\n  </div>\n  <div class="panel-collapse collapse" uib-collapse="!isOpen">\n	  <div class="panel-body" ng-transclude></div>\n  </div>\n</div>\n')}]),angular.module("template/accordion/accordion.html",[]).run(["$templateCache",function(a){a.put("template/accordion/accordion.html",'<div class="panel-group" ng-transclude></div>')}]),angular.module("template/alert/alert.html",[]).run(["$templateCache",function(a){a.put("template/alert/alert.html",'<div class="alert" ng-class="[\'alert-\' + (type || \'warning\'), closeable ? \'alert-dismissible\' : null]" role="alert">\n    <button ng-show="closeable" type="button" class="close" ng-click="close({$event: $event})">\n        <span aria-hidden="true">&times;</span>\n        <span class="sr-only">Close</span>\n    </button>\n    <div ng-transclude></div>\n</div>\n')}]),angular.module("template/carousel/carousel.html",[]).run(["$templateCache",function(a){a.put("template/carousel/carousel.html",'<div ng-mouseenter="pause()" ng-mouseleave="play()" class="carousel" ng-swipe-right="prev()" ng-swipe-left="next()">\n  <div class="carousel-inner" ng-transclude></div>\n  <a role="button" href class="left carousel-control" ng-click="prev()" ng-show="slides.length > 1">\n    <span aria-hidden="true" class="glyphicon glyphicon-chevron-left"></span>\n    <span class="sr-only">previous</span>\n  </a>\n  <a role="button" href class="right carousel-control" ng-click="next()" ng-show="slides.length > 1">\n    <span aria-hidden="true" class="glyphicon glyphicon-chevron-right"></span>\n    <span class="sr-only">next</span>\n  </a>\n  <ol class="carousel-indicators" ng-show="slides.length > 1">\n    <li ng-repeat="slide in slides | orderBy:indexOfSlide track by $index" ng-class="{ active: isActive(slide) }" ng-click="select(slide)">\n      <span class="sr-only">slide {{ $index + 1 }} of {{ slides.length }}<span ng-if="isActive(slide)">, currently active</span></span>\n    </li>\n  </ol>\n</div>')}]),angular.module("template/carousel/slide.html",[]).run(["$templateCache",function(a){a.put("template/carousel/slide.html",'<div ng-class="{\n    \'active\': active\n  }" class="item text-center" ng-transclude></div>\n')}]),angular.module("template/datepicker/datepicker.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/datepicker.html",'<div ng-switch="datepickerMode" role="application" ng-keydown="keydown($event)">\n  <uib-daypicker ng-switch-when="day" tabindex="0"></uib-daypicker>\n  <uib-monthpicker ng-switch-when="month" tabindex="0"></uib-monthpicker>\n  <uib-yearpicker ng-switch-when="year" tabindex="0"></uib-yearpicker>\n</div>')}]),angular.module("template/datepicker/day.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/day.html",'<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="{{::5 + showWeeks}}"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n    <tr>\n      <th ng-if="showWeeks" class="text-center"></th>\n      <th ng-repeat="label in ::labels track by $index" class="text-center"><small aria-label="{{::label.full}}">{{::label.abbr}}</small></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-if="showWeeks" class="text-center h6"><em>{{ weekNumbers[$index] }}</em></td>\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default btn-sm" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-muted\': dt.secondary, \'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/datepicker/month.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/month.html",'<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/datepicker/popup.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/popup.html",'<ul class="dropdown-menu" dropdown-nested ng-if="isOpen" style="display: block" ng-style="{top: position.top+\'px\', left: position.left+\'px\'}" ng-keydown="keydown($event)" ng-click="$event.stopPropagation()">\n	<li ng-transclude></li>\n	<li ng-if="showButtonBar" style="padding:10px 9px 2px">\n		<span class="btn-group pull-left">\n			<button type="button" class="btn btn-sm btn-info" ng-click="select(\'today\')" ng-disabled="isDisabled(\'today\')">{{ getText(\'current\') }}</button>\n			<button type="button" class="btn btn-sm btn-danger" ng-click="select(null)">{{ getText(\'clear\') }}</button>\n		</span>\n		<button type="button" class="btn btn-sm btn-success pull-right" ng-click="close()">{{ getText(\'close\') }}</button>\n	</li>\n</ul>\n')}]),angular.module("template/datepicker/year.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/year.html",'<table role="grid" aria-labelledby="{{::uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="3"><button id="{{::uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{::dt.uid}}" ng-class="::dt.customClass">\n        <button type="button" style="min-width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="::{\'text-info\': dt.current}">{{::dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/modal/backdrop.html",[]).run(["$templateCache",function(a){a.put("template/modal/backdrop.html",'<div uib-modal-animation-class="fade"\n     modal-in-class="in"\n     ng-style="{\'z-index\': 1040 + (index && 1 || 0) + index*10}"\n></div>\n')}]),angular.module("template/modal/window.html",[]).run(["$templateCache",function(a){a.put("template/modal/window.html",'<div modal-render="{{$isRendered}}" tabindex="-1" role="dialog" class="modal"\n    uib-modal-animation-class="fade"\n    modal-in-class="in"\n    ng-style="{\'z-index\': 1050 + index*10, display: \'block\'}">\n    <div class="modal-dialog" ng-class="size ? \'modal-\' + size : \'\'"><div class="modal-content" uib-modal-transclude></div></div>\n</div>\n')}]),angular.module("template/pagination/pager.html",[]).run(["$templateCache",function(a){a.put("template/pagination/pager.html",'<ul class="pager">\n  <li ng-class="{disabled: noPrevious()||ngDisabled, previous: align}"><a href ng-click="selectPage(page - 1, $event)">{{::getText(\'previous\')}}</a></li>\n  <li ng-class="{disabled: noNext()||ngDisabled, next: align}"><a href ng-click="selectPage(page + 1, $event)">{{::getText(\'next\')}}</a></li>\n</ul>\n')}]),angular.module("template/pagination/pagination.html",[]).run(["$templateCache",function(a){a.put("template/pagination/pagination.html",'<ul class="pagination">\n  <li ng-if="::boundaryLinks" ng-class="{disabled: noPrevious()||ngDisabled}" class="pagination-first"><a href ng-click="selectPage(1, $event)">{{::getText(\'first\')}}</a></li>\n  <li ng-if="::directionLinks" ng-class="{disabled: noPrevious()||ngDisabled}" class="pagination-prev"><a href ng-click="selectPage(page - 1, $event)">{{::getText(\'previous\')}}</a></li>\n  <li ng-repeat="page in pages track by $index" ng-class="{active: page.active,disabled: ngDisabled&&!page.active}" class="pagination-page"><a href ng-click="selectPage(page.number, $event)">{{page.text}}</a></li>\n  <li ng-if="::directionLinks" ng-class="{disabled: noNext()||ngDisabled}" class="pagination-next"><a href ng-click="selectPage(page + 1, $event)">{{::getText(\'next\')}}</a></li>\n  <li ng-if="::boundaryLinks" ng-class="{disabled: noNext()||ngDisabled}" class="pagination-last"><a href ng-click="selectPage(totalPages, $event)">{{::getText(\'last\')}}</a></li>\n</ul>\n')}]),angular.module("template/tooltip/tooltip-html-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-html-popup.html",'<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n')}]),angular.module("template/tooltip/tooltip-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-popup.html",'<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n')}]),angular.module("template/tooltip/tooltip-template-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-template-popup.html",'<div\n  tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    uib-tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n')}]),angular.module("template/popover/popover-html.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover-html.html",'<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content" ng-bind-html="contentExp()"></div>\n  </div>\n</div>\n')}]),angular.module("template/popover/popover-template.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover-template.html",'<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content"\n        uib-tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n')}]),angular.module("template/popover/popover.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover.html",'<div tooltip-animation-class="fade"\n  uib-tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n')}]),angular.module("template/progressbar/bar.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/bar.html",'<div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" aria-labelledby="{{::title}}" style="min-width: 0;" ng-transclude></div>\n')}]),angular.module("template/progressbar/progress.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/progress.html",'<div class="progress" ng-transclude aria-labelledby="{{::title}}"></div>')}]),angular.module("template/progressbar/progressbar.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/progressbar.html",'<div class="progress">\n  <div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" aria-labelledby="{{::title}}" style="min-width: 0;" ng-transclude></div>\n</div>\n')}]),angular.module("template/rating/rating.html",[]).run(["$templateCache",function(a){a.put("template/rating/rating.html",'<span ng-mouseleave="reset()" ng-keydown="onKeydown($event)" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="{{range.length}}" aria-valuenow="{{value}}">\n    <span ng-repeat-start="r in range track by $index" class="sr-only">({{ $index < value ? \'*\' : \' \' }})</span>\n    <i ng-repeat-end ng-mouseenter="enter($index + 1)" ng-click="rate($index + 1)" class="glyphicon" ng-class="$index < value && (r.stateOn || \'glyphicon-star\') || (r.stateOff || \'glyphicon-star-empty\')" ng-attr-title="{{r.title}}" aria-valuetext="{{r.title}}"></i>\n</span>\n');
}]),angular.module("template/tabs/tab.html",[]).run(["$templateCache",function(a){a.put("template/tabs/tab.html",'<li ng-class="{active: active, disabled: disabled}">\n  <a href ng-click="select()" uib-tab-heading-transclude>{{heading}}</a>\n</li>\n')}]),angular.module("template/tabs/tabset.html",[]).run(["$templateCache",function(a){a.put("template/tabs/tabset.html",'<div>\n  <ul class="nav nav-{{type || \'tabs\'}}" ng-class="{\'nav-stacked\': vertical, \'nav-justified\': justified}" ng-transclude></ul>\n  <div class="tab-content">\n    <div class="tab-pane" \n         ng-repeat="tab in tabs" \n         ng-class="{active: tab.active}"\n         uib-tab-content-transclude="tab">\n    </div>\n  </div>\n</div>\n')}]),angular.module("template/timepicker/timepicker.html",[]).run(["$templateCache",function(a){a.put("template/timepicker/timepicker.html",'<table>\n  <tbody>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td><a ng-click="incrementHours()" ng-class="{disabled: noIncrementHours()}" class="btn btn-link" ng-disabled="noIncrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td>&nbsp;</td>\n      <td><a ng-click="incrementMinutes()" ng-class="{disabled: noIncrementMinutes()}" class="btn btn-link" ng-disabled="noIncrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n    <tr>\n      <td class="form-group" ng-class="{\'has-error\': invalidHours}">\n        <input style="width:50px;" type="text" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}">\n      </td>\n      <td>:</td>\n      <td class="form-group" ng-class="{\'has-error\': invalidMinutes}">\n        <input style="width:50px;" type="text" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-readonly="::readonlyInput" maxlength="2" tabindex="{{::tabindex}}">\n      </td>\n      <td ng-show="showMeridian"><button type="button" ng-class="{disabled: noToggleMeridian()}" class="btn btn-default text-center" ng-click="toggleMeridian()" ng-disabled="noToggleMeridian()" tabindex="{{::tabindex}}">{{meridian}}</button></td>\n    </tr>\n    <tr class="text-center" ng-show="::showSpinners">\n      <td><a ng-click="decrementHours()" ng-class="{disabled: noDecrementHours()}" class="btn btn-link" ng-disabled="noDecrementHours()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td>&nbsp;</td>\n      <td><a ng-click="decrementMinutes()" ng-class="{disabled: noDecrementMinutes()}" class="btn btn-link" ng-disabled="noDecrementMinutes()" tabindex="{{::tabindex}}"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n      <td ng-show="showMeridian"></td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/typeahead/typeahead-match.html",[]).run(["$templateCache",function(a){a.put("template/typeahead/typeahead-match.html",'<a href tabindex="-1" ng-bind-html="match.label | uibTypeaheadHighlight:query"></a>\n')}]),angular.module("template/typeahead/typeahead-popup.html",[]).run(["$templateCache",function(a){a.put("template/typeahead/typeahead-popup.html",'<ul class="dropdown-menu" ng-show="isOpen() && !moveInProgress" ng-style="{top: position().top+\'px\', left: position().left+\'px\'}" style="display: block;" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index)" role="option" id="{{::match.id}}">\n        <div uib-typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n')}]),!angular.$$csp()&&angular.element(document).find("head").prepend('<style type="text/css">.ng-animate.item:not(.left):not(.right){-webkit-transition:0s ease-in-out left;transition:0s ease-in-out left}</style>');

(function(window, angular, undefined) {
  'use strict';

  // Module global settings.
  var settings = {};

  // Module global flags.
  var flags = {
    sdk: false,
    ready: false
  };

  // Deferred Object which will be resolved when the Facebook SDK is ready
  // and the `fbAsyncInit` function is called.
  var loadDeferred;

  /**
   * @name facebook
   * @kind function
   * @description
   * An Angularjs module to take approach of Facebook javascript sdk.
   *
   * @author Luis Carlos Osorio Jayk <luiscarlosjayk@gmail.com>
   */
  angular.module('facebook', []).

    // Declare module settings value
    value('settings', settings).

    // Declare module flags value
    value('flags', flags).

    /**
     * Facebook provider
     */
    provider('Facebook', [
      function() {

        /**
         * Facebook appId
         * @type {Number}
         */
        settings.appId = null;

        this.setAppId = function(appId) {
          settings.appId = appId;
        };

        this.getAppId = function() {
          return settings.appId;
        };

        /**
         * Locale language, english by default
         * @type {String}
         */
        settings.locale = 'en_US';

        this.setLocale = function(locale) {
          settings.locale = locale;
        };

        this.getLocale = function() {
          return settings.locale;
        };

        /**
         * Set if you want to check the authentication status
         * at the start up of the app
         * @type {Boolean}
         */
        settings.status = true;

        this.setStatus = function(status) {
          settings.status = status;
        };

        this.getStatus = function() {
          return settings.status;
        };

        /**
         * Adding a Channel File improves the performance of the javascript SDK,
         * by addressing issues with cross-domain communication in certain browsers.
         * @type {String}
         */
        settings.channelUrl = null;

        this.setChannel = function(channel) {
          settings.channelUrl = channel;
        };

        this.getChannel = function() {
          return settings.channelUrl;
        };

        /**
         * Enable cookies to allow the server to access the session
         * @type {Boolean}
         */
        settings.cookie = true;

        this.setCookie = function(cookie) {
          settings.cookie = cookie;
        };

        this.getCookie = function() {
          return settings.cookie;
        };

        /**
         * Parse XFBML
         * @type {Boolean}
         */
        settings.xfbml = true;

        this.setXfbml = function(enable) {
          settings.xfbml = enable;
        };

        this.getXfbml = function() {
          return settings.xfbml;
        };

        /**
         * Auth Response
         * @type {Object}
         */

        this.setAuthResponse = function(obj) {
          settings.authResponse = obj || true;
        };

        this.getAuthResponse = function() {
          return settings.authResponse;
        };

        /**
         * Frictionless Requests
         * @type {Boolean}
         */
        settings.frictionlessRequests = false;

        this.setFrictionlessRequests = function(enable) {
          settings.frictionlessRequests = enable;
        };

        this.getFrictionlessRequests = function() {
          return settings.frictionlessRequests;
        };

        /**
         * HideFlashCallback
         * @type {Object}
         */
        settings.hideFlashCallback = null;

        this.setHideFlashCallback = function(obj) {
          settings.hideFlashCallback = obj || null;
        };

        this.getHideFlashCallback = function() {
          return settings.hideFlashCallback;
        };

        /**
         * Custom option setting
         * key @type {String}
         * value @type {*}
         * @return {*}
         */
        this.setInitCustomOption = function(key, value) {
          if (!angular.isString(key)) {
            return false;
          }

          settings[key] = value;
          return settings[key];
        };

        /**
         * get init option
         * @param  {String} key
         * @return {*}
         */
        this.getInitOption = function(key) {
          // If key is not String or If non existing key return null
          if (!angular.isString(key) || !settings.hasOwnProperty(key)) {
            return false;
          }

          return settings[key];
        };

        /**
         * load SDK
         */
        settings.loadSDK = true;

        this.setLoadSDK = function(a) {
          settings.loadSDK = !!a;
        };

        this.getLoadSDK = function() {
          return settings.loadSDK;
        };

        /**
         * SDK version
         */
        settings.version = 'v2.0';

        this.setSdkVersion = function(version) {
          settings.version = version;
        };

        this.getSdkVersion = function() {
          return settings.version;
        };

        /**
         * Init Facebook API required stuff
         * This will prepare the app earlier (on settingsuration)
         * @arg {Object/String} initSettings
         * @arg {Boolean} _loadSDK (optional, true by default)
         */
        this.init = function(initSettings, _loadSDK) {
          // If string is passed, set it as appId
          if (angular.isString(initSettings)) {
            settings.appId = initSettings;
          }

          if(angular.isNumber(initSettings)) {
            settings.appId = initSettings.toString();
          }

          // If object is passed, merge it with app settings
          if (angular.isObject(initSettings)) {
            angular.extend(settings, initSettings);
          }

          // Set if Facebook SDK should be loaded automatically or not.
          if (angular.isDefined(_loadSDK)) {
            settings.loadSDK = !!_loadSDK;
          }
        };

        /**
         * This defined the Facebook service
         */
        this.$get = [
          '$q',
          '$rootScope',
          '$timeout',
          '$window',
          function($q, $rootScope, $timeout, $window) {
            /**
             * This is the NgFacebook class to be retrieved on Facebook Service request.
             */
            function NgFacebook() {
              this.appId = settings.appId;
            }

            /**
             * Ready state method
             * @return {Boolean}
             */
            NgFacebook.prototype.isReady = function() {
              return flags.ready;
            };

            NgFacebook.prototype.login = function () {

              var d = $q.defer(),
                  args = Array.prototype.slice.call(arguments),
                  userFn,
                  userFnIndex; // Converts arguments passed into an array

                // Get user function and it's index in the arguments array,
                // to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {
                    $timeout(function() {

                      if (response && angular.isUndefined(response.error)) {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                // review(mrzmyr): generalize behaviour of isReady check
                if (this.isReady()) {
                  $window.FB.login.apply($window.FB, args);
                } else {
                  $timeout(function() {
                    d.reject("Facebook.login() called before Facebook SDK has loaded.");
                  });
                }

                return d.promise;
            };

            /**
             * Map some asynchronous Facebook SDK methods to NgFacebook
             */
            angular.forEach([
              'logout',
              'api',
              'ui',
              'getLoginStatus'
            ], function(name) {
              NgFacebook.prototype[name] = function() {

                var d = $q.defer(),
                    args = Array.prototype.slice.call(arguments), // Converts arguments passed into an array
                    userFn,
                    userFnIndex;

                // Get user function and it's index in the arguments array,
                // to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {
                    $timeout(function() {

                      if (response && angular.isUndefined(response.error)) {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                $timeout(function() {
                  // Call when loadDeferred be resolved, meaning Service is ready to be used.
                  loadDeferred.promise.then(function() {
                    $window.FB[name].apply(FB, args);
                  });
                });

                return d.promise;
              };
            });

            /**
             * Map Facebook sdk XFBML.parse() to NgFacebook.
             */
            NgFacebook.prototype.parseXFBML = function() {

              var d = $q.defer();

              $timeout(function() {
                // Call when loadDeferred be resolved, meaning Service is ready to be used
                loadDeferred.promise.then(function() {
                  $window.FB.XFBML.parse();
                  d.resolve();
                });
              });

              return d.promise;
            };

            /**
             * Map Facebook SDK subscribe/unsubscribe method to NgFacebook.
             * Use it as Facebook.subscribe / Facebook.unsubscribe in the service.
             */

            angular.forEach([
              'subscribe',
              'unsubscribe',
            ], function(name) {

              NgFacebook.prototype[name] = function() {

                var d = $q.defer(),
                    args = Array.prototype.slice.call(arguments), // Get arguments passed into an array
                    userFn,
                    userFnIndex;

                // Get user function and it's index in the arguments array,
                // to replace it with custom function, allowing the usage of promises
                angular.forEach(args, function(arg, index) {
                  if (angular.isFunction(arg)) {
                    userFn = arg;
                    userFnIndex = index;
                  }
                });

                // Replace user function intended to be passed to the Facebook API with a custom one
                // for being able to use promises.
                if (angular.isFunction(userFn) && angular.isNumber(userFnIndex)) {
                  args.splice(userFnIndex, 1, function(response) {

                    $timeout(function() {

                      if (response && angular.isUndefined(response.error)) {
                        d.resolve(response);
                      } else {
                        d.reject(response);
                      }

                      if (angular.isFunction(userFn)) {
                        userFn(response);
                      }
                    });
                  });
                }

                $timeout(function() {
                  // Call when loadDeferred be resolved, meaning Service is ready to be used
                  loadDeferred.promise.then(function() {
                    $window.FB.Event[name].apply(FB, args);
                  });
                });

                return d.promise;
              };
            });

            return new NgFacebook(); // Singleton
          }
        ];

      }
    ]).

    /**
     * Module initialization
     */
    run([
      '$rootScope',
      '$q',
      '$window',
      '$timeout',
      function($rootScope, $q, $window, $timeout) {
        // Define global loadDeffered to notify when Service callbacks are safe to use
        loadDeferred = $q.defer();

        var loadSDK = settings.loadSDK;
        delete(settings['loadSDK']); // Remove loadSDK from settings since this isn't part from Facebook API.

        /**
         * Define fbAsyncInit required by Facebook API
         */
        $window.fbAsyncInit = function() {
          // Initialize our Facebook app
          $timeout(function() {
            if (!settings.appId) {
              throw 'Missing appId setting.';
            }

            FB.init(settings);

            flags.ready = true;

            /**
             * Subscribe to Facebook API events and broadcast through app.
             */
            angular.forEach({
              'auth.login': 'login',
              'auth.logout': 'logout',
              'auth.prompt': 'prompt',
              'auth.sessionChange': 'sessionChange',
              'auth.statusChange': 'statusChange',
              'auth.authResponseChange': 'authResponseChange',
              'xfbml.render': 'xfbmlRender',
              'edge.create': 'like',
              'edge.remove': 'unlike',
              'comment.create': 'comment',
              'comment.remove': 'uncomment'
            }, function(mapped, name) {
              FB.Event.subscribe(name, function(response) {
                $timeout(function() {
                  $rootScope.$broadcast('Facebook:' + mapped, response);
                });
              });
            });

            // Broadcast Facebook:load event
            $rootScope.$broadcast('Facebook:load');

            loadDeferred.resolve(FB);
          });
        };

        /**
         * Inject Facebook root element in DOM
         */
        (function addFBRoot() {
          var fbroot = document.getElementById('fb-root');

          if (!fbroot) {
            fbroot = document.createElement('div');
            fbroot.id = 'fb-root';
            document.body.insertBefore(fbroot, document.body.childNodes[0]);
          }

          return fbroot;
        })();

        /**
         * SDK script injecting
         */
         if(loadSDK) {
          (function injectScript() {
            var src           = '//connect.facebook.net/' + settings.locale + '/sdk.js',
                script        = document.createElement('script');
                script.id     = 'facebook-jssdk';
                script.async  = true;

            // Prefix protocol
            // for sure we don't want to ignore things, but this tests exists,
            // but it isn't recognized by istanbul, so we give it a 'ignore if'
            /* istanbul ignore if */
            if ($window.location.protocol.indexOf('file:') !== -1) {
              src = 'https:' + src;
            }

            script.src = src;
            script.onload = function() {
              flags.sdk = true;
            };

            // Fix for IE < 9, and yet supported by latest browsers
            document.getElementsByTagName('head')[0].appendChild(script);
          })();
        }
      }
    ]);

})(window, angular);

!function(){angular.module("angular-jwt",["angular-jwt.interceptor","angular-jwt.jwt"]),angular.module("angular-jwt.interceptor",[]).provider("jwtInterceptor",function(){this.urlParam=null,this.authHeader="Authorization",this.authPrefix="Bearer ",this.tokenGetter=function(){return null};var e=this;this.$get=["$q","$injector","$rootScope",function(r,t,a){return{request:function(a){if(a.skipAuthorization)return a;if(e.urlParam){if(a.params=a.params||{},a.params[e.urlParam])return a}else if(a.headers=a.headers||{},a.headers[e.authHeader])return a;var n=r.when(t.invoke(e.tokenGetter,this,{config:a}));return n.then(function(r){return r&&(e.urlParam?a.params[e.urlParam]=r:a.headers[e.authHeader]=e.authPrefix+r),a})},responseError:function(e){return 401===e.status&&a.$broadcast("unauthenticated",e),r.reject(e)}}}]}),angular.module("angular-jwt.jwt",[]).service("jwtHelper",function(){this.urlBase64Decode=function(e){var r=e.replace(/-/g,"+").replace(/_/g,"/");switch(r.length%4){case 0:break;case 2:r+="==";break;case 3:r+="=";break;default:throw"Illegal base64url string!"}return decodeURIComponent(escape(window.atob(r)))},this.decodeToken=function(e){var r=e.split(".");if(3!==r.length)throw new Error("JWT must have 3 parts");var t=this.urlBase64Decode(r[1]);if(!t)throw new Error("Cannot decode the token");return JSON.parse(t)},this.getTokenExpirationDate=function(e){var r;if(r=this.decodeToken(e),"undefined"==typeof r.exp)return null;var t=new Date(0);return t.setUTCSeconds(r.exp),t},this.isTokenExpired=function(e,r){var t=this.getTokenExpirationDate(e);return r=r||0,null===t?!1:!(t.valueOf()>(new Date).valueOf()+1e3*r)}})}();

/*! 5.0.9 */
!function(){function a(a,b){window.XMLHttpRequest.prototype[a]=b(window.XMLHttpRequest.prototype[a])}function b(a,b,c){try{Object.defineProperty(a,b,{get:c})}catch(d){}}if(window.FileAPI||(window.FileAPI={}),FileAPI.shouldLoad=window.XMLHttpRequest&&!window.FormData||FileAPI.forceLoad,FileAPI.shouldLoad){var c=function(a){if(!a.__listeners){a.upload||(a.upload={}),a.__listeners=[];var b=a.upload.addEventListener;a.upload.addEventListener=function(c,d){a.__listeners[c]=d,b&&b.apply(this,arguments)}}};a("open",function(a){return function(b,d,e){c(this),this.__url=d;try{a.apply(this,[b,d,e])}catch(f){f.message.indexOf("Access is denied")>-1&&(this.__origError=f,a.apply(this,[b,"_fix_for_ie_crossdomain__",e]))}}}),a("getResponseHeader",function(a){return function(b){return this.__fileApiXHR&&this.__fileApiXHR.getResponseHeader?this.__fileApiXHR.getResponseHeader(b):null==a?null:a.apply(this,[b])}}),a("getAllResponseHeaders",function(a){return function(){return this.__fileApiXHR&&this.__fileApiXHR.getAllResponseHeaders?this.__fileApiXHR.getAllResponseHeaders():null==a?null:a.apply(this)}}),a("abort",function(a){return function(){return this.__fileApiXHR&&this.__fileApiXHR.abort?this.__fileApiXHR.abort():null==a?null:a.apply(this)}}),a("setRequestHeader",function(a){return function(b,d){if("__setXHR_"===b){c(this);var e=d(this);e instanceof Function&&e(this)}else this.__requestHeaders=this.__requestHeaders||{},this.__requestHeaders[b]=d,a.apply(this,arguments)}}),a("send",function(a){return function(){var c=this;if(arguments[0]&&arguments[0].__isFileAPIShim){var d=arguments[0],e={url:c.__url,jsonp:!1,cache:!0,complete:function(a,d){c.__completed=!0,!a&&c.__listeners.load&&c.__listeners.load({type:"load",loaded:c.__loaded,total:c.__total,target:c,lengthComputable:!0}),!a&&c.__listeners.loadend&&c.__listeners.loadend({type:"loadend",loaded:c.__loaded,total:c.__total,target:c,lengthComputable:!0}),"abort"===a&&c.__listeners.abort&&c.__listeners.abort({type:"abort",loaded:c.__loaded,total:c.__total,target:c,lengthComputable:!0}),void 0!==d.status&&b(c,"status",function(){return 0===d.status&&a&&"abort"!==a?500:d.status}),void 0!==d.statusText&&b(c,"statusText",function(){return d.statusText}),b(c,"readyState",function(){return 4}),void 0!==d.response&&b(c,"response",function(){return d.response});var e=d.responseText||(a&&0===d.status&&"abort"!==a?a:void 0);b(c,"responseText",function(){return e}),b(c,"response",function(){return e}),a&&b(c,"err",function(){return a}),c.__fileApiXHR=d,c.onreadystatechange&&c.onreadystatechange(),c.onload&&c.onload()},progress:function(a){if(a.target=c,c.__listeners.progress&&c.__listeners.progress(a),c.__total=a.total,c.__loaded=a.loaded,a.total===a.loaded){var b=this;setTimeout(function(){c.__completed||(c.getAllResponseHeaders=function(){},b.complete(null,{status:204,statusText:"No Content"}))},FileAPI.noContentTimeout||1e4)}},headers:c.__requestHeaders};e.data={},e.files={};for(var f=0;f<d.data.length;f++){var g=d.data[f];null!=g.val&&null!=g.val.name&&null!=g.val.size&&null!=g.val.type?e.files[g.key]=g.val:e.data[g.key]=g.val}setTimeout(function(){if(!FileAPI.hasFlash)throw'Adode Flash Player need to be installed. To check ahead use "FileAPI.hasFlash"';c.__fileApiXHR=FileAPI.upload(e)},1)}else{if(this.__origError)throw this.__origError;a.apply(c,arguments)}}}),window.XMLHttpRequest.__isFileAPIShim=!0,window.FormData=FormData=function(){return{append:function(a,b,c){b.__isFileAPIBlobShim&&(b=b.data[0]),this.data.push({key:a,val:b,name:c})},data:[],__isFileAPIShim:!0}},window.Blob=Blob=function(a){return{data:a,__isFileAPIBlobShim:!0}}}}(),function(){function a(a){return"input"===a[0].tagName.toLowerCase()&&a.attr("type")&&"file"===a.attr("type").toLowerCase()}function b(){try{var a=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");if(a)return!0}catch(b){if(void 0!==navigator.mimeTypes["application/x-shockwave-flash"])return!0}return!1}function c(a){var b=0,c=0;if(window.jQuery)return jQuery(a).offset();if(a.offsetParent)do b+=a.offsetLeft-a.scrollLeft,c+=a.offsetTop-a.scrollTop,a=a.offsetParent;while(a);return{left:b,top:c}}if(FileAPI.shouldLoad){if(FileAPI.forceLoad&&(FileAPI.html5=!1),!FileAPI.upload){var d,e,f,g,h,i=document.createElement("script"),j=document.getElementsByTagName("script");if(window.FileAPI.jsUrl)d=window.FileAPI.jsUrl;else if(window.FileAPI.jsPath)e=window.FileAPI.jsPath;else for(f=0;f<j.length;f++)if(h=j[f].src,g=h.search(/\/ng\-file\-upload[\-a-zA-z0-9\.]*\.js/),g>-1){e=h.substring(0,g+1);break}null==FileAPI.staticPath&&(FileAPI.staticPath=e),i.setAttribute("src",d||e+"FileAPI.min.js"),document.getElementsByTagName("head")[0].appendChild(i),FileAPI.hasFlash=b()}FileAPI.ngfFixIE=function(d,e,f,g){if(!b())throw'Adode Flash Player need to be installed. To check ahead use "FileAPI.hasFlash"';var h=function(){if(d.attr("disabled"))d.$$ngfRefElem.removeClass("js-fileapi-wrapper");else{var b=d.$$ngfRefElem;b?f(d.$$ngfRefElem):(b=d.$$ngfRefElem=e(),b.addClass("js-fileapi-wrapper"),!a(d),setTimeout(function(){b.bind("mouseenter",h)},10),b.bind("change",function(a){i.apply(this,[a]),g.apply(this,[a])})),a(d)||b.css("position","absolute").css("top",c(d[0]).top+"px").css("left",c(d[0]).left+"px").css("width",d[0].offsetWidth+"px").css("height",d[0].offsetHeight+"px").css("filter","alpha(opacity=0)").css("display",d.css("display")).css("overflow","hidden").css("z-index","900000").css("visibility","visible")}};d.bind("mouseenter",h);var i=function(a){for(var b=FileAPI.getFiles(a),c=0;c<b.length;c++)void 0===b[c].size&&(b[c].size=0),void 0===b[c].name&&(b[c].name="file"),void 0===b[c].type&&(b[c].type="undefined");a.target||(a.target={}),a.target.files=b,a.target.files!==b&&(a.__files_=b),(a.__files_||a.target.files).item=function(b){return(a.__files_||a.target.files)[b]||null}}},FileAPI.disableFileInput=function(a,b){b?a.removeClass("js-fileapi-wrapper"):a.addClass("js-fileapi-wrapper")}}}(),window.FileReader||(window.FileReader=function(){var a=this,b=!1;this.listeners={},this.addEventListener=function(b,c){a.listeners[b]=a.listeners[b]||[],a.listeners[b].push(c)},this.removeEventListener=function(b,c){a.listeners[b]&&a.listeners[b].splice(a.listeners[b].indexOf(c),1)},this.dispatchEvent=function(b){var c=a.listeners[b.type];if(c)for(var d=0;d<c.length;d++)c[d].call(a,b)},this.onabort=this.onerror=this.onload=this.onloadstart=this.onloadend=this.onprogress=null;var c=function(b,c){var d={type:b,target:a,loaded:c.loaded,total:c.total,error:c.error};return null!=c.result&&(d.target.result=c.result),d},d=function(d){b||(b=!0,a.onloadstart&&a.onloadstart(c("loadstart",d)));var e;"load"===d.type?(a.onloadend&&a.onloadend(c("loadend",d)),e=c("load",d),a.onload&&a.onload(e),a.dispatchEvent(e)):"progress"===d.type?(e=c("progress",d),a.onprogress&&a.onprogress(e),a.dispatchEvent(e)):(e=c("error",d),a.onerror&&a.onerror(e),a.dispatchEvent(e))};this.readAsArrayBuffer=function(a){FileAPI.readAsBinaryString(a,d)},this.readAsBinaryString=function(a){FileAPI.readAsBinaryString(a,d)},this.readAsDataURL=function(a){FileAPI.readAsDataURL(a,d)},this.readAsText=function(a){FileAPI.readAsText(a,d)}}),!window.XMLHttpRequest||window.FileAPI&&FileAPI.shouldLoad||(window.XMLHttpRequest.prototype.setRequestHeader=function(a){return function(b,c){if("__setXHR_"===b){var d=c(this);d instanceof Function&&d(this)}else a.apply(this,arguments)}}(window.XMLHttpRequest.prototype.setRequestHeader));var ngFileUpload=angular.module("ngFileUpload",[]);ngFileUpload.version="5.0.9",ngFileUpload.service("Upload",["$http","$q","$timeout",function(a,b,c){function d(d){d.method=d.method||"POST",d.headers=d.headers||{};var e=b.defer(),f=e.promise;return d.headers.__setXHR_=function(){return function(a){a&&(d.__XHR=a,d.xhrFn&&d.xhrFn(a),a.upload.addEventListener("progress",function(a){a.config=d,e.notify?e.notify(a):f.progressFunc&&c(function(){f.progressFunc(a)})},!1),a.upload.addEventListener("load",function(a){a.lengthComputable&&(a.config=d,e.notify?e.notify(a):f.progressFunc&&c(function(){f.progressFunc(a)}))},!1))}},a(d).then(function(a){e.resolve(a)},function(a){e.reject(a)},function(a){e.notify(a)}),f.success=function(a){return f.then(function(b){a(b.data,b.status,b.headers,d)}),f},f.error=function(a){return f.then(null,function(b){a(b.data,b.status,b.headers,d)}),f},f.progress=function(a){return f.progressFunc=a,f.then(null,null,function(b){a(b)}),f},f.abort=function(){return d.__XHR&&c(function(){d.__XHR.abort()}),f},f.xhr=function(a){return d.xhrFn=function(b){return function(){b&&b.apply(f,arguments),a.apply(f,arguments)}}(d.xhrFn),f},f}this.upload=function(a){function b(c,d,e){if(void 0!==d)if(angular.isDate(d)&&(d=d.toISOString()),angular.isString(d))c.append(e,d);else if("form"===a.sendFieldsAs)if(angular.isObject(d))for(var f in d)d.hasOwnProperty(f)&&b(c,d[f],e+"["+f+"]");else c.append(e,d);else d=angular.isString(d)?d:JSON.stringify(d),"json-blob"===a.sendFieldsAs?c.append(e,new Blob([d],{type:"application/json"})):c.append(e,d)}return a.headers=a.headers||{},a.headers["Content-Type"]=void 0,a.transformRequest=a.transformRequest?angular.isArray(a.transformRequest)?a.transformRequest:[a.transformRequest]:[],a.transformRequest.push(function(c){var d,e=new FormData,f={};for(d in a.fields)a.fields.hasOwnProperty(d)&&(f[d]=a.fields[d]);c&&(f.data=c);for(d in f)if(f.hasOwnProperty(d)){var g=f[d];a.formDataAppender?a.formDataAppender(e,d,g):b(e,g,d)}if(null!=a.file){var h=a.fileFormDataName||"file";if(angular.isArray(a.file))for(var i=angular.isString(h),j=0;j<a.file.length;j++)e.append(i?h:h[j],a.file[j],a.fileName&&a.fileName[j]||a.file[j].name);else e.append(h,a.file,a.fileName||a.file.name)}return e}),d(a)},this.http=function(b){return b.transformRequest=b.transformRequest||function(b){return window.ArrayBuffer&&b instanceof window.ArrayBuffer||b instanceof Blob?b:a.defaults.transformRequest[0](arguments)},d(b)}}]),function(){function a(a,e,f,g,h,i,j){function k(){return"input"===e[0].tagName.toLowerCase()&&f.type&&"file"===f.type.toLowerCase()}function l(b){if(!r){r=!0;try{for(var e=b.__files_||b.target&&b.target.files,j=[],k=[],l=0;l<e.length;l++){var m=e.item(l);c(a,h,f,m,b)?j.push(m):k.push(m)}d(h,i,a,g,f,f.ngfChange||f.ngfSelect,j,k,b),0===j.length&&(b.target.value=j)}finally{r=!1}}}function m(b){f.ngfMultiple&&b.attr("multiple",h(f.ngfMultiple)(a)),f.ngfCapture&&b.attr("capture",h(f.ngfCapture)(a)),f.accept&&b.attr("accept",f.accept);for(var c=0;c<e[0].attributes.length;c++){var d=e[0].attributes[c];(k()&&"type"!==d.name||"type"!==d.name&&"class"!==d.name&&"id"!==d.name&&"style"!==d.name)&&b.attr(d.name,d.value)}}function n(b,c){if(!c&&(b||k()))return e.$$ngfRefElem||e;var d=angular.element('<input type="file">');return m(d),k()?(e.replaceWith(d),e=d,d.attr("__ngf_gen__",!0),j(e)(a)):(d.css("visibility","hidden").css("position","absolute").css("overflow","hidden").css("width","0px").css("height","0px").css("z-index","-100000").css("border","none").css("margin","0px").css("padding","0px").attr("tabindex","-1"),e.$$ngfRefElem&&e.$$ngfRefElem.remove(),e.$$ngfRefElem=d,document.body.appendChild(d[0])),d}function o(b){d(h,i,a,g,f,f.ngfChange||f.ngfSelect,[],[],b,!0)}function p(c){function d(a){a&&i[0].click(),(k()||!a)&&e.bind("click touchend",p)}if(e.attr("disabled")||q)return!1;null!=c&&(c.preventDefault(),c.stopPropagation());var g=h(f.ngfResetOnClick)(a)!==!1,i=n(c,g);return i&&((!c||g)&&i.bind("change",l),c&&g&&h(f.ngfResetModelOnClick)(a)!==!1&&o(c),b(navigator.userAgent)?setTimeout(function(){d(c)},0):d(c)),!1}if(!e.attr("__ngf_gen__")){a.$on("$destroy",function(){e.$$ngfRefElem&&e.$$ngfRefElem.remove()});var q=!1;-1===f.ngfSelect.search(/\W+$files\W+/)&&a.$watch(f.ngfSelect,function(a){q=a===!1});var r=!1;window.FileAPI&&window.FileAPI.ngfFixIE?window.FileAPI.ngfFixIE(e,n,m,l):p()}}function b(a){var b=a.match(/Android[^\d]*(\d+)\.(\d+)/);return b&&b.length>2?parseInt(b[1])<4||4===parseInt(b[1])&&parseInt(b[2])<4:/.*Windows.*Safari.*/.test(a)}ngFileUpload.directive("ngfSelect",["$parse","$timeout","$compile",function(b,c,d){return{restrict:"AEC",require:"?ngModel",link:function(e,f,g,h){a(e,f,g,h,b,c,d)}}}]),ngFileUpload.validate=function(a,b,c,d,e){function f(a){if(a.length>2&&"/"===a[0]&&"/"===a[a.length-1])return a.substring(1,a.length-1);var b=a.split(","),c="";if(b.length>1)for(var d=0;d<b.length;d++)c+="("+f(b[d])+")",d<b.length-1&&(c+="|");else 0===a.indexOf(".")&&(a="*"+a),c="^"+a.replace(new RegExp("[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]","g"),"\\$&")+"$",c=c.replace(/\\\*/g,".*").replace(/\\\?/g,".");return c}var g=b(c.ngfAccept)(a,{$file:d,$event:e}),h=b(c.ngfMaxSize)(a,{$file:d,$event:e})||9007199254740991,i=b(c.ngfMinSize)(a,{$file:d,$event:e})||-1;if(null!=g&&angular.isString(g)){var j=new RegExp(f(g),"gi");g=null!=d.type&&j.test(d.type.toLowerCase())||null!=d.name&&j.test(d.name.toLowerCase())}return(null==g||g)&&(null==d.size||d.size<h&&d.size>i)},ngFileUpload.updateModel=function(a,b,c,d,e,f,g,h,i,j){function k(){if(a(e.ngfKeep)(c)===!0){var j=(d.$modelValue||[]).slice(0);if(g&&g.length)if(a(e.ngfKeepDistinct)(c)===!0){for(var k=j.length,l=0;l<g.length;l++){for(var m=0;k>m&&g[l].name!==j[m].name;m++);m===k&&j.push(g[l])}g=j}else g=j.concat(g);else g=j}d&&(a(e.ngModel).assign(c,g),b(function(){d&&d.$setViewValue(null!=g&&0===g.length?null:g)})),e.ngModelRejected&&a(e.ngModelRejected).assign(c,h),f&&a(f)(c,{$files:g,$rejectedFiles:h,$event:i})}j?k():b(function(){k()})};var c=ngFileUpload.validate,d=ngFileUpload.updateModel}(),function(){function a(a,e,f,g,h,i,j){function k(a,b,d){var e=!0,f=d.dataTransfer.items;if(null!=f)for(var g=0;g<f.length&&e;g++)e=e&&("file"===f[g].kind||""===f[g].kind)&&c(a,h,b,f[g],d);var i=h(b.ngfDragOverClass)(a,{$event:d});return i&&(i.delay&&(r=i.delay),i.accept&&(i=e?i.accept:i.reject)),i||b.ngfDragOverClass||"dragover"}function l(b,d,e,g){function k(d){c(a,h,f,d,b)?m.push(d):n.push(d)}function l(a,b,c){if(null!=b)if(b.isDirectory){var d=(c||"")+b.name;k({name:b.name,type:"directory",path:d});var e=b.createReader(),f=[];p++;var g=function(){e.readEntries(function(d){try{if(d.length)f=f.concat(Array.prototype.slice.call(d||[],0)),g();else{for(var e=0;e<f.length;e++)l(a,f[e],(c?c:"")+b.name+"/");p--}}catch(h){p--,console.error(h)}},function(){p--})};g()}else p++,b.file(function(a){try{p--,a.path=(c?c:"")+a.name,k(a)}catch(b){p--,console.error(b)}},function(){p--})}var m=[],n=[],o=b.dataTransfer.items,p=0;if(o&&o.length>0&&"file"!==j.protocol())for(var q=0;q<o.length;q++){if(o[q].webkitGetAsEntry&&o[q].webkitGetAsEntry()&&o[q].webkitGetAsEntry().isDirectory){var r=o[q].webkitGetAsEntry();if(r.isDirectory&&!e)continue;null!=r&&l(m,r)}else{var s=o[q].getAsFile();null!=s&&k(s)}if(!g&&m.length>0)break}else{var t=b.dataTransfer.files;if(null!=t)for(var u=0;u<t.length&&(k(t.item(u)),g||!(m.length>0));u++);}var v=0;!function w(a){i(function(){if(p)10*v++<2e4&&w(10);else{if(!g&&m.length>1){for(q=0;"directory"===m[q].type;)q++;m=[m[q]]}d(m,n)}},a||0)}()}var m=b();if(f.dropAvailable&&i(function(){a[f.dropAvailable]?a[f.dropAvailable].value=m:a[f.dropAvailable]=m}),!m)return void(h(f.ngfHideOnDropNotAvailable)(a)===!0&&e.css("display","none"));var n=!1;-1===f.ngfDrop.search(/\W+$files\W+/)&&a.$watch(f.ngfDrop,function(a){n=a===!1});var o,p=null,q=h(f.ngfStopPropagation),r=1;e[0].addEventListener("dragover",function(b){if(!e.attr("disabled")&&!n){if(b.preventDefault(),q(a)&&b.stopPropagation(),navigator.userAgent.indexOf("Chrome")>-1){var c=b.dataTransfer.effectAllowed;b.dataTransfer.dropEffect="move"===c||"linkMove"===c?"move":"copy"}i.cancel(p),a.actualDragOverClass||(o=k(a,f,b)),e.addClass(o)}},!1),e[0].addEventListener("dragenter",function(b){e.attr("disabled")||n||(b.preventDefault(),q(a)&&b.stopPropagation())},!1),e[0].addEventListener("dragleave",function(){e.attr("disabled")||n||(p=i(function(){e.removeClass(o),o=null},r||1))},!1),e[0].addEventListener("drop",function(b){e.attr("disabled")||n||(b.preventDefault(),q(a)&&b.stopPropagation(),e.removeClass(o),o=null,l(b,function(c,e){d(h,i,a,g,f,f.ngfChange||f.ngfDrop,c,e,b)},h(f.ngfAllowDir)(a)!==!1,f.multiple||h(f.ngfMultiple)(a)))},!1)}function b(){var a=document.createElement("div");return"draggable"in a&&"ondrop"in a}var c=ngFileUpload.validate,d=ngFileUpload.updateModel;ngFileUpload.directive("ngfDrop",["$parse","$timeout","$location",function(b,c,d){return{restrict:"AEC",require:"?ngModel",link:function(e,f,g,h){a(e,f,g,h,b,c,d)}}}]),ngFileUpload.directive("ngfNoFileDrop",function(){return function(a,c){b()&&c.css("display","none")}}),ngFileUpload.directive("ngfDropAvailable",["$parse","$timeout",function(a,c){return function(d,e,f){if(b()){var g=a(f.ngfDropAvailable);c(function(){g(d),g.assign&&g.assign(d,!0)})}}}]),ngFileUpload.directive("ngfSrc",["$parse","$timeout",function(a,b){return{restrict:"AE",link:function(d,e,f){window.FileReader&&d.$watch(f.ngfSrc,function(g){g&&c(d,a,f,g,null)&&(!window.FileAPI||-1===navigator.userAgent.indexOf("MSIE 8")||g.size<2e4)&&(!window.FileAPI||-1===navigator.userAgent.indexOf("MSIE 9")||g.size<4e6)?b(function(){var a=window.URL||window.webkitURL;if(a&&a.createObjectURL)e.attr("src",a.createObjectURL(g));else{var c=new FileReader;c.readAsDataURL(g),c.onload=function(a){b(function(){e.attr("src",a.target.result)})}}}):e.attr("src",f.ngfDefaultSrc||"")})}}}])}();

/*
 * angular-elastic v2.5.0
 * (c) 2014 Monospaced http://monospaced.com
 * License: MIT
 */

if (typeof module !== 'undefined' &&
    typeof exports !== 'undefined' &&
    module.exports === exports){
  module.exports = 'monospaced.elastic';
}

angular.module('monospaced.elastic', [])

  .constant('msdElasticConfig', {
    append: ''
  })

  .directive('msdElastic', [
    '$timeout', '$window', 'msdElasticConfig',
    function($timeout, $window, config) {
      'use strict';

      return {
        require: 'ngModel',
        restrict: 'A, C',
        link: function(scope, element, attrs, ngModel) {

          // cache a reference to the DOM element
          var ta = element[0],
              $ta = element;

          // ensure the element is a textarea, and browser is capable
          if (ta.nodeName !== 'TEXTAREA' || !$window.getComputedStyle) {
            return;
          }

          // set these properties before measuring dimensions
          $ta.css({
            'overflow': 'hidden',
            'overflow-y': 'hidden',
            'word-wrap': 'break-word'
          });

          // force text reflow
          var text = ta.value;
          ta.value = '';
          ta.value = text;

          var append = attrs.msdElastic ? attrs.msdElastic.replace(/\\n/g, '\n') : config.append,
              $win = angular.element($window),
              mirrorInitStyle = 'position: absolute; top: -999px; right: auto; bottom: auto;' +
                                'left: 0; overflow: hidden; -webkit-box-sizing: content-box;' +
                                '-moz-box-sizing: content-box; box-sizing: content-box;' +
                                'min-height: 0 !important; height: 0 !important; padding: 0;' +
                                'word-wrap: break-word; border: 0;',
              $mirror = angular.element('<textarea aria-hidden="true" tabindex="-1" ' +
                                        'style="' + mirrorInitStyle + '"/>').data('elastic', true),
              mirror = $mirror[0],
              taStyle = getComputedStyle(ta),
              resize = taStyle.getPropertyValue('resize'),
              borderBox = taStyle.getPropertyValue('box-sizing') === 'border-box' ||
                          taStyle.getPropertyValue('-moz-box-sizing') === 'border-box' ||
                          taStyle.getPropertyValue('-webkit-box-sizing') === 'border-box',
              boxOuter = !borderBox ? {width: 0, height: 0} : {
                            width:  parseInt(taStyle.getPropertyValue('border-right-width'), 10) +
                                    parseInt(taStyle.getPropertyValue('padding-right'), 10) +
                                    parseInt(taStyle.getPropertyValue('padding-left'), 10) +
                                    parseInt(taStyle.getPropertyValue('border-left-width'), 10),
                            height: parseInt(taStyle.getPropertyValue('border-top-width'), 10) +
                                    parseInt(taStyle.getPropertyValue('padding-top'), 10) +
                                    parseInt(taStyle.getPropertyValue('padding-bottom'), 10) +
                                    parseInt(taStyle.getPropertyValue('border-bottom-width'), 10)
                          },
              minHeightValue = parseInt(taStyle.getPropertyValue('min-height'), 10),
              heightValue = parseInt(taStyle.getPropertyValue('height'), 10),
              minHeight = Math.max(minHeightValue, heightValue) - boxOuter.height,
              maxHeight = parseInt(taStyle.getPropertyValue('max-height'), 10),
              mirrored,
              active,
              copyStyle = ['font-family',
                           'font-size',
                           'font-weight',
                           'font-style',
                           'letter-spacing',
                           'line-height',
                           'text-transform',
                           'word-spacing',
                           'text-indent'];

          // exit if elastic already applied (or is the mirror element)
          if ($ta.data('elastic')) {
            return;
          }

          // Opera returns max-height of -1 if not set
          maxHeight = maxHeight && maxHeight > 0 ? maxHeight : 9e4;

          // append mirror to the DOM
          if (mirror.parentNode !== document.body) {
            angular.element(document.body).append(mirror);
          }

          // set resize and apply elastic
          $ta.css({
            'resize': (resize === 'none' || resize === 'vertical') ? 'none' : 'horizontal'
          }).data('elastic', true);

          /*
           * methods
           */

          function initMirror() {
            var mirrorStyle = mirrorInitStyle;

            mirrored = ta;
            // copy the essential styles from the textarea to the mirror
            taStyle = getComputedStyle(ta);
            angular.forEach(copyStyle, function(val) {
              mirrorStyle += val + ':' + taStyle.getPropertyValue(val) + ';';
            });
            mirror.setAttribute('style', mirrorStyle);
          }

          function adjust() {
            var taHeight,
                taComputedStyleWidth,
                mirrorHeight,
                width,
                overflow;

            if (mirrored !== ta) {
              initMirror();
            }

            // active flag prevents actions in function from calling adjust again
            if (!active) {
              active = true;

              mirror.value = ta.value + append; // optional whitespace to improve animation
              mirror.style.overflowY = ta.style.overflowY;

              taHeight = ta.style.height === '' ? 'auto' : parseInt(ta.style.height, 10);

              taComputedStyleWidth = getComputedStyle(ta).getPropertyValue('width');

              // ensure getComputedStyle has returned a readable 'used value' pixel width
              if (taComputedStyleWidth.substr(taComputedStyleWidth.length - 2, 2) === 'px') {
                // update mirror width in case the textarea width has changed
                width = parseInt(taComputedStyleWidth, 10) - boxOuter.width;
                mirror.style.width = width + 'px';
              }

              mirrorHeight = mirror.scrollHeight;

              if (mirrorHeight > maxHeight) {
                mirrorHeight = maxHeight;
                overflow = 'scroll';
              } else if (mirrorHeight < minHeight) {
                mirrorHeight = minHeight;
              }
              mirrorHeight += boxOuter.height;
              ta.style.overflowY = overflow || 'hidden';

              if (taHeight !== mirrorHeight) {
                scope.$emit('elastic:resize', $ta, taHeight, mirrorHeight);
                ta.style.height = mirrorHeight + 'px';
              }

              // small delay to prevent an infinite loop
              $timeout(function() {
                active = false;
              }, 1);

            }
          }

          function forceAdjust() {
            active = false;
            adjust();
          }

          /*
           * initialise
           */

          // listen
          if ('onpropertychange' in ta && 'oninput' in ta) {
            // IE9
            ta['oninput'] = ta.onkeyup = adjust;
          } else {
            ta['oninput'] = adjust;
          }

          $win.bind('resize', forceAdjust);

          scope.$watch(function() {
            return ngModel.$modelValue;
          }, function(newValue) {
            forceAdjust();
          });

          scope.$on('elastic:adjust', function() {
            initMirror();
            forceAdjust();
          });

          $timeout(adjust);

          /*
           * destroy
           */

          scope.$on('$destroy', function() {
            $mirror.remove();
            $win.unbind('resize', forceAdjust);
          });
        }
      };
    }
  ]);

"use strict";angular.module("mentio",[]).directive("mentio",["mentioUtil","$document","$compile","$log","$timeout",function(e,t,n,r,i){return{restrict:"A",scope:{macros:"=mentioMacros",search:"&mentioSearch",select:"&mentioSelect",items:"=mentioItems",typedTerm:"=mentioTypedTerm",altId:"=mentioId",iframeElement:"=mentioIframeElement",requireLeadingSpace:"=mentioRequireLeadingSpace",selectNotFound:"=mentioSelectNotFound",trimTerm:"=mentioTrimTerm",ngModel:"="},controller:["$scope","$timeout","$attrs",function(n,r,i){n.query=function(e,t){var r=n.triggerCharMap[e];(void 0===n.trimTerm||n.trimTerm)&&(t=t.trim()),r.showMenu(),r.search({term:t}),r.typedTerm=t},n.defaultSearch=function(e){var t=[];angular.forEach(n.items,function(n){n.label.toUpperCase().indexOf(e.term.toUpperCase())>=0&&t.push(n)}),n.localItems=t},n.bridgeSearch=function(e){var t=i.mentioSearch?n.search:n.defaultSearch;t({term:e})},n.defaultSelect=function(e){return n.defaultTriggerChar+e.item.label},n.bridgeSelect=function(e){var t=i.mentioSelect?n.select:n.defaultSelect;return t({item:e})},n.setTriggerText=function(e){n.syncTriggerText&&(n.typedTerm=void 0===n.trimTerm||n.trimTerm?e.trim():e)},n.context=function(){return n.iframeElement?{iframe:n.iframeElement}:void 0},n.replaceText=function(t,i){if(n.hideAll(),e.replaceTriggerText(n.context(),n.targetElement,n.targetElementPath,n.targetElementSelectedOffset,n.triggerCharSet,t,n.requireLeadingSpace,i),!i&&(n.setTriggerText(""),angular.element(n.targetElement).triggerHandler("change"),n.isContentEditable())){n.contentEditableMenuPasted=!0;var o=r(function(){n.contentEditableMenuPasted=!1},200);n.$on("$destroy",function(){r.cancel(o)})}},n.hideAll=function(){for(var e in n.triggerCharMap)n.triggerCharMap.hasOwnProperty(e)&&n.triggerCharMap[e].hideMenu()},n.getActiveMenuScope=function(){for(var e in n.triggerCharMap)if(n.triggerCharMap.hasOwnProperty(e)&&n.triggerCharMap[e].visible)return n.triggerCharMap[e];return null},n.selectActive=function(){for(var e in n.triggerCharMap)n.triggerCharMap.hasOwnProperty(e)&&n.triggerCharMap[e].visible&&n.triggerCharMap[e].selectActive()},n.isActive=function(){for(var e in n.triggerCharMap)if(n.triggerCharMap.hasOwnProperty(e)&&n.triggerCharMap[e].visible)return!0;return!1},n.isContentEditable=function(){return"INPUT"!==n.targetElement.nodeName&&"TEXTAREA"!==n.targetElement.nodeName},n.replaceMacro=function(t,i){i?e.replaceMacroText(n.context(),n.targetElement,n.targetElementPath,n.targetElementSelectedOffset,n.macros,n.macros[t]):(n.replacingMacro=!0,n.timer=r(function(){e.replaceMacroText(n.context(),n.targetElement,n.targetElementPath,n.targetElementSelectedOffset,n.macros,n.macros[t]),angular.element(n.targetElement).triggerHandler("change"),n.replacingMacro=!1},300),n.$on("$destroy",function(){r.cancel(n.timer)}))},n.addMenu=function(e){e.parentScope&&n.triggerCharMap.hasOwnProperty(e.triggerChar)||(n.triggerCharMap[e.triggerChar]=e,void 0===n.triggerCharSet&&(n.triggerCharSet=[]),n.triggerCharSet.push(e.triggerChar),e.setParent(n))},n.$on("menuCreated",function(e,t){(void 0!==i.id||void 0!==i.mentioId)&&(i.id===t.targetElement||void 0!==i.mentioId&&n.altId===t.targetElement)&&n.addMenu(t.scope)}),t.on("click",function(){n.isActive()&&n.$apply(function(){n.hideAll()})}),t.on("keydown keypress paste",function(e){var t=n.getActiveMenuScope();t&&((9===e.which||13===e.which)&&(e.preventDefault(),t.selectActive()),27===e.which&&(e.preventDefault(),t.$apply(function(){t.hideMenu()})),40===e.which&&(e.preventDefault(),t.$apply(function(){t.activateNextItem()}),t.adjustScroll(1)),38===e.which&&(e.preventDefault(),t.$apply(function(){t.activatePreviousItem()}),t.adjustScroll(-1)),(37===e.which||39===e.which)&&e.preventDefault())})}],link:function(t,o,a){function c(e){function n(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation()}var r=t.getActiveMenuScope();if(r){if(9===e.which||13===e.which)return n(e),r.selectActive(),!1;if(27===e.which)return n(e),r.$apply(function(){r.hideMenu()}),!1;if(40===e.which)return n(e),r.$apply(function(){r.activateNextItem()}),r.adjustScroll(1),!1;if(38===e.which)return n(e),r.$apply(function(){r.activatePreviousItem()}),r.adjustScroll(-1),!1;if(37===e.which||39===e.which)return n(e),!1}}if(t.triggerCharMap={},t.targetElement=o,a.$set("autocomplete","off"),a.mentioItems){t.localItems=[],t.parentScope=t;var l=a.mentioSearch?' mentio-items="items"':' mentio-items="localItems"';t.defaultTriggerChar=a.mentioTriggerChar?t.$eval(a.mentioTriggerChar):"@";var s='<mentio-menu mentio-search="bridgeSearch(term)" mentio-select="bridgeSelect(item)"'+l;a.mentioTemplateUrl&&(s=s+' mentio-template-url="'+a.mentioTemplateUrl+'"'),s=s+" mentio-trigger-char=\"'"+t.defaultTriggerChar+'\'" mentio-parent-scope="parentScope"/>';var m=n(s),u=m(t);o.parent().append(u),t.$on("$destroy",function(){u.remove()})}a.mentioTypedTerm&&(t.syncTriggerText=!0),t.$watch("iframeElement",function(e){if(e){var n=e.contentWindow.document;n.addEventListener("click",function(){t.isActive()&&t.$apply(function(){t.hideAll()})}),n.addEventListener("keydown",c,!0),t.$on("$destroy",function(){n.removeEventListener("keydown",c)})}}),t.$watch("ngModel",function(n){if(n&&""!==n||t.isActive()){if(void 0===t.triggerCharSet)return r.error("Error, no mentio-items attribute was provided, and no separate mentio-menus were specified.  Nothing to do."),void 0;if(t.contentEditableMenuPasted)return t.contentEditableMenuPasted=!1,void 0;t.replacingMacro&&(i.cancel(t.timer),t.replacingMacro=!1);var o=t.isActive(),a=t.isContentEditable(),c=e.getTriggerInfo(t.context(),t.triggerCharSet,t.requireLeadingSpace,o);if(void 0!==c&&(!o||o&&(a&&c.mentionTriggerChar===t.currentMentionTriggerChar||!a&&c.mentionPosition===t.currentMentionPosition)))c.mentionSelectedElement&&(t.targetElement=c.mentionSelectedElement,t.targetElementPath=c.mentionSelectedPath,t.targetElementSelectedOffset=c.mentionSelectedOffset),t.setTriggerText(c.mentionText),t.currentMentionPosition=c.mentionPosition,t.currentMentionTriggerChar=c.mentionTriggerChar,t.query(c.mentionTriggerChar,c.mentionText);else{var l=t.typedTerm;t.setTriggerText(""),t.hideAll();var s=e.getMacroMatch(t.context(),t.macros);if(void 0!==s)t.targetElement=s.macroSelectedElement,t.targetElementPath=s.macroSelectedPath,t.targetElementSelectedOffset=s.macroSelectedOffset,t.replaceMacro(s.macroText,s.macroHasTrailingSpace);else if(t.selectNotFound&&l&&""!==l){var m=t.triggerCharMap[t.currentMentionTriggerChar];if(m){var u=m.select({item:{label:l}});"function"==typeof u.then?u.then(t.replaceText):t.replaceText(u,!0)}}}}})}}}]).directive("mentioMenu",["mentioUtil","$rootScope","$log","$window","$document",function(e,t,n,r,i){return{restrict:"E",scope:{search:"&mentioSearch",select:"&mentioSelect",items:"=mentioItems",triggerChar:"=mentioTriggerChar",forElem:"=mentioFor",parentScope:"=mentioParentScope"},templateUrl:function(e,t){return void 0!==t.mentioTemplateUrl?t.mentioTemplateUrl:"mentio-menu.tpl.html"},controller:["$scope",function(e){e.visible=!1,this.activate=e.activate=function(t){e.activeItem=t},this.isActive=e.isActive=function(t){return e.activeItem===t},this.selectItem=e.selectItem=function(t){var n=e.select({item:t});"function"==typeof n.then?n.then(e.parentMentio.replaceText):e.parentMentio.replaceText(n)},e.activateNextItem=function(){var t=e.items.indexOf(e.activeItem);this.activate(e.items[(t+1)%e.items.length])},e.activatePreviousItem=function(){var t=e.items.indexOf(e.activeItem);this.activate(e.items[0===t?e.items.length-1:t-1])},e.isFirstItemActive=function(){var t=e.items.indexOf(e.activeItem);return 0===t},e.isLastItemActive=function(){var t=e.items.indexOf(e.activeItem);return t===e.items.length-1},e.selectActive=function(){e.selectItem(e.activeItem)},e.isVisible=function(){return e.visible},e.showMenu=function(){e.visible||(e.requestVisiblePendingSearch=!0)},e.setParent=function(t){e.parentMentio=t,e.targetElement=t.targetElement}}],link:function(o,a){if(a[0].parentNode.removeChild(a[0]),i[0].body.appendChild(a[0]),o.menuElement=a,o.parentScope)o.parentScope.addMenu(o);else{if(!o.forElem)return n.error("mentio-menu requires a target element in tbe mentio-for attribute"),void 0;if(!o.triggerChar)return n.error("mentio-menu requires a trigger char"),void 0;t.$broadcast("menuCreated",{targetElement:o.forElem,scope:o})}angular.element(r).bind("resize",function(){if(o.isVisible()){var t=[];t.push(o.triggerChar),e.popUnderMention(o.parentMentio.context(),t,a,o.requireLeadingSpace)}}),o.$watch("items",function(e){e&&e.length>0?(o.activate(e[0]),!o.visible&&o.requestVisiblePendingSearch&&(o.visible=!0,o.requestVisiblePendingSearch=!1)):o.hideMenu()}),o.$watch("isVisible()",function(t){if(t){var n=[];n.push(o.triggerChar),e.popUnderMention(o.parentMentio.context(),n,a,o.requireLeadingSpace)}}),o.parentMentio.$on("$destroy",function(){a.remove()}),o.hideMenu=function(){o.visible=!1,a.css("display","none")},o.adjustScroll=function(e){var t=a[0],n=t.querySelector("ul"),r=t.querySelector("[mentio-menu-item].active");return o.isFirstItemActive()?n.scrollTop=0:o.isLastItemActive()?n.scrollTop=n.scrollHeight:(1===e?n.scrollTop+=r.offsetHeight:n.scrollTop-=r.offsetHeight,void 0)}}}}]).directive("mentioMenuItem",function(){return{restrict:"A",scope:{item:"=mentioMenuItem"},require:"^mentioMenu",link:function(e,t,n,r){e.$watch(function(){return r.isActive(e.item)},function(e){e?t.addClass("active"):t.removeClass("active")}),t.bind("mouseenter",function(){e.$apply(function(){r.activate(e.item)})}),t.bind("click",function(){return r.selectItem(e.item),!1})}}}).filter("unsafe",["$sce",function(e){return function(t){return e.trustAsHtml(t)}}]).filter("mentioHighlight",function(){function e(e){return e.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}return function(t,n,r){if(n){var i=r?'<span class="'+r+'">$&</span>':"<strong>$&</strong>";return(""+t).replace(new RegExp(e(n),"gi"),i)}return t}}),angular.module("mentio").factory("mentioUtil",["$window","$location","$anchorScroll","$timeout",function(e,t,n,r){function i(e,t,n,i){var c,l=h(e,t,i,!1);void 0!==l?(c=a(e)?b(e,v(e).activeElement,l.mentionPosition):S(e,l.mentionPosition),n.css({top:c.top+"px",left:c.left+"px",position:"absolute",zIndex:100,display:"block"}),r(function(){o(e,n)},0)):n.css({display:"none"})}function o(t,n){for(var r,i=20,o=100,a=n[0];void 0===r||0===r.height;)if(r=a.getBoundingClientRect(),0===r.height&&(a=a.childNodes[0],void 0===a||!a.getBoundingClientRect))return;var c=r.top,l=c+r.height;if(0>c)e.scrollTo(0,e.pageYOffset+r.top-i);else if(l>e.innerHeight){var s=e.pageYOffset+r.top-i;s-e.pageYOffset>o&&(s=e.pageYOffset+o);var m=e.pageYOffset-(e.innerHeight-l);m>s&&(m=s),e.scrollTo(0,m)}}function a(e){var t=v(e).activeElement;if(null!==t){var n=t.nodeName,r=t.getAttribute("type");return"INPUT"===n&&"text"===r||"TEXTAREA"===n}return!1}function c(e,t,n,r){var i,o=t;if(n)for(var a=0;a<n.length;a++){if(o=o.childNodes[n[a]],void 0===o)return;for(;o.length<r;)r-=o.length,o=o.nextSibling;0!==o.childNodes.length||o.length||(o=o.previousSibling)}var c=p(e);i=v(e).createRange(),i.setStart(o,r),i.setEnd(o,r),i.collapse(!0);try{c.removeAllRanges()}catch(l){}c.addRange(i),t.focus()}function l(e,t,n,r){var i,o;o=p(e),i=v(e).createRange(),i.setStart(o.anchorNode,n),i.setEnd(o.anchorNode,r),i.deleteContents();var a=v(e).createElement("div");a.innerHTML=t;for(var c,l,s=v(e).createDocumentFragment();c=a.firstChild;)l=s.appendChild(c);i.insertNode(s),l&&(i=i.cloneRange(),i.setStartAfter(l),i.collapse(!0),o.removeAllRanges(),o.addRange(i))}function s(e,t,n,r){var i=t.nodeName;"INPUT"===i||"TEXTAREA"===i?t!==v(e).activeElement&&t.focus():c(e,t,n,r)}function m(e,t,n,r,i,o){s(e,t,n,r);var c=d(e,i);if(c.macroHasTrailingSpace&&(c.macroText=c.macroText+" ",o+=" "),void 0!==c){var m=v(e).activeElement;if(a(e)){var u=c.macroPosition,g=c.macroPosition+c.macroText.length;m.value=m.value.substring(0,u)+o+m.value.substring(g,m.value.length),m.selectionStart=u+o.length,m.selectionEnd=u+o.length}else l(e,o,c.macroPosition,c.macroPosition+c.macroText.length)}}function u(e,t,n,r,i,o,c,m){s(e,t,n,r);var u=h(e,i,c,!0,m);if(void 0!==u)if(a()){var g=v(e).activeElement;o+=" ";var d=u.mentionPosition,f=u.mentionPosition+u.mentionText.length+1;g.value=g.value.substring(0,d)+o+g.value.substring(f,g.value.length),g.selectionStart=d+o.length,g.selectionEnd=d+o.length}else o+=" ",l(e,o,u.mentionPosition,u.mentionPosition+u.mentionText.length+1)}function g(e,t){if(null===t.parentNode)return 0;for(var n=0;n<t.parentNode.childNodes.length;n++){var r=t.parentNode.childNodes[n];if(r===t)return n}}function d(e,t){var n,r,i=[];if(a(e))n=v(e).activeElement;else{var o=f(e);o&&(n=o.selected,i=o.path,r=o.offset)}var c=T(e);if(void 0!==c&&null!==c){var l,s=!1;if(c.length>0&&(" "===c.charAt(c.length-1)||" "===c.charAt(c.length-1))&&(s=!0,c=c.substring(0,c.length-1)),angular.forEach(t,function(e,t){var o=c.toUpperCase().lastIndexOf(t.toUpperCase());if(o>=0&&t.length+o===c.length){var a=o-1;(0===o||" "===c.charAt(a)||" "===c.charAt(a))&&(l={macroPosition:o,macroText:t,macroSelectedElement:n,macroSelectedPath:i,macroSelectedOffset:r,macroHasTrailingSpace:s})}}),l)return l}}function f(e){var t,n=p(e),r=n.anchorNode,i=[];if(null!=r){for(var o,a=r.contentEditable;null!==r&&"true"!==a;)o=g(e,r),i.push(o),r=r.parentNode,null!==r&&(a=r.contentEditable);return i.reverse(),t=n.getRangeAt(0).startOffset,{selected:r,path:i,offset:t}}}function h(e,t,n,r,i){var o,c,l;if(a(e))o=v(e).activeElement;else{var s=f(e);s&&(o=s.selected,c=s.path,l=s.offset)}var m=T(e);if(void 0!==m&&null!==m){var u,g=-1;if(t.forEach(function(e){var t=m.lastIndexOf(e);t>g&&(g=t,u=e)}),g>=0&&(0===g||!n||/[\xA0\s]/g.test(m.substring(g-1,g)))){var d=m.substring(g+1,m.length);u=m.substring(g,g+1);var h=d.substring(0,1),p=d.length>0&&(" "===h||" "===h);if(i&&(d=d.trim()),!p&&(r||!/[\xA0\s]/g.test(d)))return{mentionPosition:g,mentionText:d,mentionSelectedElement:o,mentionSelectedPath:c,mentionSelectedOffset:l,mentionTriggerChar:u}}}}function p(e){return e?e.iframe.contentWindow.getSelection():window.getSelection()}function v(e){return e?e.iframe.contentWindow.document:document}function T(e){var t;if(a(e)){var n=v(e).activeElement,r=n.selectionStart;t=n.value.substring(0,r)}else{var i=p(e).anchorNode;if(null!=i){var o=i.textContent,c=p(e).getRangeAt(0).startOffset;c>=0&&(t=o.substring(0,c))}}return t}function S(e,t){var n,r,i="﻿",o="sel_"+(new Date).getTime()+"_"+Math.random().toString().substr(2),a=p(e),c=a.getRangeAt(0);r=v(e).createRange(),r.setStart(a.anchorNode,t),r.setEnd(a.anchorNode,t),r.collapse(!1),n=v(e).createElement("span"),n.id=o,n.appendChild(v(e).createTextNode(i)),r.insertNode(n),a.removeAllRanges(),a.addRange(c);var l={left:0,top:n.offsetHeight};return E(e,n,l),n.parentNode.removeChild(n),l}function E(e,t,n){for(var r=t,i=e?e.iframe:null;r;)n.left+=r.offsetLeft,n.top+=r.offsetTop,r!==v().body&&(n.top-=r.scrollTop,n.left-=r.scrollLeft),r=r.offsetParent,!r&&i&&(r=i,i=null)}function b(e,t,n){var r=["direction","boxSizing","width","height","overflowX","overflowY","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","paddingTop","paddingRight","paddingBottom","paddingLeft","fontStyle","fontVariant","fontWeight","fontStretch","fontSize","fontSizeAdjust","lineHeight","fontFamily","textAlign","textTransform","textIndent","textDecoration","letterSpacing","wordSpacing"],i=null!==window.mozInnerScreenX,o=v(e).createElement("div");o.id="input-textarea-caret-position-mirror-div",v(e).body.appendChild(o);var a=o.style,c=window.getComputedStyle?getComputedStyle(t):t.currentStyle;a.whiteSpace="pre-wrap","INPUT"!==t.nodeName&&(a.wordWrap="break-word"),a.position="absolute",a.visibility="hidden",r.forEach(function(e){a[e]=c[e]}),i?(a.width=parseInt(c.width)-2+"px",t.scrollHeight>parseInt(c.height)&&(a.overflowY="scroll")):a.overflow="hidden",o.textContent=t.value.substring(0,n),"INPUT"===t.nodeName&&(o.textContent=o.textContent.replace(/\s/g," "));var l=v(e).createElement("span");l.textContent=t.value.substring(n)||".",o.appendChild(l);var s={top:l.offsetTop+parseInt(c.borderTopWidth)+parseInt(c.fontSize),left:l.offsetLeft+parseInt(c.borderLeftWidth)};return E(e,t,s),v(e).body.removeChild(o),s}return{popUnderMention:i,replaceMacroText:m,replaceTriggerText:u,getMacroMatch:d,getTriggerInfo:h,selectElement:c,getTextAreaOrInputUnderlinePosition:b,getTextPrecedingCurrentSelection:T,getContentEditableSelectedPath:f,getNodePositionInParent:g,getContentEditableCaretPosition:S,pasteHtml:l,resetSelection:s,scrollIntoView:o}}]),angular.module("mentio").run(["$templateCache",function(e){e.put("mentio-menu.tpl.html",'<style>\n.scrollable-menu {\n    height: auto;\n    max-height: 300px;\n    overflow: auto;\n}\n\n.menu-highlighted {\n    font-weight: bold;\n}\n</style>\n<ul class="dropdown-menu scrollable-menu" style="display:block">\n    <li mentio-menu-item="item" ng-repeat="item in items track by $index">\n        <a class="text-primary" ng-bind-html="item.label | mentioHighlight:typedTerm:\'menu-highlighted\' | unsafe"></a>\n    </li>\n</ul>')}]);

angular.module("uiSwitch",[]).directive("switch",function(){return{restrict:"AE",replace:!0,transclude:!0,template:function(n,e){var s="";return s+="<span",s+=' class="switch'+(e.class?" "+e.class:"")+'"',s+=e.ngModel?' ng-click="'+e.ngModel+"=!"+e.ngModel+(e.ngChange?"; "+e.ngChange+'()"':'"'):"",s+=' ng-class="{ checked:'+e.ngModel+' }"',s+=">",s+="<small></small>",s+='<input type="checkbox"',s+=e.id?' id="'+e.id+'"':"",s+=e.name?' name="'+e.name+'"':"",s+=e.ngModel?' ng-model="'+e.ngModel+'"':"",s+=' style="display:none" />',s+='<span class="switch-text">',s+=e.on?'<span class="on">'+e.on+"</span>":"",s+=e.off?'<span class="off">'+e.off+"</span>":" ",s+="</span>"}}});

"use strict";angular.module("mm.acl",[]),angular.module("mm.acl").provider("AclService",[function(){function a(){var a;switch(b.storage){case"sessionStorage":a=h("sessionStorage");break;case"localStorage":a=h("localStorage");break;default:a=null}return a?(angular.extend(c,a),!0):!1}Array.prototype.indexOf||(Array.prototype.indexOf=function(a){for(var b=this.length;b--;)if(this[b]===a)return b;return-1});var b={storage:"sessionStorage",storageKey:"AclService"},c={roles:[],abilities:{}},d=function(a){return"object"==typeof c.abilities[a]},e=function(a){return d(a)?c.abilities[a]:[]},f=function(){switch(b.storage){case"sessionStorage":g("sessionStorage");break;case"localStorage":g("localStorage");break;default:return}},g=function(a){window[a].setItem(b.storageKey,JSON.stringify(c))},h=function(a){var c=window[a].getItem(b.storageKey);return c?JSON.parse(c):!1},i={};return i.resume=a,i.attachRole=function(a){-1===c.roles.indexOf(a)&&(c.roles.push(a),f())},i.detachRole=function(a){var b=c.roles.indexOf(a);b>-1&&(c.roles.splice(b,1),f())},i.flushRoles=function(){c.roles=[],f()},i.hasRole=function(a){return c.roles.indexOf(a)>-1},i.getRoles=function(){return c.roles},i.setAbilities=function(a){c.abilities=a,f()},i.addAbility=function(a,b){c.abilities[a]||(c.abilities[a]=[]),c.abilities[a].push(b),f()},i.can=function(a){for(var b,d,f=c.roles.length;f--;)if(b=c.roles[f],d=e(b),d.indexOf(a)>-1)return!0;return!1},{config:function(a){angular.extend(b,a)},resume:a,$get:function(){return i}}}]);

/**
 * Angular directive/filter/service for formatting date so that it displays how long ago the given time was compared to now.
 * @version v0.2.4 - 2015-08-30
 * @link https://github.com/yaru22/angular-timeago
 * @author Brian Park <yaru22@gmail.com>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
/* global angular */
'use strict';
angular.module('yaru22.angular-timeago', []).directive('timeAgo', [
  'timeAgo',
  'nowTime',
  function (timeAgo, nowTime) {
    return {
      scope: {
        fromTime: '@',
        format: '@'
      },
      restrict: 'EA',
      link: function (scope, elem) {
        var fromTime = timeAgo.parse(scope.fromTime);
        // Track changes to time difference
        scope.$watch(function () {
          return nowTime() - fromTime;
        }, function (value) {
          angular.element(elem).text(timeAgo.inWords(value, fromTime, scope.format));
        });
      }
    };
  }
]).factory('nowTime', [
  '$window',
  '$rootScope',
  function ($window, $rootScope) {
    var nowTime = Date.now();
    var updateTime = function () {
      $window.setTimeout(function () {
        $rootScope.$apply(function () {
          nowTime = Date.now();
          updateTime();
        });
      }, 60 * 1000);
    };
    updateTime();
    return function () {
      return nowTime;
    };
  }
]).factory('timeAgo', [
  '$filter',
  function ($filter) {
    var service = {};
    service.settings = {
      refreshMillis: 60000,
      allowFuture: false,
      overrideLang: null,
      fullDateAfterSeconds: null,
      strings: {
        'en_US': {
          prefixAgo: null,
          prefixFromNow: null,
          suffixAgo: 'ago',
          suffixFromNow: 'from now',
          seconds: 'less than a minute',
          minute: 'about a minute',
          minutes: '%d minutes',
          hour: 'about an hour',
          hours: 'about %d hours',
          day: 'a day',
          days: '%d days',
          month: 'about a month',
          months: '%d months',
          year: 'about a year',
          years: '%d years',
          numbers: []
        },
        'es_LA': {
          prefixAgo: 'hace',
          prefixFromNow: 'en',
          suffixAgo: null,
          suffixFromNow: null,
          seconds: 'unos segundos',
          minute: 'un minuto',
          minutes: '%d minutos',
          hour: 'una hora',
          hours: '%d horas',
          day: 'un d\xeda',
          days: '%d d\xedas',
          month: 'un mes',
          months: '%d meses',
          year: 'un a\xf1o',
          years: '%d a\xf1os',
          numbers: []
        }
      }
    };
    service.inWords = function (distanceMillis, fromTime, format, timezone) {
      var fullDateAfterSeconds = parseInt(service.settings.fullDateAfterSeconds, 10);
      if (!isNaN(fullDateAfterSeconds)) {
        var fullDateAfterMillis = fullDateAfterSeconds * 1000;
        if (distanceMillis >= 0 && fullDateAfterMillis <= distanceMillis || distanceMillis < 0 && fullDateAfterMillis >= distanceMillis) {
          if (format) {
            return $filter('date')(fromTime, format, timezone);
          }
          return fromTime;
        }
      }
      var overrideLang = service.settings.overrideLang;
      var documentLang = document.documentElement.lang;
      var sstrings = service.settings.strings;
      var lang, $l;
      if (typeof sstrings[overrideLang] !== 'undefined') {
        lang = overrideLang;
        $l = sstrings[overrideLang];
      } else if (typeof sstrings[documentLang] !== 'undefined') {
        lang = documentLang;
        $l = sstrings[documentLang];
      } else {
        lang = 'es_LA';
        $l = sstrings[lang];
      }
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (service.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }
      var seconds = Math.abs(distanceMillis) / 1000;
      var minutes = seconds / 60;
      var hours = minutes / 60;
      var days = hours / 24;
      var years = days / 365;
      function substitute(stringOrFunction, number) {
        var string = angular.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
        var value = $l.numbers && $l.numbers[number] || number;
        return string.replace(/%d/i, value);
      }
      var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) || seconds < 90 && substitute($l.minute, 1) || minutes < 45 && substitute($l.minutes, Math.round(minutes)) || minutes < 90 && substitute($l.hour, 1) || hours < 24 && substitute($l.hours, Math.round(hours)) || hours < 42 && substitute($l.day, 1) || days < 30 && substitute($l.days, Math.round(days)) || days < 45 && substitute($l.month, 1) || days < 365 && substitute($l.months, Math.round(days / 30)) || years < 1.5 && substitute($l.year, 1) || substitute($l.years, Math.round(years));
      var separator = $l.wordSeparator === undefined ? ' ' : $l.wordSeparator;

      return [
        prefix,
        words,
        suffix
      ].join(separator).trim();
    };
    service.parse = function (input) {
      if (input instanceof Date) {
        return input;
      } else if (angular.isNumber(input)) {
        return new Date(input);
      } else if (/^\d+$/.test(input)) {
        return new Date(parseInt(input, 10));
      } else {
        var s = (input || '').trim();
        s = s.replace(/\.\d+/, '');
        // remove milliseconds
        s = s.replace(/-/, '/').replace(/-/, '/');
        s = s.replace(/T/, ' ').replace(/Z/, ' UTC');
        s = s.replace(/([\+\-]\d\d)\:?(\d\d)/, ' $1$2');
        // -04:00 -> -0400
        return new Date(s);
      }
    };
    return service;
  }
]).filter('timeAgo', [
  'nowTime',
  'timeAgo',
  function (nowTime, timeAgo) {
    return function (value, format, timezone) {
      var fromTime = timeAgo.parse(value);
      var diff = nowTime() - fromTime;
      return timeAgo.inWords(diff, fromTime, format, timezone);
    };
  }
]);

/*! algoliasearch 3.8.1 | © 2014, 2015 Algolia SAS | github.com/algolia/algoliasearch-client-js */
!function(e){var t;"undefined"!=typeof window?t=window:"undefined"!=typeof self&&(t=self),t.ALGOLIA_MIGRATION_LAYER=e()}(function(){return function e(t,n,r){function o(s,a){if(!n[s]){if(!t[s]){var u="function"==typeof require&&require;if(!a&&u)return u(s,!0);if(i)return i(s,!0);var c=new Error("Cannot find module '"+s+"'");throw c.code="MODULE_NOT_FOUND",c}var l=n[s]={exports:{}};t[s][0].call(l.exports,function(e){var n=t[s][1][e];return o(n?n:e)},l,l.exports,e,t,n,r)}return n[s].exports}for(var i="function"==typeof require&&require,s=0;s<r.length;s++)o(r[s]);return o}({1:[function(e,t,n){function r(e,t){for(var n in t)e.setAttribute(n,t[n])}function o(e,t){e.onload=function(){this.onerror=this.onload=null,t(null,e)},e.onerror=function(){this.onerror=this.onload=null,t(new Error("Failed to load "+this.src),e)}}function i(e,t){e.onreadystatechange=function(){("complete"==this.readyState||"loaded"==this.readyState)&&(this.onreadystatechange=null,t(null,e))}}t.exports=function(e,t,n){var s=document.head||document.getElementsByTagName("head")[0],a=document.createElement("script");"function"==typeof t&&(n=t,t={}),t=t||{},n=n||function(){},a.type=t.type||"text/javascript",a.charset=t.charset||"utf8",a.async="async"in t?!!t.async:!0,a.src=e,t.attrs&&r(a,t.attrs),t.text&&(a.text=""+t.text);var u="onload"in a?o:i;u(a,n),a.onload||o(a,n),s.appendChild(a)}},{}],2:[function(e,t,n){"use strict";function r(e){for(var t=new RegExp("cdn\\.jsdelivr\\.net/algoliasearch/latest/"+e.replace(".","\\.")+"(?:\\.min)?\\.js$"),n=document.getElementsByTagName("script"),r=!1,o=0,i=n.length;i>o;o++)if(n[o].src&&t.test(n[o].src)){r=!0;break}return r}t.exports=r},{}],3:[function(e,t,n){"use strict";function r(t){var n=e(1),r="//cdn.jsdelivr.net/algoliasearch/2/"+t+".min.js",i="-- AlgoliaSearch `latest` warning --\nWarning, you are using the `latest` version string from jsDelivr to load the AlgoliaSearch library.\nUsing `latest` is no more recommended, you should load //cdn.jsdelivr.net/algoliasearch/2/algoliasearch.min.js\n\nAlso, we updated the AlgoliaSearch JavaScript client to V3. If you want to upgrade,\nplease read our migration guide at https://github.com/algolia/algoliasearch-client-js/wiki/Migration-guide-from-2.x.x-to-3.x.x\n-- /AlgoliaSearch  `latest` warning --";window.console&&(window.console.warn?window.console.warn(i):window.console.log&&window.console.log(i));try{document.write("<script>window.ALGOLIA_SUPPORTS_DOCWRITE = true</script>"),window.ALGOLIA_SUPPORTS_DOCWRITE===!0?(document.write('<script src="'+r+'"></script>'),o("document.write")()):n(r,o("DOMElement"))}catch(s){n(r,o("DOMElement"))}}function o(e){return function(){var t="AlgoliaSearch: loaded V2 script using "+e;window.console&&window.console.log&&window.console.log(t)}}t.exports=r},{1:1}],4:[function(e,t,n){"use strict";function r(){var e="-- AlgoliaSearch V2 => V3 error --\nYou are trying to use a new version of the AlgoliaSearch JavaScript client with an old notation.\nPlease read our migration guide at https://github.com/algolia/algoliasearch-client-js/wiki/Migration-guide-from-2.x.x-to-3.x.x\n-- /AlgoliaSearch V2 => V3 error --";window.AlgoliaSearch=function(){throw new Error(e)},window.AlgoliaSearchHelper=function(){throw new Error(e)},window.AlgoliaExplainResults=function(){throw new Error(e)}}t.exports=r},{}],5:[function(e,t,n){"use strict";function r(t){var n=e(2),r=e(3),o=e(4);n(t)?r(t):o()}r("algoliasearch.angular")},{2:2,3:3,4:4}]},{},[5])(5)}),function e(t,n,r){function o(s,a){if(!n[s]){if(!t[s]){var u="function"==typeof require&&require;if(!a&&u)return u(s,!0);if(i)return i(s,!0);var c=new Error("Cannot find module '"+s+"'");throw c.code="MODULE_NOT_FOUND",c}var l=n[s]={exports:{}};t[s][0].call(l.exports,function(e){var n=t[s][1][e];return o(n?n:e)},l,l.exports,e,t,n,r)}return n[s].exports}for(var i="function"==typeof require&&require,s=0;s<r.length;s++)o(r[s]);return o}({1:[function(e,t,n){function r(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function o(e){return"function"==typeof e}function i(e){return"number"==typeof e}function s(e){return"object"==typeof e&&null!==e}function a(e){return void 0===e}t.exports=r,r.EventEmitter=r,r.prototype._events=void 0,r.prototype._maxListeners=void 0,r.defaultMaxListeners=10,r.prototype.setMaxListeners=function(e){if(!i(e)||0>e||isNaN(e))throw TypeError("n must be a positive number");return this._maxListeners=e,this},r.prototype.emit=function(e){var t,n,r,i,u,c;if(this._events||(this._events={}),"error"===e&&(!this._events.error||s(this._events.error)&&!this._events.error.length)){if(t=arguments[1],t instanceof Error)throw t;throw TypeError('Uncaught, unspecified "error" event.')}if(n=this._events[e],a(n))return!1;if(o(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:for(r=arguments.length,i=new Array(r-1),u=1;r>u;u++)i[u-1]=arguments[u];n.apply(this,i)}else if(s(n)){for(r=arguments.length,i=new Array(r-1),u=1;r>u;u++)i[u-1]=arguments[u];for(c=n.slice(),r=c.length,u=0;r>u;u++)c[u].apply(this,i)}return!0},r.prototype.addListener=function(e,t){var n;if(!o(t))throw TypeError("listener must be a function");if(this._events||(this._events={}),this._events.newListener&&this.emit("newListener",e,o(t.listener)?t.listener:t),this._events[e]?s(this._events[e])?this._events[e].push(t):this._events[e]=[this._events[e],t]:this._events[e]=t,s(this._events[e])&&!this._events[e].warned){var n;n=a(this._maxListeners)?r.defaultMaxListeners:this._maxListeners,n&&n>0&&this._events[e].length>n&&(this._events[e].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[e].length),"function"==typeof console.trace&&console.trace())}return this},r.prototype.on=r.prototype.addListener,r.prototype.once=function(e,t){function n(){this.removeListener(e,n),r||(r=!0,t.apply(this,arguments))}if(!o(t))throw TypeError("listener must be a function");var r=!1;return n.listener=t,this.on(e,n),this},r.prototype.removeListener=function(e,t){var n,r,i,a;if(!o(t))throw TypeError("listener must be a function");if(!this._events||!this._events[e])return this;if(n=this._events[e],i=n.length,r=-1,n===t||o(n.listener)&&n.listener===t)delete this._events[e],this._events.removeListener&&this.emit("removeListener",e,t);else if(s(n)){for(a=i;a-->0;)if(n[a]===t||n[a].listener&&n[a].listener===t){r=a;break}if(0>r)return this;1===n.length?(n.length=0,delete this._events[e]):n.splice(r,1),this._events.removeListener&&this.emit("removeListener",e,t)}return this},r.prototype.removeAllListeners=function(e){var t,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[e]&&delete this._events[e],this;if(0===arguments.length){for(t in this._events)"removeListener"!==t&&this.removeAllListeners(t);return this.removeAllListeners("removeListener"),this._events={},this}if(n=this._events[e],o(n))this.removeListener(e,n);else for(;n.length;)this.removeListener(e,n[n.length-1]);return delete this._events[e],this},r.prototype.listeners=function(e){var t;return t=this._events&&this._events[e]?o(this._events[e])?[this._events[e]]:this._events[e].slice():[]},r.listenerCount=function(e,t){var n;return n=e._events&&e._events[t]?o(e._events[t])?1:e._events[t].length:0}},{}],2:[function(e,t,n){function r(){l=!1,a.length?c=a.concat(c):f=-1,c.length&&o()}function o(){if(!l){var e=setTimeout(r);l=!0;for(var t=c.length;t;){for(a=c,c=[];++f<t;)a&&a[f].run();f=-1,t=c.length}a=null,l=!1,clearTimeout(e)}}function i(e,t){this.fun=e,this.array=t}function s(){}var a,u=t.exports={},c=[],l=!1,f=-1;u.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];c.push(new i(e,t)),1!==c.length||l||setTimeout(o,0)},i.prototype.run=function(){this.fun.apply(null,this.array)},u.title="browser",u.browser=!0,u.env={},u.argv=[],u.version="",u.versions={},u.on=s,u.addListener=s,u.once=s,u.off=s,u.removeListener=s,u.removeAllListeners=s,u.emit=s,u.binding=function(e){throw new Error("process.binding is not supported")},u.cwd=function(){return"/"},u.chdir=function(e){throw new Error("process.chdir is not supported")},u.umask=function(){return 0}},{}],3:[function(e,t,n){"use strict";function r(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.exports=function(e,t,n,i){t=t||"&",n=n||"=";var s={};if("string"!=typeof e||0===e.length)return s;var a=/\+/g;e=e.split(t);var u=1e3;i&&"number"==typeof i.maxKeys&&(u=i.maxKeys);var c=e.length;u>0&&c>u&&(c=u);for(var l=0;c>l;++l){var f,d,h,p,y=e[l].replace(a,"%20"),m=y.indexOf(n);m>=0?(f=y.substr(0,m),d=y.substr(m+1)):(f=y,d=""),h=decodeURIComponent(f),p=decodeURIComponent(d),r(s,h)?o(s[h])?s[h].push(p):s[h]=[s[h],p]:s[h]=p}return s};var o=Array.isArray||function(e){return"[object Array]"===Object.prototype.toString.call(e)}},{}],4:[function(e,t,n){"use strict";function r(e,t){if(e.map)return e.map(t);for(var n=[],r=0;r<e.length;r++)n.push(t(e[r],r));return n}var o=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}};t.exports=function(e,t,n,a){return t=t||"&",n=n||"=",null===e&&(e=void 0),"object"==typeof e?r(s(e),function(s){var a=encodeURIComponent(o(s))+n;return i(e[s])?r(e[s],function(e){return a+encodeURIComponent(o(e))}).join(t):a+encodeURIComponent(o(e[s]))}).join(t):a?encodeURIComponent(o(a))+n+encodeURIComponent(o(e)):""};var i=Array.isArray||function(e){return"[object Array]"===Object.prototype.toString.call(e)},s=Object.keys||function(e){var t=[];for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&t.push(n);return t}},{}],5:[function(e,t,n){"use strict";n.decode=n.parse=e(3),n.encode=n.stringify=e(4)},{3:3,4:4}],6:[function(e,t,n){function r(){return"WebkitAppearance"in document.documentElement.style||window.console&&(console.firebug||console.exception&&console.table)||navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)&&parseInt(RegExp.$1,10)>=31}function o(){var e=arguments,t=this.useColors;if(e[0]=(t?"%c":"")+this.namespace+(t?" %c":" ")+e[0]+(t?"%c ":" ")+"+"+n.humanize(this.diff),!t)return e;var r="color: "+this.color;e=[e[0],r,"color: inherit"].concat(Array.prototype.slice.call(e,1));var o=0,i=0;return e[0].replace(/%[a-z%]/g,function(e){"%%"!==e&&(o++,"%c"===e&&(i=o))}),e.splice(i,0,r),e}function i(){return"object"==typeof console&&console.log&&Function.prototype.apply.call(console.log,console,arguments)}function s(e){try{null==e?n.storage.removeItem("debug"):n.storage.debug=e}catch(t){}}function a(){var e;try{e=n.storage.debug}catch(t){}return e}function u(){try{return window.localStorage}catch(e){}}n=t.exports=e(7),n.log=i,n.formatArgs=o,n.save=s,n.load=a,n.useColors=r,n.storage="undefined"!=typeof chrome&&"undefined"!=typeof chrome.storage?chrome.storage.local:u(),n.colors=["lightseagreen","forestgreen","goldenrod","dodgerblue","darkorchid","crimson"],n.formatters.j=function(e){return JSON.stringify(e)},n.enable(a())},{7:7}],7:[function(e,t,n){function r(){return n.colors[l++%n.colors.length]}function o(e){function t(){}function o(){var e=o,t=+new Date,i=t-(c||t);e.diff=i,e.prev=c,e.curr=t,c=t,null==e.useColors&&(e.useColors=n.useColors()),null==e.color&&e.useColors&&(e.color=r());var s=Array.prototype.slice.call(arguments);s[0]=n.coerce(s[0]),"string"!=typeof s[0]&&(s=["%o"].concat(s));var a=0;s[0]=s[0].replace(/%([a-z%])/g,function(t,r){if("%%"===t)return t;a++;var o=n.formatters[r];if("function"==typeof o){var i=s[a];t=o.call(e,i),s.splice(a,1),a--}return t}),"function"==typeof n.formatArgs&&(s=n.formatArgs.apply(e,s));var u=o.log||n.log||console.log.bind(console);u.apply(e,s)}t.enabled=!1,o.enabled=!0;var i=n.enabled(e)?o:t;return i.namespace=e,i}function i(e){n.save(e);for(var t=(e||"").split(/[\s,]+/),r=t.length,o=0;r>o;o++)t[o]&&(e=t[o].replace(/\*/g,".*?"),"-"===e[0]?n.skips.push(new RegExp("^"+e.substr(1)+"$")):n.names.push(new RegExp("^"+e+"$")))}function s(){n.enable("")}function a(e){var t,r;for(t=0,r=n.skips.length;r>t;t++)if(n.skips[t].test(e))return!1;for(t=0,r=n.names.length;r>t;t++)if(n.names[t].test(e))return!0;return!1}function u(e){return e instanceof Error?e.stack||e.message:e}n=t.exports=o,n.coerce=u,n.disable=s,n.enable=i,n.enabled=a,n.humanize=e(8),n.names=[],n.skips=[],n.formatters={};var c,l=0},{8:8}],8:[function(e,t,n){function r(e){if(e=""+e,!(e.length>1e4)){var t=/^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(e);if(t){var n=parseFloat(t[1]),r=(t[2]||"ms").toLowerCase();switch(r){case"years":case"year":case"yrs":case"yr":case"y":return n*f;case"days":case"day":case"d":return n*l;case"hours":case"hour":case"hrs":case"hr":case"h":return n*c;case"minutes":case"minute":case"mins":case"min":case"m":return n*u;case"seconds":case"second":case"secs":case"sec":case"s":return n*a;case"milliseconds":case"millisecond":case"msecs":case"msec":case"ms":return n}}}}function o(e){return e>=l?Math.round(e/l)+"d":e>=c?Math.round(e/c)+"h":e>=u?Math.round(e/u)+"m":e>=a?Math.round(e/a)+"s":e+"ms"}function i(e){return s(e,l,"day")||s(e,c,"hour")||s(e,u,"minute")||s(e,a,"second")||e+" ms"}function s(e,t,n){return t>e?void 0:1.5*t>e?Math.floor(e/t)+" "+n:Math.ceil(e/t)+" "+n+"s"}var a=1e3,u=60*a,c=60*u,l=24*c,f=365.25*l;t.exports=function(e,t){return t=t||{},"string"==typeof e?r(e):t["long"]?i(e):o(e)}},{}],9:[function(e,t,n){(function(n,r){(function(){"use strict";function o(e){return"function"==typeof e||"object"==typeof e&&null!==e}function i(e){return"function"==typeof e}function s(e){return"object"==typeof e&&null!==e}function a(e){Q=e}function u(e){W=e}function c(){return function(){n.nextTick(p)}}function l(){return function(){K(p)}}function f(){var e=0,t=new z(p),n=document.createTextNode("");return t.observe(n,{characterData:!0}),function(){n.data=e=++e%2}}function d(){var e=new MessageChannel;return e.port1.onmessage=p,function(){e.port2.postMessage(0)}}function h(){return function(){setTimeout(p,1)}}function p(){for(var e=0;V>e;e+=2){var t=te[e],n=te[e+1];t(n),te[e]=void 0,te[e+1]=void 0}V=0}function y(){try{var t=e,n=t("vertx");return K=n.runOnLoop||n.runOnContext,l()}catch(r){return h()}}function m(){}function v(){return new TypeError("You cannot resolve a promise with itself")}function g(){return new TypeError("A promises callback cannot return that same promise.")}function b(e){try{return e.then}catch(t){return ie.error=t,ie}}function w(e,t,n,r){try{e.call(t,n,r)}catch(o){return o}}function _(e,t,n){W(function(e){var r=!1,o=w(n,t,function(n){r||(r=!0,t!==n?T(e,n):S(e,n))},function(t){r||(r=!0,k(e,t))},"Settle: "+(e._label||" unknown promise"));!r&&o&&(r=!0,k(e,o))},e)}function x(e,t){t._state===re?S(e,t._result):t._state===oe?k(e,t._result):R(t,void 0,function(t){T(e,t)},function(t){k(e,t)})}function j(e,t){if(t.constructor===e.constructor)x(e,t);else{var n=b(t);n===ie?k(e,ie.error):void 0===n?S(e,t):i(n)?_(e,t,n):S(e,t)}}function T(e,t){e===t?k(e,v()):o(t)?j(e,t):S(e,t)}function A(e){e._onerror&&e._onerror(e._result),O(e)}function S(e,t){e._state===ne&&(e._result=t,e._state=re,0!==e._subscribers.length&&W(O,e))}function k(e,t){e._state===ne&&(e._state=oe,e._result=t,W(A,e))}function R(e,t,n,r){var o=e._subscribers,i=o.length;e._onerror=null,o[i]=t,o[i+re]=n,o[i+oe]=r,0===i&&e._state&&W(O,e)}function O(e){var t=e._subscribers,n=e._state;if(0!==t.length){for(var r,o,i=e._result,s=0;s<t.length;s+=3)r=t[s],o=t[s+n],r?q(n,r,o,i):o(i);e._subscribers.length=0}}function I(){this.error=null}function P(e,t){try{return e(t)}catch(n){return se.error=n,se}}function q(e,t,n,r){var o,s,a,u,c=i(n);if(c){if(o=P(n,r),o===se?(u=!0,s=o.error,o=null):a=!0,t===o)return void k(t,g())}else o=r,a=!0;t._state!==ne||(c&&a?T(t,o):u?k(t,s):e===re?S(t,o):e===oe&&k(t,o))}function U(e,t){try{t(function(t){T(e,t)},function(t){k(e,t)})}catch(n){k(e,n)}}function E(e,t){var n=this;n._instanceConstructor=e,n.promise=new e(m),n._validateInput(t)?(n._input=t,n.length=t.length,n._remaining=t.length,n._init(),0===n.length?S(n.promise,n._result):(n.length=n.length||0,n._enumerate(),0===n._remaining&&S(n.promise,n._result))):k(n.promise,n._validationError())}function C(e){return new ae(this,e).promise}function N(e){function t(e){T(o,e)}function n(e){k(o,e)}var r=this,o=new r(m);if(!$(e))return k(o,new TypeError("You must pass an array to race.")),o;for(var i=e.length,s=0;o._state===ne&&i>s;s++)R(r.resolve(e[s]),void 0,t,n);return o}function L(e){var t=this;if(e&&"object"==typeof e&&e.constructor===t)return e;var n=new t(m);return T(n,e),n}function D(e){var t=this,n=new t(m);return k(n,e),n}function M(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function H(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}function J(e){this._id=de++,this._state=void 0,this._result=void 0,this._subscribers=[],m!==e&&(i(e)||M(),this instanceof J||H(),U(this,e))}function B(){var e;if("undefined"!=typeof r)e=r;else if("undefined"!=typeof self)e=self;else try{e=Function("return this")()}catch(t){throw new Error("polyfill failed because global object is unavailable in this environment")}var n=e.Promise;(!n||"[object Promise]"!==Object.prototype.toString.call(n.resolve())||n.cast)&&(e.Promise=he)}var F;F=Array.isArray?Array.isArray:function(e){return"[object Array]"===Object.prototype.toString.call(e)};var K,Q,G,$=F,V=0,W=({}.toString,function(e,t){te[V]=e,te[V+1]=t,V+=2,2===V&&(Q?Q(p):G())}),X="undefined"!=typeof window?window:void 0,Y=X||{},z=Y.MutationObserver||Y.WebKitMutationObserver,Z="undefined"!=typeof n&&"[object process]"==={}.toString.call(n),ee="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,te=new Array(1e3);G=Z?c():z?f():ee?d():void 0===X&&"function"==typeof e?y():h();var ne=void 0,re=1,oe=2,ie=new I,se=new I;E.prototype._validateInput=function(e){return $(e)},E.prototype._validationError=function(){return new Error("Array Methods must be provided an Array")},E.prototype._init=function(){this._result=new Array(this.length)};var ae=E;E.prototype._enumerate=function(){for(var e=this,t=e.length,n=e.promise,r=e._input,o=0;n._state===ne&&t>o;o++)e._eachEntry(r[o],o)},E.prototype._eachEntry=function(e,t){var n=this,r=n._instanceConstructor;s(e)?e.constructor===r&&e._state!==ne?(e._onerror=null,n._settledAt(e._state,t,e._result)):n._willSettleAt(r.resolve(e),t):(n._remaining--,n._result[t]=e)},E.prototype._settledAt=function(e,t,n){var r=this,o=r.promise;o._state===ne&&(r._remaining--,e===oe?k(o,n):r._result[t]=n),0===r._remaining&&S(o,r._result)},E.prototype._willSettleAt=function(e,t){var n=this;R(e,void 0,function(e){n._settledAt(re,t,e)},function(e){n._settledAt(oe,t,e)})};var ue=C,ce=N,le=L,fe=D,de=0,he=J;J.all=ue,J.race=ce,J.resolve=le,J.reject=fe,J._setScheduler=a,J._setAsap=u,J._asap=W,J.prototype={constructor:J,then:function(e,t){var n=this,r=n._state;if(r===re&&!e||r===oe&&!t)return this;var o=new this.constructor(m),i=n._result;if(r){var s=arguments[r-1];W(function(){q(r,o,s,i)})}else R(n,o,e,t);return o},"catch":function(e){return this.then(null,e)}};var pe=B,ye={Promise:he,polyfill:pe};"function"==typeof define&&define.amd?define(function(){return ye}):"undefined"!=typeof t&&t.exports?t.exports=ye:"undefined"!=typeof this&&(this.ES6Promise=ye),pe()}).call(this)}).call(this,e(2),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{2:2}],10:[function(e,t,n){"function"==typeof Object.create?t.exports=function(e,t){e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(e,t){e.super_=t;var n=function(){};n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e}},{}],11:[function(e,t,n){var r=e(14),o=e(18),i=e(30),s=i(r,o);t.exports=s},{14:14,18:18,30:30}],12:[function(e,t,n){function r(e,t){if("function"!=typeof e)throw new TypeError(o);return t=i(void 0===t?e.length-1:+t||0,0),function(){for(var n=arguments,r=-1,o=i(n.length-t,0),s=Array(o);++r<o;)s[r]=n[t+r];switch(t){case 0:return e.call(this,s);case 1:return e.call(this,n[0],s);case 2:return e.call(this,n[0],n[1],s)}var a=Array(t+1);for(r=-1;++r<t;)a[r]=n[r];return a[t]=s,e.apply(this,a)}}var o="Expected a function",i=Math.max;t.exports=r},{}],13:[function(e,t,n){function r(e,t){var n=-1,r=e.length;for(t||(t=Array(r));++n<r;)t[n]=e[n];return t}t.exports=r},{}],14:[function(e,t,n){function r(e,t){for(var n=-1,r=e.length;++n<r&&t(e[n],n,e)!==!1;);return e}t.exports=r},{}],15:[function(e,t,n){function r(e,t){return null==t?e:o(t,i(t),e)}var o=e(17),i=e(53);t.exports=r},{17:17,53:53}],16:[function(e,t,n){function r(e,t,n,p,y,m,v){var b;if(n&&(b=y?n(e,p,y):n(e)),void 0!==b)return b;if(!d(e))return e;var w=f(e);if(w){if(b=u(e),!t)return o(e,b)}else{var x=D.call(e),j=x==g;if(x!=_&&x!=h&&(!j||y))return N[x]?c(e,x,t):y?e:{};if(b=l(j?{}:e),!t)return s(b,e)}m||(m=[]),v||(v=[]);for(var T=m.length;T--;)if(m[T]==e)return v[T];return m.push(e),v.push(b),(w?i:a)(e,function(o,i){b[i]=r(o,t,n,i,e,m,v)}),b}var o=e(13),i=e(14),s=e(15),a=e(21),u=e(33),c=e(34),l=e(35),f=e(46),d=e(49),h="[object Arguments]",p="[object Array]",y="[object Boolean]",m="[object Date]",v="[object Error]",g="[object Function]",b="[object Map]",w="[object Number]",_="[object Object]",x="[object RegExp]",j="[object Set]",T="[object String]",A="[object WeakMap]",S="[object ArrayBuffer]",k="[object Float32Array]",R="[object Float64Array]",O="[object Int8Array]",I="[object Int16Array]",P="[object Int32Array]",q="[object Uint8Array]",U="[object Uint8ClampedArray]",E="[object Uint16Array]",C="[object Uint32Array]",N={};N[h]=N[p]=N[S]=N[y]=N[m]=N[k]=N[R]=N[O]=N[I]=N[P]=N[w]=N[_]=N[x]=N[T]=N[q]=N[U]=N[E]=N[C]=!0,N[v]=N[g]=N[b]=N[j]=N[A]=!1;var L=Object.prototype,D=L.toString;t.exports=r},{13:13,14:14,15:15,21:21,33:33,34:34,35:35,46:46,49:49}],17:[function(e,t,n){function r(e,t,n){n||(n={});for(var r=-1,o=t.length;++r<o;){var i=t[r];n[i]=e[i]}return n}t.exports=r},{}],18:[function(e,t,n){var r=e(21),o=e(28),i=o(r);t.exports=i},{21:21,28:28}],19:[function(e,t,n){var r=e(29),o=r();t.exports=o},{29:29}],20:[function(e,t,n){function r(e,t){return o(e,t,i)}var o=e(19),i=e(54);t.exports=r},{19:19,54:54}],21:[function(e,t,n){function r(e,t){return o(e,t,i)}var o=e(19),i=e(53);t.exports=r},{19:19,53:53}],22:[function(e,t,n){function r(e,t,n,d,h){if(!u(e))return e;var p=a(t)&&(s(t)||l(t)),y=p?void 0:f(t);return o(y||t,function(o,s){if(y&&(s=o,o=t[s]),c(o))d||(d=[]),h||(h=[]),i(e,t,s,r,n,d,h);else{var a=e[s],u=n?n(a,o,s,e,t):void 0,l=void 0===u;l&&(u=o),void 0===u&&(!p||s in e)||!l&&(u===u?u===a:a!==a)||(e[s]=u)}}),e}var o=e(14),i=e(23),s=e(46),a=e(36),u=e(49),c=e(40),l=e(51),f=e(53);t.exports=r},{14:14,23:23,36:36,40:40,46:46,49:49,51:51,53:53}],23:[function(e,t,n){function r(e,t,n,r,f,d,h){for(var p=d.length,y=t[n];p--;)if(d[p]==y)return void(e[n]=h[p]);var m=e[n],v=f?f(m,y,n,e,t):void 0,g=void 0===v;g&&(v=y,a(y)&&(s(y)||c(y))?v=s(m)?m:a(m)?o(m):[]:u(y)||i(y)?v=i(m)?l(m):u(m)?m:{}:g=!1),d.push(y),h.push(v),g?e[n]=r(v,y,f,d,h):(v===v?v!==m:m===m)&&(e[n]=v)}var o=e(13),i=e(45),s=e(46),a=e(36),u=e(50),c=e(51),l=e(52);t.exports=r},{13:13,36:36,45:45,46:46,50:50,51:51,52:52}],24:[function(e,t,n){function r(e){return function(t){return null==t?void 0:t[e]}}t.exports=r},{}],25:[function(e,t,n){function r(e,t,n){if("function"!=typeof e)return o;if(void 0===t)return e;switch(n){case 1:return function(n){return e.call(t,n)};case 3:return function(n,r,o){return e.call(t,n,r,o)};case 4:return function(n,r,o,i){return e.call(t,n,r,o,i)};case 5:return function(n,r,o,i,s){return e.call(t,n,r,o,i,s)}}return function(){return e.apply(t,arguments)}}var o=e(56);t.exports=r},{56:56}],26:[function(e,t,n){(function(e){function n(e){var t=new r(e.byteLength),n=new o(t);return n.set(new o(e)),t}var r=e.ArrayBuffer,o=e.Uint8Array;t.exports=n}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],27:[function(e,t,n){function r(e){return s(function(t,n){var r=-1,s=null==t?0:n.length,a=s>2?n[s-2]:void 0,u=s>2?n[2]:void 0,c=s>1?n[s-1]:void 0;for("function"==typeof a?(a=o(a,c,5),s-=2):(a="function"==typeof c?c:void 0,s-=a?1:0),u&&i(n[0],n[1],u)&&(a=3>s?void 0:a,s=1);++r<s;){var l=n[r];l&&e(t,l,a)}return t})}var o=e(25),i=e(38),s=e(12);t.exports=r},{12:12,25:25,38:38}],28:[function(e,t,n){function r(e,t){return function(n,r){var a=n?o(n):0;if(!i(a))return e(n,r);for(var u=t?a:-1,c=s(n);(t?u--:++u<a)&&r(c[u],u,c)!==!1;);return n}}var o=e(31),i=e(39),s=e(42);t.exports=r},{31:31,39:39,42:42}],29:[function(e,t,n){function r(e){return function(t,n,r){for(var i=o(t),s=r(t),a=s.length,u=e?a:-1;e?u--:++u<a;){var c=s[u];if(n(i[c],c,i)===!1)break}return t}}var o=e(42);t.exports=r},{42:42}],30:[function(e,t,n){function r(e,t){return function(n,r,s){return"function"==typeof r&&void 0===s&&i(n)?e(n,r):t(n,o(r,s,3))}}var o=e(25),i=e(46);t.exports=r},{25:25,46:46}],31:[function(e,t,n){var r=e(24),o=r("length");t.exports=o},{24:24}],32:[function(e,t,n){function r(e,t){var n=null==e?void 0:e[t];return o(n)?n:void 0}var o=e(48);t.exports=r},{48:48}],33:[function(e,t,n){function r(e){var t=e.length,n=new e.constructor(t);return t&&"string"==typeof e[0]&&i.call(e,"index")&&(n.index=e.index,n.input=e.input),n}var o=Object.prototype,i=o.hasOwnProperty;t.exports=r},{}],34:[function(e,t,n){function r(e,t,n){var r=e.constructor;switch(t){case l:return o(e);case i:case s:return new r(+e);case f:case d:case h:case p:case y:case m:case v:case g:case b:var _=e.buffer;return new r(n?o(_):_,e.byteOffset,e.length);case a:case c:return new r(e);case u:var x=new r(e.source,w.exec(e));x.lastIndex=e.lastIndex}return x}var o=e(26),i="[object Boolean]",s="[object Date]",a="[object Number]",u="[object RegExp]",c="[object String]",l="[object ArrayBuffer]",f="[object Float32Array]",d="[object Float64Array]",h="[object Int8Array]",p="[object Int16Array]",y="[object Int32Array]",m="[object Uint8Array]",v="[object Uint8ClampedArray]",g="[object Uint16Array]",b="[object Uint32Array]",w=/\w*$/;t.exports=r},{26:26}],35:[function(e,t,n){function r(e){var t=e.constructor;return"function"==typeof t&&t instanceof t||(t=Object),new t}t.exports=r},{}],36:[function(e,t,n){function r(e){return null!=e&&i(o(e))}var o=e(31),i=e(39);t.exports=r},{31:31,39:39}],37:[function(e,t,n){function r(e,t){return e="number"==typeof e||o.test(e)?+e:-1,t=null==t?i:t,e>-1&&e%1==0&&t>e}var o=/^\d+$/,i=9007199254740991;t.exports=r},{}],38:[function(e,t,n){function r(e,t,n){if(!s(n))return!1;var r=typeof t;if("number"==r?o(n)&&i(t,n.length):"string"==r&&t in n){var a=n[t];return e===e?e===a:a!==a}return!1}var o=e(36),i=e(37),s=e(49);t.exports=r},{36:36,37:37,49:49}],39:[function(e,t,n){function r(e){return"number"==typeof e&&e>-1&&e%1==0&&o>=e}var o=9007199254740991;t.exports=r},{}],40:[function(e,t,n){function r(e){return!!e&&"object"==typeof e}t.exports=r},{}],41:[function(e,t,n){function r(e){for(var t=u(e),n=t.length,r=n&&e.length,c=!!r&&a(r)&&(i(e)||o(e)),f=-1,d=[];++f<n;){var h=t[f];(c&&s(h,r)||l.call(e,h))&&d.push(h)}return d}var o=e(45),i=e(46),s=e(37),a=e(39),u=e(54),c=Object.prototype,l=c.hasOwnProperty;t.exports=r},{37:37,39:39,45:45,46:46,54:54}],42:[function(e,t,n){function r(e){return o(e)?e:Object(e)}var o=e(49);t.exports=r},{49:49}],43:[function(e,t,n){function r(e,t,n,r){return t&&"boolean"!=typeof t&&s(e,t,n)?t=!1:"function"==typeof t&&(r=n,n=t,t=!1),"function"==typeof n?o(e,t,i(n,r,3)):o(e,t)}var o=e(16),i=e(25),s=e(38);t.exports=r},{16:16,25:25,38:38}],44:[function(e,t,n){function r(e,t,n){return"function"==typeof t?o(e,!0,i(t,n,3)):o(e,!0)}var o=e(16),i=e(25);t.exports=r},{16:16,25:25}],45:[function(e,t,n){function r(e){return i(e)&&o(e)&&a.call(e,"callee")&&!u.call(e,"callee")}var o=e(36),i=e(40),s=Object.prototype,a=s.hasOwnProperty,u=s.propertyIsEnumerable;t.exports=r},{36:36,40:40}],46:[function(e,t,n){var r=e(32),o=e(39),i=e(40),s="[object Array]",a=Object.prototype,u=a.toString,c=r(Array,"isArray"),l=c||function(e){return i(e)&&o(e.length)&&u.call(e)==s};t.exports=l},{32:32,39:39,40:40}],47:[function(e,t,n){function r(e){return o(e)&&a.call(e)==i}var o=e(49),i="[object Function]",s=Object.prototype,a=s.toString;t.exports=r},{49:49}],48:[function(e,t,n){function r(e){return null==e?!1:o(e)?l.test(u.call(e)):i(e)&&s.test(e)}var o=e(47),i=e(40),s=/^\[object .+?Constructor\]$/,a=Object.prototype,u=Function.prototype.toString,c=a.hasOwnProperty,l=RegExp("^"+u.call(c).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");t.exports=r},{40:40,47:47}],49:[function(e,t,n){function r(e){var t=typeof e;return!!e&&("object"==t||"function"==t)}t.exports=r},{}],50:[function(e,t,n){function r(e){var t;if(!s(e)||l.call(e)!=a||i(e)||!c.call(e,"constructor")&&(t=e.constructor,"function"==typeof t&&!(t instanceof t)))return!1;var n;return o(e,function(e,t){n=t}),void 0===n||c.call(e,n)}var o=e(20),i=e(45),s=e(40),a="[object Object]",u=Object.prototype,c=u.hasOwnProperty,l=u.toString;t.exports=r},{20:20,40:40,45:45}],51:[function(e,t,n){function r(e){return i(e)&&o(e.length)&&!!O[P.call(e)]}var o=e(39),i=e(40),s="[object Arguments]",a="[object Array]",u="[object Boolean]",c="[object Date]",l="[object Error]",f="[object Function]",d="[object Map]",h="[object Number]",p="[object Object]",y="[object RegExp]",m="[object Set]",v="[object String]",g="[object WeakMap]",b="[object ArrayBuffer]",w="[object Float32Array]",_="[object Float64Array]",x="[object Int8Array]",j="[object Int16Array]",T="[object Int32Array]",A="[object Uint8Array]",S="[object Uint8ClampedArray]",k="[object Uint16Array]",R="[object Uint32Array]",O={};O[w]=O[_]=O[x]=O[j]=O[T]=O[A]=O[S]=O[k]=O[R]=!0,O[s]=O[a]=O[b]=O[u]=O[c]=O[l]=O[f]=O[d]=O[h]=O[p]=O[y]=O[m]=O[v]=O[g]=!1;var I=Object.prototype,P=I.toString;t.exports=r},{39:39,40:40}],52:[function(e,t,n){function r(e){return o(e,i(e))}var o=e(17),i=e(54);t.exports=r},{17:17,54:54}],53:[function(e,t,n){var r=e(32),o=e(36),i=e(49),s=e(41),a=r(Object,"keys"),u=a?function(e){var t=null==e?void 0:e.constructor;return"function"==typeof t&&t.prototype===e||"function"!=typeof e&&o(e)?s(e):i(e)?a(e):[]}:s;t.exports=u},{32:32,36:36,41:41,49:49}],54:[function(e,t,n){function r(e){if(null==e)return[];u(e)||(e=Object(e));var t=e.length;t=t&&a(t)&&(i(e)||o(e))&&t||0;for(var n=e.constructor,r=-1,c="function"==typeof n&&n.prototype===e,f=Array(t),d=t>0;++r<t;)f[r]=r+"";for(var h in e)d&&s(h,t)||"constructor"==h&&(c||!l.call(e,h))||f.push(h);return f}var o=e(45),i=e(46),s=e(37),a=e(39),u=e(49),c=Object.prototype,l=c.hasOwnProperty;t.exports=r},{37:37,39:39,45:45,46:46,49:49}],55:[function(e,t,n){var r=e(22),o=e(27),i=o(r);t.exports=i},{22:22,27:27}],56:[function(e,t,n){function r(e){return e}t.exports=r},{}],57:[function(e,t,n){(function(n){"use strict";function r(t,n,r){var s=e(6)("algoliasearch"),a=e(43),u=e(46),c="Usage: algoliasearch(applicationID, apiKey, opts)";if(!t)throw new f.AlgoliaSearchError("Please provide an application ID. "+c);if(!n)throw new f.AlgoliaSearchError("Please provide an API key. "+c);this.applicationID=t,this.apiKey=n;var l=[this.applicationID+"-1.algolianet.com",this.applicationID+"-2.algolianet.com",this.applicationID+"-3.algolianet.com"];this.hosts={read:[],write:[]},this.hostIndex={read:0,write:0},r=r||{};var d=r.protocol||"https:",h=void 0===r.timeout?2e3:r.timeout;if(/:$/.test(d)||(d+=":"),"http:"!==r.protocol&&"https:"!==r.protocol)throw new f.AlgoliaSearchError("protocol must be `http:` or `https:` (was `"+r.protocol+"`)");r.hosts?u(r.hosts)?(this.hosts.read=a(r.hosts),this.hosts.write=a(r.hosts)):(this.hosts.read=a(r.hosts.read),
this.hosts.write=a(r.hosts.write)):(this.hosts.read=[this.applicationID+"-dsn.algolia.net"].concat(l),this.hosts.write=[this.applicationID+".algolia.net"].concat(l)),this.hosts.read=o(this.hosts.read,i(d)),this.hosts.write=o(this.hosts.write,i(d)),this.requestTimeout=h,this.extraHeaders=[],this.cache={},this._ua=r._ua,this._useCache=void 0===r._useCache?!0:r._useCache,this._setTimeout=r._setTimeout,s("init done, %j",this)}function o(e,t){for(var n=[],r=0;r<e.length;++r)n.push(t(e[r],r));return n}function i(e){return function(t){return e+"//"+t.toLowerCase()}}function s(){var e="Not implemented in this environment.\nIf you feel this is a mistake, write to support@algolia.com";throw new f.AlgoliaSearchError(e)}function a(e,t){var n=e.toLowerCase().replace(".","").replace("()","");return"algoliasearch: `"+e+"` was replaced by `"+t+"`. Please see https://github.com/algolia/algoliasearch-client-js/wiki/Deprecated#"+n}function u(e,t){t(e,0)}function c(e,t){function n(){return r||(console.log(t),r=!0),e.apply(this,arguments)}var r=!1;return n}function l(e){if(void 0===Array.prototype.toJSON)return JSON.stringify(e);var t=Array.prototype.toJSON;delete Array.prototype.toJSON;var n=JSON.stringify(e);return Array.prototype.toJSON=t,n}t.exports=r;var f=e(64);r.prototype={deleteIndex:function(e,t){return this._jsonRequest({method:"DELETE",url:"/1/indexes/"+encodeURIComponent(e),hostType:"write",callback:t})},moveIndex:function(e,t,n){var r={operation:"move",destination:t};return this._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(e)+"/operation",body:r,hostType:"write",callback:n})},copyIndex:function(e,t,n){var r={operation:"copy",destination:t};return this._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(e)+"/operation",body:r,hostType:"write",callback:n})},getLogs:function(e,t,n){return 0===arguments.length||"function"==typeof e?(n=e,e=0,t=10):(1===arguments.length||"function"==typeof t)&&(n=t,t=10),this._jsonRequest({method:"GET",url:"/1/logs?offset="+e+"&length="+t,hostType:"read",callback:n})},listIndexes:function(e,t){var n="";return void 0===e||"function"==typeof e?t=e:n="?page="+e,this._jsonRequest({method:"GET",url:"/1/indexes"+n,hostType:"read",callback:t})},initIndex:function(e){return new this.Index(this,e)},listUserKeys:function(e){return this._jsonRequest({method:"GET",url:"/1/keys",hostType:"read",callback:e})},getUserKeyACL:function(e,t){return this._jsonRequest({method:"GET",url:"/1/keys/"+e,hostType:"read",callback:t})},deleteUserKey:function(e,t){return this._jsonRequest({method:"DELETE",url:"/1/keys/"+e,hostType:"write",callback:t})},addUserKey:function(e,t,n){(1===arguments.length||"function"==typeof t)&&(n=t,t=null);var r={acl:e};return t&&(r.validity=t.validity,r.maxQueriesPerIPPerHour=t.maxQueriesPerIPPerHour,r.maxHitsPerQuery=t.maxHitsPerQuery,r.indexes=t.indexes,r.description=t.description,t.queryParameters&&(r.queryParameters=this._getSearchParams(t.queryParameters,"")),r.referers=t.referers),this._jsonRequest({method:"POST",url:"/1/keys",body:r,hostType:"write",callback:n})},addUserKeyWithValidity:c(function(e,t,n){return this.addUserKey(e,t,n)},a("client.addUserKeyWithValidity()","client.addUserKey()")),updateUserKey:function(e,t,n,r){(2===arguments.length||"function"==typeof n)&&(r=n,n=null);var o={acl:t};return n&&(o.validity=n.validity,o.maxQueriesPerIPPerHour=n.maxQueriesPerIPPerHour,o.maxHitsPerQuery=n.maxHitsPerQuery,o.indexes=n.indexes,o.description=n.description,n.queryParameters&&(o.queryParameters=this._getSearchParams(n.queryParameters,"")),o.referers=n.referers),this._jsonRequest({method:"PUT",url:"/1/keys/"+e,body:o,hostType:"write",callback:r})},setSecurityTags:function(e){if("[object Array]"===Object.prototype.toString.call(e)){for(var t=[],n=0;n<e.length;++n)if("[object Array]"===Object.prototype.toString.call(e[n])){for(var r=[],o=0;o<e[n].length;++o)r.push(e[n][o]);t.push("("+r.join(",")+")")}else t.push(e[n]);e=t.join(",")}this.securityTags=e},setUserToken:function(e){this.userToken=e},startQueriesBatch:c(function(){this._batch=[]},a("client.startQueriesBatch()","client.search()")),addQueryInBatch:c(function(e,t,n){this._batch.push({indexName:e,query:t,params:n})},a("client.addQueryInBatch()","client.search()")),clearCache:function(){this.cache={}},sendQueriesBatch:c(function(e){return this.search(this._batch,e)},a("client.sendQueriesBatch()","client.search()")),setRequestTimeout:function(e){e&&(this.requestTimeout=parseInt(e,10))},search:function(e,t){var n=this,r={requests:o(e,function(e){var t="";return void 0!==e.query&&(t+="query="+encodeURIComponent(e.query)),{indexName:e.indexName,params:n._getSearchParams(e.params,t)}})};return this._jsonRequest({cache:this.cache,method:"POST",url:"/1/indexes/*/queries",body:r,hostType:"read",callback:t})},batch:function(e,t){return this._jsonRequest({method:"POST",url:"/1/indexes/*/batch",body:{requests:e},hostType:"write",callback:t})},destroy:s,enableRateLimitForward:s,disableRateLimitForward:s,useSecuredAPIKey:s,disableSecuredAPIKey:s,generateSecuredApiKey:s,Index:function(e,t){this.indexName=t,this.as=e,this.typeAheadArgs=null,this.typeAheadValueOption=null,this.cache={}},setExtraHeader:function(e,t){this.extraHeaders.push({name:e.toLowerCase(),value:t})},addAlgoliaAgent:function(e){this._ua+=";"+e},_sendQueriesBatch:function(e,t){function n(){for(var t="",n=0;n<e.requests.length;++n){var r="/1/indexes/"+encodeURIComponent(e.requests[n].indexName)+"?"+e.requests[n].params;t+=n+"="+encodeURIComponent(r)+"&"}return t}return this._jsonRequest({cache:this.cache,method:"POST",url:"/1/indexes/*/queries",body:e,hostType:"read",fallback:{method:"GET",url:"/1/indexes/*",body:{params:n()}},callback:t})},_jsonRequest:function(t){function r(e,u){function h(e){var t=e&&e.body&&e.body.message&&e.body.status||e.statusCode||e&&e.body&&200;i("received response: statusCode: %s, computed statusCode: %d, headers: %j",e.statusCode,t,e.headers),n.env.DEBUG&&-1!==n.env.DEBUG.indexOf("debugBody")&&i("body: %j",e.body);var r=200===t||201===t,o=!r&&4!==Math.floor(t/100)&&1!==Math.floor(t/100);if(a._useCache&&r&&s&&(s[m]=e.responseText),r)return e.body;if(o)return c+=1,y();var u=new f.AlgoliaSearchError(e.body&&e.body.message);return a._promise.reject(u)}function p(n){return i("error: %s, stack: %s",n.message,n.stack),n instanceof f.AlgoliaSearchError||(n=new f.Unknown(n&&n.message,n)),c+=1,n instanceof f.Unknown||n instanceof f.UnparsableJSON||c>=a.hosts[t.hostType].length&&(d||!t.fallback||!a._request.fallback)?a._promise.reject(n):(a.hostIndex[t.hostType]=++a.hostIndex[t.hostType]%a.hosts[t.hostType].length,n instanceof f.RequestTimeout?y():(a._request.fallback&&!a.useFallback&&(a.useFallback=!0),r(e,u)))}function y(){return a.hostIndex[t.hostType]=++a.hostIndex[t.hostType]%a.hosts[t.hostType].length,u.timeout=a.requestTimeout*(c+1),r(e,u)}var m;if(a._useCache&&(m=t.url),a._useCache&&o&&(m+="_body_"+u.body),a._useCache&&s&&void 0!==s[m])return i("serving response from cache"),a._promise.resolve(JSON.parse(s[m]));if(c>=a.hosts[t.hostType].length||a.useFallback&&!d)return t.fallback&&a._request.fallback&&!d?(i("switching to fallback"),c=0,u.method=t.fallback.method,u.url=t.fallback.url,u.jsonBody=t.fallback.body,u.jsonBody&&(u.body=l(u.jsonBody)),u.timeout=a.requestTimeout*(c+1),a.hostIndex[t.hostType]=0,d=!0,r(a._request.fallback,u)):(i("could not get any response"),a._promise.reject(new f.AlgoliaSearchError("Cannot connect to the AlgoliaSearch API. Send an email to support@algolia.com to report and resolve the issue. Application id was: "+a.applicationID)));var v=a.hosts[t.hostType][a.hostIndex[t.hostType]]+u.url,g={body:o,jsonBody:t.body,method:u.method,headers:a._computeRequestHeaders(),timeout:u.timeout,debug:i};return i("method: %s, url: %s, headers: %j, timeout: %d",g.method,v,g.headers,g.timeout),e===a._request.fallback&&i("using fallback"),e.call(a,v,g).then(h,p)}var o,i=e(6)("algoliasearch:"+t.url),s=t.cache,a=this,c=0,d=!1;void 0!==t.body&&(o=l(t.body)),i("request start");var h=a.useFallback&&t.fallback,p=h?t.fallback:t,y=r(h?a._request.fallback:a._request,{url:p.url,method:p.method,body:o,jsonBody:t.body,timeout:a.requestTimeout*(c+1)});return t.callback?void y.then(function(e){u(function(){t.callback(null,e)},a._setTimeout||setTimeout)},function(e){u(function(){t.callback(e)},a._setTimeout||setTimeout)}):y},_getSearchParams:function(e,t){if(this._isUndefined(e)||null===e)return t;for(var n in e)null!==n&&void 0!==e[n]&&e.hasOwnProperty(n)&&(t+=""===t?"":"&",t+=n+"="+encodeURIComponent("[object Array]"===Object.prototype.toString.call(e[n])?l(e[n]):e[n]));return t},_isUndefined:function(e){return void 0===e},_computeRequestHeaders:function(){var t=e(11),n={"x-algolia-api-key":this.apiKey,"x-algolia-application-id":this.applicationID,"x-algolia-agent":this._ua};return this.userToken&&(n["x-algolia-usertoken"]=this.userToken),this.securityTags&&(n["x-algolia-tagfilters"]=this.securityTags),this.extraHeaders&&t(this.extraHeaders,function(e){n[e.name]=e.value}),n}},r.prototype.Index.prototype={clearCache:function(){this.cache={}},addObject:function(e,t,n){var r=this;return(1===arguments.length||"function"==typeof t)&&(n=t,t=void 0),this.as._jsonRequest({method:void 0!==t?"PUT":"POST",url:"/1/indexes/"+encodeURIComponent(r.indexName)+(void 0!==t?"/"+encodeURIComponent(t):""),body:e,hostType:"write",callback:n})},addObjects:function(e,t){for(var n=this,r={requests:[]},o=0;o<e.length;++o){var i={action:"addObject",body:e[o]};r.requests.push(i)}return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/batch",body:r,hostType:"write",callback:t})},getObject:function(e,t,n){var r=this;(1===arguments.length||"function"==typeof t)&&(n=t,t=void 0);var o="";if(void 0!==t){o="?attributes=";for(var i=0;i<t.length;++i)0!==i&&(o+=","),o+=t[i]}return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(r.indexName)+"/"+encodeURIComponent(e)+o,hostType:"read",callback:n})},getObjects:function(e,t,n){var r=this;(1===arguments.length||"function"==typeof t)&&(n=t,t=void 0);var i={requests:o(e,function(e){var n={indexName:r.indexName,objectID:e};return t&&(n.attributesToRetrieve=t.join(",")),n})};return this.as._jsonRequest({method:"POST",url:"/1/indexes/*/objects",hostType:"read",body:i,callback:n})},partialUpdateObject:function(e,t){var n=this;return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/"+encodeURIComponent(e.objectID)+"/partial",body:e,hostType:"write",callback:t})},partialUpdateObjects:function(e,t){for(var n=this,r={requests:[]},o=0;o<e.length;++o){var i={action:"partialUpdateObject",objectID:e[o].objectID,body:e[o]};r.requests.push(i)}return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/batch",body:r,hostType:"write",callback:t})},saveObject:function(e,t){var n=this;return this.as._jsonRequest({method:"PUT",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/"+encodeURIComponent(e.objectID),body:e,hostType:"write",callback:t})},saveObjects:function(e,t){for(var n=this,r={requests:[]},o=0;o<e.length;++o){var i={action:"updateObject",objectID:e[o].objectID,body:e[o]};r.requests.push(i)}return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/batch",body:r,hostType:"write",callback:t})},deleteObject:function(e,t){if("function"==typeof e||"string"!=typeof e&&"number"!=typeof e){var n=new f.AlgoliaSearchError("Cannot delete an object without an objectID");return t=e,"function"==typeof t?t(n):this.as._promise.reject(n)}var r=this;return this.as._jsonRequest({method:"DELETE",url:"/1/indexes/"+encodeURIComponent(r.indexName)+"/"+encodeURIComponent(e),hostType:"write",callback:t})},deleteObjects:function(e,t){var n=this,r={requests:o(e,function(e){return{action:"deleteObject",objectID:e,body:{objectID:e}}})};return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/batch",body:r,hostType:"write",callback:t})},deleteByQuery:function(t,n,r){function i(e){if(0===e.nbHits)return e;var t=o(e.hits,function(e){return e.objectID});return d.deleteObjects(t).then(s).then(a)}function s(e){return d.waitTask(e.taskID)}function a(){return d.deleteByQuery(t,n)}function c(){u(function(){r(null)},h._setTimeout||setTimeout)}function l(e){u(function(){r(e)},h._setTimeout||setTimeout)}var f=e(43),d=this,h=d.as;1===arguments.length||"function"==typeof n?(r=n,n={}):n=f(n),n.attributesToRetrieve="objectID",n.hitsPerPage=1e3,n.distinct=!1,this.clearCache();var p=this.search(t,n).then(i);return r?void p.then(c,l):p},search:function(e,t,n){if("function"==typeof e&&"object"==typeof t||"object"==typeof n)throw new f.AlgoliaSearchError("index.search usage is index.search(query, params, cb)");0===arguments.length||"function"==typeof e?(n=e,e=""):(1===arguments.length||"function"==typeof t)&&(n=t,t=void 0),"object"==typeof e&&null!==e?(t=e,e=void 0):(void 0===e||null===e)&&(e="");var r="";return void 0!==e&&(r+="query="+encodeURIComponent(e)),void 0!==t&&(r=this.as._getSearchParams(t,r)),this._search(r,n)},browse:function(t,n,r){var o,i,s=e(55),a=this;0===arguments.length||1===arguments.length&&"function"==typeof arguments[0]?(o=0,r=arguments[0],t=void 0):"number"==typeof arguments[0]?(o=arguments[0],"number"==typeof arguments[1]?i=arguments[1]:"function"==typeof arguments[1]&&(r=arguments[1],i=void 0),t=void 0,n=void 0):"object"==typeof arguments[0]?("function"==typeof arguments[1]&&(r=arguments[1]),n=arguments[0],t=void 0):"string"==typeof arguments[0]&&"function"==typeof arguments[1]&&(r=arguments[1],n=void 0),n=s({},n||{},{page:o,hitsPerPage:i,query:t});var u=this.as._getSearchParams(n,"");return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(a.indexName)+"/browse?"+u,hostType:"read",callback:r})},browseFrom:function(e,t){return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(this.indexName)+"/browse?cursor="+encodeURIComponent(e),hostType:"read",callback:t})},browseAll:function(t,n){function r(e){if(!a._stopped){var t;t=void 0!==e?"cursor="+encodeURIComponent(e):l,u._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(c.indexName)+"/browse?"+t,hostType:"read",callback:o})}}function o(e,t){return a._stopped?void 0:e?void a._error(e):(a._result(t),void 0===t.cursor?void a._end():void r(t.cursor))}"object"==typeof t&&(n=t,t=void 0);var i=e(55),s=e(58),a=new s,u=this.as,c=this,l=u._getSearchParams(i({},n||{},{query:t}),"");return r(),a},ttAdapter:function(e){var t=this;return function(n,r,o){var i;i="function"==typeof o?o:r,t.search(n,e,function(e,t){return e?void i(e):void i(t.hits)})}},waitTask:function(e,t){function n(){return l._jsonRequest({method:"GET",hostType:"read",url:"/1/indexes/"+encodeURIComponent(c.indexName)+"/task/"+e}).then(function(e){a++;var t=i*a*a;return t>s&&(t=s),"published"!==e.status?l._promise.delay(t).then(n):e})}function r(e){u(function(){t(null,e)},l._setTimeout||setTimeout)}function o(e){u(function(){t(e)},l._setTimeout||setTimeout)}var i=100,s=5e3,a=0,c=this,l=c.as,f=n();return t?void f.then(r,o):f},clearIndex:function(e){var t=this;return this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(t.indexName)+"/clear",hostType:"write",callback:e})},getSettings:function(e){var t=this;return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(t.indexName)+"/settings",hostType:"read",callback:e})},setSettings:function(e,t){var n=this;return this.as._jsonRequest({method:"PUT",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/settings",hostType:"write",body:e,callback:t})},listUserKeys:function(e){var t=this;return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(t.indexName)+"/keys",hostType:"read",callback:e})},getUserKeyACL:function(e,t){var n=this;return this.as._jsonRequest({method:"GET",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/keys/"+e,hostType:"read",callback:t})},deleteUserKey:function(e,t){var n=this;return this.as._jsonRequest({method:"DELETE",url:"/1/indexes/"+encodeURIComponent(n.indexName)+"/keys/"+e,hostType:"write",callback:t})},addUserKey:function(e,t,n){(1===arguments.length||"function"==typeof t)&&(n=t,t=null);var r={acl:e};return t&&(r.validity=t.validity,r.maxQueriesPerIPPerHour=t.maxQueriesPerIPPerHour,r.maxHitsPerQuery=t.maxHitsPerQuery,r.description=t.description,t.queryParameters&&(r.queryParameters=this.as._getSearchParams(t.queryParameters,"")),r.referers=t.referers),this.as._jsonRequest({method:"POST",url:"/1/indexes/"+encodeURIComponent(this.indexName)+"/keys",body:r,hostType:"write",callback:n})},addUserKeyWithValidity:c(function(e,t,n){return this.addUserKey(e,t,n)},a("index.addUserKeyWithValidity()","index.addUserKey()")),updateUserKey:function(e,t,n,r){(2===arguments.length||"function"==typeof n)&&(r=n,n=null);var o={acl:t};return n&&(o.validity=n.validity,o.maxQueriesPerIPPerHour=n.maxQueriesPerIPPerHour,o.maxHitsPerQuery=n.maxHitsPerQuery,o.description=n.description,n.queryParameters&&(o.queryParameters=this.as._getSearchParams(n.queryParameters,"")),o.referers=n.referers),this.as._jsonRequest({method:"PUT",url:"/1/indexes/"+encodeURIComponent(this.indexName)+"/keys/"+e,body:o,hostType:"write",callback:r})},_search:function(e,t){return this.as._jsonRequest({cache:this.cache,method:"POST",url:"/1/indexes/"+encodeURIComponent(this.indexName)+"/query",body:{params:e},hostType:"read",fallback:{method:"GET",url:"/1/indexes/"+encodeURIComponent(this.indexName),body:{params:e}},callback:t})},as:null,indexName:null,typeAheadArgs:null,typeAheadValueOption:null}}).call(this,e(2))},{11:11,2:2,43:43,46:46,55:55,58:58,6:6,64:64}],58:[function(e,t,n){"use strict";function r(){}t.exports=r;var o=e(10),i=e(1).EventEmitter;o(r,i),r.prototype.stop=function(){this._stopped=!0,this._clean()},r.prototype._end=function(){this.emit("end"),this._clean()},r.prototype._error=function(e){this.emit("error",e),this._clean()},r.prototype._result=function(e){this.emit("result",e)},r.prototype._clean=function(){this.removeAllListeners("stop"),this.removeAllListeners("end"),this.removeAllListeners("error"),this.removeAllListeners("result")}},{1:1,10:10}],59:[function(e,t,n){"use strict";var r=e(10),o=e(11),i=e(57),s=e(64),a=e(62),u=e(63);window.algoliasearch=e(60),window.angular.module("algoliasearch",[]).service("algolia",["$http","$q","$timeout",function(t,n,c){function l(t,n,r){var o=e(44),i=e(61);return r=o(r||{}),void 0===r.protocol&&(r.protocol=i()),r._ua=r._ua||l.ua,new f(t,n,r)}function f(){i.apply(this,arguments)}return l.version=e(65),l.ua="Algolia for AngularJS "+l.version,window.__algolia={debug:e(6),algoliasearch:l},r(f,i),f.prototype._request=function(e,r){function i(e){d({statusCode:e.status,headers:e.headers,body:e.data,responseText:e.responseText})}function u(e){return l?void 0:0===e.status?void h(new s.Network({more:e})):void d({body:e.data,statusCode:e.status})}var l,f=n.defer(),d=f.resolve,h=f.reject,p=r.body;e=a(e,r.headers);var y=n.defer(),m=y.promise;c(function(){l=!0,y.resolve("test"),h(new s.RequestTimeout)},r.timeout);var v={};return o(t.defaults.headers.common,function(e,t){v[t]=void 0}),v.accept="application/json",p&&("POST"===r.method?v["content-type"]="application/x-www-form-urlencoded":v["content-type"]="application/json"),t({url:e,method:r.method,data:p,cache:!1,timeout:m,headers:v,withCredentials:!1}).then(i,u),f.promise},f.prototype._request.fallback=function(e,t){e=a(e,t.headers);var r=n.defer(),o=r.resolve,i=r.reject;return u(e,t,function(e,t){return e?void i(e):void o(t)}),r.promise},f.prototype._promise={reject:function(e){return n.reject(e)},resolve:function(e){return n.when(e)},delay:function(e){var t=n.defer(),r=t.resolve;return c(r,e),t.promise}},{Client:function(e,t,n){return l(e,t,n)},ua:l.ua,version:l.version}}])},{10:10,11:11,44:44,57:57,6:6,60:60,61:61,62:62,63:63,64:64,65:65}],60:[function(e,t,n){"use strict";function r(t,n,i){var s=e(44),a=e(61);return i=s(i||{}),void 0===i.protocol&&(i.protocol=a()),i._ua=i._ua||r.ua,new o(t,n,i)}function o(){a.apply(this,arguments)}t.exports=r;var i=e(10),s=window.Promise||e(9).Promise,a=e(57),u=e(64),c=e(62),l=e(63);r.version=e(65),r.ua="Algolia for vanilla JavaScript "+r.version,window.__algolia={debug:e(6),algoliasearch:r};var f={hasXMLHttpRequest:"XMLHttpRequest"in window,hasXDomainRequest:"XDomainRequest"in window,cors:"withCredentials"in new XMLHttpRequest,timeout:"timeout"in new XMLHttpRequest};i(o,a),o.prototype._request=function(e,t){return new s(function(n,r){function o(){if(!l){f.timeout||clearTimeout(a);var e;try{e={body:JSON.parse(h.responseText),responseText:h.responseText,statusCode:h.status,headers:h.getAllResponseHeaders&&h.getAllResponseHeaders()||{}}}catch(t){e=new u.UnparsableJSON({more:h.responseText})}e instanceof u.UnparsableJSON?r(e):n(e)}}function i(e){l||(f.timeout||clearTimeout(a),r(new u.Network({more:e})))}function s(){f.timeout||(l=!0,h.abort()),r(new u.RequestTimeout)}if(!f.cors&&!f.hasXDomainRequest)return void r(new u.Network("CORS not supported"));e=c(e,t.headers);var a,l,d=t.body,h=f.cors?new XMLHttpRequest:new XDomainRequest;h instanceof XMLHttpRequest?h.open(t.method,e,!0):h.open(t.method,e),f.cors&&(d&&("POST"===t.method?h.setRequestHeader("content-type","application/x-www-form-urlencoded"):h.setRequestHeader("content-type","application/json")),h.setRequestHeader("accept","application/json")),h.onprogress=function(){},h.onload=o,h.onerror=i,f.timeout?(h.timeout=t.timeout,h.ontimeout=s):a=setTimeout(s,t.timeout),h.send(d)})},o.prototype._request.fallback=function(e,t){return e=c(e,t.headers),new s(function(n,r){l(e,t,function(e,t){return e?void r(e):void n(t)})})},o.prototype._promise={reject:function(e){return s.reject(e)},resolve:function(e){return s.resolve(e)},delay:function(e){return new s(function(t){setTimeout(t,e)})}}},{10:10,44:44,57:57,6:6,61:61,62:62,63:63,64:64,65:65,9:9}],61:[function(e,t,n){"use strict";function r(){var e=window.document.location.protocol;return"http:"!==e&&"https:"!==e&&(e="http:"),e}t.exports=r},{}],62:[function(e,t,n){"use strict";function r(e,t){return e+=/\?/.test(e)?"&":"?",e+o.encode(t)}t.exports=r;var o=e(5)},{5:5}],63:[function(e,t,n){"use strict";function r(e,t,n){function r(){t.debug("JSONP: success"),y||f||(y=!0,l||(t.debug("JSONP: Fail. Script loaded but did not call the callback"),a(),n(new o.JSONPScriptFail)))}function s(){("loaded"===this.readyState||"complete"===this.readyState)&&r()}function a(){clearTimeout(m),h.onload=null,h.onreadystatechange=null,h.onerror=null,d.removeChild(h);try{delete window[p],delete window[p+"_loaded"]}catch(e){window[p]=null,window[p+"_loaded"]=null}}function u(){t.debug("JSONP: Script timeout"),f=!0,a(),n(new o.RequestTimeout)}function c(){t.debug("JSONP: Script error"),y||f||(a(),n(new o.JSONPScriptError))}if("GET"!==t.method)return void n(new Error("Method "+t.method+" "+e+" is not supported by JSONP."));t.debug("JSONP: start");var l=!1,f=!1;i+=1;var d=document.getElementsByTagName("head")[0],h=document.createElement("script"),p="algoliaJSONP_"+i,y=!1;window[p]=function(e){try{delete window[p]}catch(t){window[p]=void 0}f||(l=!0,a(),n(null,{body:e}))},e+="&callback="+p,t.jsonBody&&t.jsonBody.params&&(e+="&"+t.jsonBody.params);var m=setTimeout(u,t.timeout);h.onreadystatechange=s,h.onload=r,h.onerror=c,h.async=!0,h.defer=!0,h.src=e,d.appendChild(h)}t.exports=r;var o=e(64),i=0},{64:64}],64:[function(e,t,n){"use strict";function r(t,n){var r=e(11),o=this;"function"==typeof Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):o.stack=(new Error).stack||"Cannot get a stacktrace, browser is too old",this.name=this.constructor.name,this.message=t||"Unknown error",n&&r(n,function(e,t){o[t]=e})}function o(e,t){function n(){var n=Array.prototype.slice.call(arguments,0);"string"!=typeof n[0]&&n.unshift(t),r.apply(this,n),this.name="AlgoliaSearch"+e+"Error"}return i(n,r),n}var i=e(10);i(r,Error),t.exports={AlgoliaSearchError:r,UnparsableJSON:o("UnparsableJSON","Could not parse the incoming response as JSON, see err.more for details"),RequestTimeout:o("RequestTimeout","Request timedout before getting a response"),Network:o("Network","Network issue, see err.more for details"),JSONPScriptFail:o("JSONPScriptFail","<script> was loaded but did not call our provided callback"),JSONPScriptError:o("JSONPScriptError","<script> unable to load due to an `error` event on it"),Unknown:o("Unknown","Unknown error occured")}},{10:10,11:11}],65:[function(e,t,n){"use strict";t.exports="3.8.1"},{}]},{},[59]);

angular.module('stripe', []).directive('stripeForm', ['$window',
function($window) {

  var directive = { restrict: 'A' };
  directive.link = function(scope, element, attributes) {
    var form = angular.element(element);
    form.bind('submit', function() {
      var button = form.find('button');
      button.prop('disabled', true);
      $window.Stripe.createToken(form[0], function() {
        button.prop('disabled', false);
        var args = arguments;
        scope.$apply(function() {
          scope.$eval(attributes.stripeForm).apply(scope, args);
        });
      });
    });
  };
  return directive;

}]);

'use strict';
var Config = {};
Config.Emoji = {
  "00a9": ["\u00A9", ["copyright"]],
  "00ae": ["\u00AE", ["registered"]],
  "203c": ["\u203C", ["bangbang"]],
  "2049": ["\u2049", ["interrobang"]],
  "2122": ["\u2122", ["tm"]],
  "2139": ["\u2139", ["information_source"]],
  "2194": ["\u2194", ["left_right_arrow"]],
  "2195": ["\u2195", ["arrow_up_down"]],
  "2196": ["\u2196", ["arrow_upper_left"]],
  "2197": ["\u2197", ["arrow_upper_right"]],
  "2198": ["\u2198", ["arrow_lower_right"]],
  "2199": ["\u2199", ["arrow_lower_left"]],
  "21a9": ["\u21A9", ["leftwards_arrow_with_hook"]],
  "21aa": ["\u21AA", ["arrow_right_hook"]],
  "231a": ["\u231A", ["watch"]],
  "231b": ["\u231B", ["hourglass"]],
  "23e9": ["\u23E9", ["fast_forward"]],
  "23ea": ["\u23EA", ["rewind"]],
  "23eb": ["\u23EB", ["arrow_double_up"]],
  "23ec": ["\u23EC", ["arrow_double_down"]],
  "23f0": ["\u23F0", ["alarm_clock"]],
  "23f3": ["\u23F3", ["hourglass_flowing_sand"]],
  "24c2": ["\u24C2", ["m"]],
  "25aa": ["\u25AA", ["black_small_square"]],
  "25ab": ["\u25AB", ["white_small_square"]],
  "25b6": ["\u25B6", ["arrow_forward"]],
  "25c0": ["\u25C0", ["arrow_backward"]],
  "25fb": ["\u25FB", ["white_medium_square"]],
  "25fc": ["\u25FC", ["black_medium_square"]],
  "25fd": ["\u25FD", ["white_medium_small_square"]],
  "25fe": ["\u25FE", ["black_medium_small_square"]],
  "2600": ["\u2600", ["sunny"]],
  "2601": ["\u2601", ["cloud"]],
  "260e": ["\u260E", ["phone", "telephone"]],
  "2611": ["\u2611", ["ballot_box_with_check"]],
  "2614": ["\u2614", ["umbrella"]],
  "2615": ["\u2615", ["coffee"]],
  "261d": ["\u261D", ["point_up"]],
  "263a": ["\u263A", ["relaxed"]],
  "2648": ["\u2648", ["aries"]],
  "2649": ["\u2649", ["taurus"]],
  "264a": ["\u264A", ["gemini"]],
  "264b": ["\u264B", ["cancer"]],
  "264c": ["\u264C", ["leo"]],
  "264d": ["\u264D", ["virgo"]],
  "264e": ["\u264E", ["libra"]],
  "264f": ["\u264F", ["scorpius"]],
  "2650": ["\u2650", ["sagittarius"]],
  "2651": ["\u2651", ["capricorn"]],
  "2652": ["\u2652", ["aquarius"]],
  "2653": ["\u2653", ["pisces"]],
  "2660": ["\u2660", ["spades"]],
  "2663": ["\u2663", ["clubs"]],
  "2665": ["\u2665", ["hearts"]],
  "2666": ["\u2666", ["diamonds"]],
  "2668": ["\u2668", ["hotsprings"]],
  "267b": ["\u267B", ["recycle"]],
  "267f": ["\u267F", ["wheelchair"]],
  "2693": ["\u2693", ["anchor"]],
  "26a0": ["\u26A0", ["warning"]],
  "26a1": ["\u26A1", ["zap"]],
  "26aa": ["\u26AA", ["white_circle"]],
  "26ab": ["\u26AB", ["black_circle"]],
  "26bd": ["\u26BD", ["soccer"]],
  "26be": ["\u26BE", ["baseball"]],
  "26c4": ["\u26C4", ["snowman"]],
  "26c5": ["\u26C5", ["partly_sunny"]],
  "26ce": ["\u26CE", ["ophiuchus"]],
  "26d4": ["\u26D4", ["no_entry"]],
  "26ea": ["\u26EA", ["church"]],
  "26f2": ["\u26F2", ["fountain"]],
  "26f3": ["\u26F3", ["golf"]],
  "26f5": ["\u26F5", ["boat", "sailboat"]],
  "26fa": ["\u26FA", ["tent"]],
  "26fd": ["\u26FD", ["fuelpump"]],
  "2702": ["\u2702", ["scissors"]],
  "2705": ["\u2705", ["white_check_mark"]],
  "2708": ["\u2708", ["airplane"]],
  "2709": ["\u2709", ["email", "envelope"]],
  "270a": ["\u270A", ["fist"]],
  "270b": ["\u270B", ["hand", "raised_hand"]],
  "270c": ["\u270C", ["v"]],
  "270f": ["\u270F", ["pencil2"]],
  "2712": ["\u2712", ["black_nib"]],
  "2714": ["\u2714", ["heavy_check_mark"]],
  "2716": ["\u2716", ["heavy_multiplication_x"]],
  "2728": ["\u2728", ["sparkles"]],
  "2733": ["\u2733", ["eight_spoked_asterisk"]],
  "2734": ["\u2734", ["eight_pointed_black_star"]],
  "2744": ["\u2744", ["snowflake"]],
  "2747": ["\u2747", ["sparkle"]],
  "274c": ["\u274C", ["x"]],
  "274e": ["\u274E", ["negative_squared_cross_mark"]],
  "2753": ["\u2753", ["question"]],
  "2754": ["\u2754", ["grey_question"]],
  "2755": ["\u2755", ["grey_exclamation"]],
  "2757": ["\u2757", ["exclamation", "heavy_exclamation_mark"]],
  "2764": ["\u2764", ["heart"], "<3"],
  "2795": ["\u2795", ["heavy_plus_sign"]],
  "2796": ["\u2796", ["heavy_minus_sign"]],
  "2797": ["\u2797", ["heavy_division_sign"]],
  "27a1": ["\u27A1", ["arrow_right"]],
  "27b0": ["\u27B0", ["curly_loop"]],
  "27bf": ["\u27BF", ["loop"]],
  "2934": ["\u2934", ["arrow_heading_up"]],
  "2935": ["\u2935", ["arrow_heading_down"]],
  "2b05": ["\u2B05", ["arrow_left"]],
  "2b06": ["\u2B06", ["arrow_up"]],
  "2b07": ["\u2B07", ["arrow_down"]],
  "2b1b": ["\u2B1B", ["black_large_square"]],
  "2b1c": ["\u2B1C", ["white_large_square"]],
  "2b50": ["\u2B50", ["star"]],
  "2b55": ["\u2B55", ["o"]],
  "3030": ["\u3030", ["wavy_dash"]],
  "303d": ["\u303D", ["part_alternation_mark"]],
  "3297": ["\u3297", ["congratulations"]],
  "3299": ["\u3299", ["secret"]],
  "1f004": ["\uD83C\uDC04", ["mahjong"]],
  "1f0cf": ["\uD83C\uDCCF", ["black_joker"]],
  "1f170": ["\uD83C\uDD70", ["a"]],
  "1f171": ["\uD83C\uDD71", ["b"]],
  "1f17e": ["\uD83C\uDD7E", ["o2"]],
  "1f17f": ["\uD83C\uDD7F", ["parking"]],
  "1f18e": ["\uD83C\uDD8E", ["ab"]],
  "1f191": ["\uD83C\uDD91", ["cl"]],
  "1f192": ["\uD83C\uDD92", ["cool"]],
  "1f193": ["\uD83C\uDD93", ["free"]],
  "1f194": ["\uD83C\uDD94", ["id"]],
  "1f195": ["\uD83C\uDD95", ["new"]],
  "1f196": ["\uD83C\uDD96", ["ng"]],
  "1f197": ["\uD83C\uDD97", ["ok"]],
  "1f198": ["\uD83C\uDD98", ["sos"]],
  "1f199": ["\uD83C\uDD99", ["up"]],
  "1f19a": ["\uD83C\uDD9A", ["vs"]],
  "1f201": ["\uD83C\uDE01", ["koko"]],
  "1f202": ["\uD83C\uDE02", ["sa"]],
  "1f21a": ["\uD83C\uDE1A", ["u7121"]],
  "1f22f": ["\uD83C\uDE2F", ["u6307"]],
  "1f232": ["\uD83C\uDE32", ["u7981"]],
  "1f233": ["\uD83C\uDE33", ["u7a7a"]],
  "1f234": ["\uD83C\uDE34", ["u5408"]],
  "1f235": ["\uD83C\uDE35", ["u6e80"]],
  "1f236": ["\uD83C\uDE36", ["u6709"]],
  "1f237": ["\uD83C\uDE37", ["u6708"]],
  "1f238": ["\uD83C\uDE38", ["u7533"]],
  "1f239": ["\uD83C\uDE39", ["u5272"]],
  "1f23a": ["\uD83C\uDE3A", ["u55b6"]],
  "1f250": ["\uD83C\uDE50", ["ideograph_advantage"]],
  "1f251": ["\uD83C\uDE51", ["accept"]],
  "1f300": ["\uD83C\uDF00", ["cyclone"]],
  "1f301": ["\uD83C\uDF01", ["foggy"]],
  "1f302": ["\uD83C\uDF02", ["closed_umbrella"]],
  "1f303": ["\uD83C\uDF03", ["night_with_stars"]],
  "1f304": ["\uD83C\uDF04", ["sunrise_over_mountains"]],
  "1f305": ["\uD83C\uDF05", ["sunrise"]],
  "1f306": ["\uD83C\uDF06", ["city_sunset"]],
  "1f307": ["\uD83C\uDF07", ["city_sunrise"]],
  "1f308": ["\uD83C\uDF08", ["rainbow"]],
  "1f309": ["\uD83C\uDF09", ["bridge_at_night"]],
  "1f30a": ["\uD83C\uDF0A", ["ocean"]],
  "1f30b": ["\uD83C\uDF0B", ["volcano"]],
  "1f30c": ["\uD83C\uDF0C", ["milky_way"]],
  "1f30d": ["\uD83C\uDF0D", ["earth_africa"]],
  "1f30e": ["\uD83C\uDF0E", ["earth_americas"]],
  "1f30f": ["\uD83C\uDF0F", ["earth_asia"]],
  "1f310": ["\uD83C\uDF10", ["globe_with_meridians"]],
  "1f311": ["\uD83C\uDF11", ["new_moon"]],
  "1f312": ["\uD83C\uDF12", ["waxing_crescent_moon"]],
  "1f313": ["\uD83C\uDF13", ["first_quarter_moon"]],
  "1f314": ["\uD83C\uDF14", ["moon", "waxing_gibbous_moon"]],
  "1f315": ["\uD83C\uDF15", ["full_moon"]],
  "1f316": ["\uD83C\uDF16", ["waning_gibbous_moon"]],
  "1f317": ["\uD83C\uDF17", ["last_quarter_moon"]],
  "1f318": ["\uD83C\uDF18", ["waning_crescent_moon"]],
  "1f319": ["\uD83C\uDF19", ["crescent_moon"]],
  "1f320": ["\uD83C\uDF20", ["stars"]],
  "1f31a": ["\uD83C\uDF1A", ["new_moon_with_face"]],
  "1f31b": ["\uD83C\uDF1B", ["first_quarter_moon_with_face"]],
  "1f31c": ["\uD83C\uDF1C", ["last_quarter_moon_with_face"]],
  "1f31d": ["\uD83C\uDF1D", ["full_moon_with_face"]],
  "1f31e": ["\uD83C\uDF1E", ["sun_with_face"]],
  "1f31f": ["\uD83C\uDF1F", ["star2"]],
  "1f330": ["\uD83C\uDF30", ["chestnut"]],
  "1f331": ["\uD83C\uDF31", ["seedling"]],
  "1f332": ["\uD83C\uDF32", ["evergreen_tree"]],
  "1f333": ["\uD83C\uDF33", ["deciduous_tree"]],
  "1f334": ["\uD83C\uDF34", ["palm_tree"]],
  "1f335": ["\uD83C\uDF35", ["cactus"]],
  "1f337": ["\uD83C\uDF37", ["tulip"]],
  "1f338": ["\uD83C\uDF38", ["cherry_blossom"]],
  "1f339": ["\uD83C\uDF39", ["rose"]],
  "1f33a": ["\uD83C\uDF3A", ["hibiscus"]],
  "1f33b": ["\uD83C\uDF3B", ["sunflower"]],
  "1f33c": ["\uD83C\uDF3C", ["blossom"]],
  "1f33d": ["\uD83C\uDF3D", ["corn"]],
  "1f33e": ["\uD83C\uDF3E", ["ear_of_rice"]],
  "1f33f": ["\uD83C\uDF3F", ["herb"]],
  "1f340": ["\uD83C\uDF40", ["four_leaf_clover"]],
  "1f341": ["\uD83C\uDF41", ["maple_leaf"]],
  "1f342": ["\uD83C\uDF42", ["fallen_leaf"]],
  "1f343": ["\uD83C\uDF43", ["leaves"]],
  "1f344": ["\uD83C\uDF44", ["mushroom"]],
  "1f345": ["\uD83C\uDF45", ["tomato"]],
  "1f346": ["\uD83C\uDF46", ["eggplant"]],
  "1f347": ["\uD83C\uDF47", ["grapes"]],
  "1f348": ["\uD83C\uDF48", ["melon"]],
  "1f349": ["\uD83C\uDF49", ["watermelon"]],
  "1f34a": ["\uD83C\uDF4A", ["tangerine"]],
  "1f34b": ["\uD83C\uDF4B", ["lemon"]],
  "1f34c": ["\uD83C\uDF4C", ["banana"]],
  "1f34d": ["\uD83C\uDF4D", ["pineapple"]],
  "1f34e": ["\uD83C\uDF4E", ["apple"]],
  "1f34f": ["\uD83C\uDF4F", ["green_apple"]],
  "1f350": ["\uD83C\uDF50", ["pear"]],
  "1f351": ["\uD83C\uDF51", ["peach"]],
  "1f352": ["\uD83C\uDF52", ["cherries"]],
  "1f353": ["\uD83C\uDF53", ["strawberry"]],
  "1f354": ["\uD83C\uDF54", ["hamburger"]],
  "1f355": ["\uD83C\uDF55", ["pizza"]],
  "1f356": ["\uD83C\uDF56", ["meat_on_bone"]],
  "1f357": ["\uD83C\uDF57", ["poultry_leg"]],
  "1f358": ["\uD83C\uDF58", ["rice_cracker"]],
  "1f359": ["\uD83C\uDF59", ["rice_ball"]],
  "1f35a": ["\uD83C\uDF5A", ["rice"]],
  "1f35b": ["\uD83C\uDF5B", ["curry"]],
  "1f35c": ["\uD83C\uDF5C", ["ramen"]],
  "1f35d": ["\uD83C\uDF5D", ["spaghetti"]],
  "1f35e": ["\uD83C\uDF5E", ["bread"]],
  "1f35f": ["\uD83C\uDF5F", ["fries"]],
  "1f360": ["\uD83C\uDF60", ["sweet_potato"]],
  "1f361": ["\uD83C\uDF61", ["dango"]],
  "1f362": ["\uD83C\uDF62", ["oden"]],
  "1f363": ["\uD83C\uDF63", ["sushi"]],
  "1f364": ["\uD83C\uDF64", ["fried_shrimp"]],
  "1f365": ["\uD83C\uDF65", ["fish_cake"]],
  "1f366": ["\uD83C\uDF66", ["icecream"]],
  "1f367": ["\uD83C\uDF67", ["shaved_ice"]],
  "1f368": ["\uD83C\uDF68", ["ice_cream"]],
  "1f369": ["\uD83C\uDF69", ["doughnut"]],
  "1f36a": ["\uD83C\uDF6A", ["cookie"]],
  "1f36b": ["\uD83C\uDF6B", ["chocolate_bar"]],
  "1f36c": ["\uD83C\uDF6C", ["candy"]],
  "1f36d": ["\uD83C\uDF6D", ["lollipop"]],
  "1f36e": ["\uD83C\uDF6E", ["custard"]],
  "1f36f": ["\uD83C\uDF6F", ["honey_pot"]],
  "1f370": ["\uD83C\uDF70", ["cake"]],
  "1f371": ["\uD83C\uDF71", ["bento"]],
  "1f372": ["\uD83C\uDF72", ["stew"]],
  "1f373": ["\uD83C\uDF73", ["egg"]],
  "1f374": ["\uD83C\uDF74", ["fork_and_knife"]],
  "1f375": ["\uD83C\uDF75", ["tea"]],
  "1f376": ["\uD83C\uDF76", ["sake"]],
  "1f377": ["\uD83C\uDF77", ["wine_glass"]],
  "1f378": ["\uD83C\uDF78", ["cocktail"]],
  "1f379": ["\uD83C\uDF79", ["tropical_drink"]],
  "1f37a": ["\uD83C\uDF7A", ["beer"]],
  "1f37b": ["\uD83C\uDF7B", ["beers"]],
  "1f37c": ["\uD83C\uDF7C", ["baby_bottle"]],
  "1f380": ["\uD83C\uDF80", ["ribbon"]],
  "1f381": ["\uD83C\uDF81", ["gift"]],
  "1f382": ["\uD83C\uDF82", ["birthday"]],
  "1f383": ["\uD83C\uDF83", ["jack_o_lantern"]],
  "1f384": ["\uD83C\uDF84", ["christmas_tree"]],
  "1f385": ["\uD83C\uDF85", ["santa"]],
  "1f386": ["\uD83C\uDF86", ["fireworks"]],
  "1f387": ["\uD83C\uDF87", ["sparkler"]],
  "1f388": ["\uD83C\uDF88", ["balloon"]],
  "1f389": ["\uD83C\uDF89", ["tada"]],
  "1f38a": ["\uD83C\uDF8A", ["confetti_ball"]],
  "1f38b": ["\uD83C\uDF8B", ["tanabata_tree"]],
  "1f38c": ["\uD83C\uDF8C", ["crossed_flags"]],
  "1f38d": ["\uD83C\uDF8D", ["bamboo"]],
  "1f38e": ["\uD83C\uDF8E", ["dolls"]],
  "1f38f": ["\uD83C\uDF8F", ["flags"]],
  "1f390": ["\uD83C\uDF90", ["wind_chime"]],
  "1f391": ["\uD83C\uDF91", ["rice_scene"]],
  "1f392": ["\uD83C\uDF92", ["school_satchel"]],
  "1f393": ["\uD83C\uDF93", ["mortar_board"]],
  "1f3a0": ["\uD83C\uDFA0", ["carousel_horse"]],
  "1f3a1": ["\uD83C\uDFA1", ["ferris_wheel"]],
  "1f3a2": ["\uD83C\uDFA2", ["roller_coaster"]],
  "1f3a3": ["\uD83C\uDFA3", ["fishing_pole_and_fish"]],
  "1f3a4": ["\uD83C\uDFA4", ["microphone"]],
  "1f3a5": ["\uD83C\uDFA5", ["movie_camera"]],
  "1f3a6": ["\uD83C\uDFA6", ["cinema"]],
  "1f3a7": ["\uD83C\uDFA7", ["headphones"]],
  "1f3a8": ["\uD83C\uDFA8", ["art"]],
  "1f3a9": ["\uD83C\uDFA9", ["tophat"]],
  "1f3aa": ["\uD83C\uDFAA", ["circus_tent"]],
  "1f3ab": ["\uD83C\uDFAB", ["ticket"]],
  "1f3ac": ["\uD83C\uDFAC", ["clapper"]],
  "1f3ad": ["\uD83C\uDFAD", ["performing_arts"]],
  "1f3ae": ["\uD83C\uDFAE", ["video_game"]],
  "1f3af": ["\uD83C\uDFAF", ["dart"]],
  "1f3b0": ["\uD83C\uDFB0", ["slot_machine"]],
  "1f3b1": ["\uD83C\uDFB1", ["8ball"]],
  "1f3b2": ["\uD83C\uDFB2", ["game_die"]],
  "1f3b3": ["\uD83C\uDFB3", ["bowling"]],
  "1f3b4": ["\uD83C\uDFB4", ["flower_playing_cards"]],
  "1f3b5": ["\uD83C\uDFB5", ["musical_note"]],
  "1f3b6": ["\uD83C\uDFB6", ["notes"]],
  "1f3b7": ["\uD83C\uDFB7", ["saxophone"]],
  "1f3b8": ["\uD83C\uDFB8", ["guitar"]],
  "1f3b9": ["\uD83C\uDFB9", ["musical_keyboard"]],
  "1f3ba": ["\uD83C\uDFBA", ["trumpet"]],
  "1f3bb": ["\uD83C\uDFBB", ["violin"]],
  "1f3bc": ["\uD83C\uDFBC", ["musical_score"]],
  "1f3bd": ["\uD83C\uDFBD", ["running_shirt_with_sash"]],
  "1f3be": ["\uD83C\uDFBE", ["tennis"]],
  "1f3bf": ["\uD83C\uDFBF", ["ski"]],
  "1f3c0": ["\uD83C\uDFC0", ["basketball"]],
  "1f3c1": ["\uD83C\uDFC1", ["checkered_flag"]],
  "1f3c2": ["\uD83C\uDFC2", ["snowboarder"]],
  "1f3c3": ["\uD83C\uDFC3", ["runner", "running"]],
  "1f3c4": ["\uD83C\uDFC4", ["surfer"]],
  "1f3c6": ["\uD83C\uDFC6", ["trophy"]],
  "1f3c7": ["\uD83C\uDFC7", ["horse_racing"]],
  "1f3c8": ["\uD83C\uDFC8", ["football"]],
  "1f3c9": ["\uD83C\uDFC9", ["rugby_football"]],
  "1f3ca": ["\uD83C\uDFCA", ["swimmer"]],
  "1f3e0": ["\uD83C\uDFE0", ["house"]],
  "1f3e1": ["\uD83C\uDFE1", ["house_with_garden"]],
  "1f3e2": ["\uD83C\uDFE2", ["office"]],
  "1f3e3": ["\uD83C\uDFE3", ["post_office"]],
  "1f3e4": ["\uD83C\uDFE4", ["european_post_office"]],
  "1f3e5": ["\uD83C\uDFE5", ["hospital"]],
  "1f3e6": ["\uD83C\uDFE6", ["bank"]],
  "1f3e7": ["\uD83C\uDFE7", ["atm"]],
  "1f3e8": ["\uD83C\uDFE8", ["hotel"]],
  "1f3e9": ["\uD83C\uDFE9", ["love_hotel"]],
  "1f3ea": ["\uD83C\uDFEA", ["convenience_store"]],
  "1f3eb": ["\uD83C\uDFEB", ["school"]],
  "1f3ec": ["\uD83C\uDFEC", ["department_store"]],
  "1f3ed": ["\uD83C\uDFED", ["factory"]],
  "1f3ee": ["\uD83C\uDFEE", ["izakaya_lantern", "lantern"]],
  "1f3ef": ["\uD83C\uDFEF", ["japanese_castle"]],
  "1f3f0": ["\uD83C\uDFF0", ["european_castle"]],
  "1f400": ["\uD83D\uDC00", ["rat"]],
  "1f401": ["\uD83D\uDC01", ["mouse2"]],
  "1f402": ["\uD83D\uDC02", ["ox"]],
  "1f403": ["\uD83D\uDC03", ["water_buffalo"]],
  "1f404": ["\uD83D\uDC04", ["cow2"]],
  "1f405": ["\uD83D\uDC05", ["tiger2"]],
  "1f406": ["\uD83D\uDC06", ["leopard"]],
  "1f407": ["\uD83D\uDC07", ["rabbit2"]],
  "1f408": ["\uD83D\uDC08", ["cat2"]],
  "1f409": ["\uD83D\uDC09", ["dragon"]],
  "1f40a": ["\uD83D\uDC0A", ["crocodile"]],
  "1f40b": ["\uD83D\uDC0B", ["whale2"]],
  "1f40c": ["\uD83D\uDC0C", ["snail"]],
  "1f40d": ["\uD83D\uDC0D", ["snake"]],
  "1f40e": ["\uD83D\uDC0E", ["racehorse"]],
  "1f40f": ["\uD83D\uDC0F", ["ram"]],
  "1f410": ["\uD83D\uDC10", ["goat"]],
  "1f411": ["\uD83D\uDC11", ["sheep"]],
  "1f412": ["\uD83D\uDC12", ["monkey"]],
  "1f413": ["\uD83D\uDC13", ["rooster"]],
  "1f414": ["\uD83D\uDC14", ["chicken"]],
  "1f415": ["\uD83D\uDC15", ["dog2"]],
  "1f416": ["\uD83D\uDC16", ["pig2"]],
  "1f417": ["\uD83D\uDC17", ["boar"]],
  "1f418": ["\uD83D\uDC18", ["elephant"]],
  "1f419": ["\uD83D\uDC19", ["octopus"]],
  "1f41a": ["\uD83D\uDC1A", ["shell"]],
  "1f41b": ["\uD83D\uDC1B", ["bug"]],
  "1f41c": ["\uD83D\uDC1C", ["ant"]],
  "1f41d": ["\uD83D\uDC1D", ["bee", "honeybee"]],
  "1f41e": ["\uD83D\uDC1E", ["beetle"]],
  "1f41f": ["\uD83D\uDC1F", ["fish"]],
  "1f420": ["\uD83D\uDC20", ["tropical_fish"]],
  "1f421": ["\uD83D\uDC21", ["blowfish"]],
  "1f422": ["\uD83D\uDC22", ["turtle"]],
  "1f423": ["\uD83D\uDC23", ["hatching_chick"]],
  "1f424": ["\uD83D\uDC24", ["baby_chick"]],
  "1f425": ["\uD83D\uDC25", ["hatched_chick"]],
  "1f426": ["\uD83D\uDC26", ["bird"]],
  "1f427": ["\uD83D\uDC27", ["penguin"]],
  "1f428": ["\uD83D\uDC28", ["koala"]],
  "1f429": ["\uD83D\uDC29", ["poodle"]],
  "1f42a": ["\uD83D\uDC2A", ["dromedary_camel"]],
  "1f42b": ["\uD83D\uDC2B", ["camel"]],
  "1f42c": ["\uD83D\uDC2C", ["dolphin", "flipper"]],
  "1f42d": ["\uD83D\uDC2D", ["mouse"]],
  "1f42e": ["\uD83D\uDC2E", ["cow"]],
  "1f42f": ["\uD83D\uDC2F", ["tiger"]],
  "1f430": ["\uD83D\uDC30", ["rabbit"]],
  "1f431": ["\uD83D\uDC31", ["cat"]],
  "1f432": ["\uD83D\uDC32", ["dragon_face"]],
  "1f433": ["\uD83D\uDC33", ["whale"]],
  "1f434": ["\uD83D\uDC34", ["horse"]],
  "1f435": ["\uD83D\uDC35", ["monkey_face"]],
  "1f436": ["\uD83D\uDC36", ["dog"]],
  "1f437": ["\uD83D\uDC37", ["pig"]],
  "1f438": ["\uD83D\uDC38", ["frog"]],
  "1f439": ["\uD83D\uDC39", ["hamster"]],
  "1f43a": ["\uD83D\uDC3A", ["wolf"]],
  "1f43b": ["\uD83D\uDC3B", ["bear"]],
  "1f43c": ["\uD83D\uDC3C", ["panda_face"]],
  "1f43d": ["\uD83D\uDC3D", ["pig_nose"]],
  "1f43e": ["\uD83D\uDC3E", ["feet", "paw_prints"]],
  "1f440": ["\uD83D\uDC40", ["eyes"]],
  "1f442": ["\uD83D\uDC42", ["ear"]],
  "1f443": ["\uD83D\uDC43", ["nose"]],
  "1f444": ["\uD83D\uDC44", ["lips"]],
  "1f445": ["\uD83D\uDC45", ["tongue"]],
  "1f446": ["\uD83D\uDC46", ["point_up_2"]],
  "1f447": ["\uD83D\uDC47", ["point_down"]],
  "1f448": ["\uD83D\uDC48", ["point_left"]],
  "1f449": ["\uD83D\uDC49", ["point_right"]],
  "1f44a": ["\uD83D\uDC4A", ["facepunch", "punch"]],
  "1f44b": ["\uD83D\uDC4B", ["wave"]],
  "1f44c": ["\uD83D\uDC4C", ["ok_hand"]],
  "1f44d": ["\uD83D\uDC4D", ["+1", "thumbsup"]],
  "1f44e": ["\uD83D\uDC4E", ["-1", "thumbsdown"]],
  "1f44f": ["\uD83D\uDC4F", ["clap"]],
  "1f450": ["\uD83D\uDC50", ["open_hands"]],
  "1f451": ["\uD83D\uDC51", ["crown"]],
  "1f452": ["\uD83D\uDC52", ["womans_hat"]],
  "1f453": ["\uD83D\uDC53", ["eyeglasses"]],
  "1f454": ["\uD83D\uDC54", ["necktie"]],
  "1f455": ["\uD83D\uDC55", ["shirt", "tshirt"]],
  "1f456": ["\uD83D\uDC56", ["jeans"]],
  "1f457": ["\uD83D\uDC57", ["dress"]],
  "1f458": ["\uD83D\uDC58", ["kimono"]],
  "1f459": ["\uD83D\uDC59", ["bikini"]],
  "1f45a": ["\uD83D\uDC5A", ["womans_clothes"]],
  "1f45b": ["\uD83D\uDC5B", ["purse"]],
  "1f45c": ["\uD83D\uDC5C", ["handbag"]],
  "1f45d": ["\uD83D\uDC5D", ["pouch"]],
  "1f45e": ["\uD83D\uDC5E", ["mans_shoe", "shoe"]],
  "1f45f": ["\uD83D\uDC5F", ["athletic_shoe"]],
  "1f460": ["\uD83D\uDC60", ["high_heel"]],
  "1f461": ["\uD83D\uDC61", ["sandal"]],
  "1f462": ["\uD83D\uDC62", ["boot"]],
  "1f463": ["\uD83D\uDC63", ["footprints"]],
  "1f464": ["\uD83D\uDC64", ["bust_in_silhouette"]],
  "1f465": ["\uD83D\uDC65", ["busts_in_silhouette"]],
  "1f466": ["\uD83D\uDC66", ["boy"]],
  "1f467": ["\uD83D\uDC67", ["girl"]],
  "1f468": ["\uD83D\uDC68", ["man"]],
  "1f469": ["\uD83D\uDC69", ["woman"]],
  "1f46a": ["\uD83D\uDC6A", ["family"]],
  "1f46b": ["\uD83D\uDC6B", ["couple"]],
  "1f46c": ["\uD83D\uDC6C", ["two_men_holding_hands"]],
  "1f46d": ["\uD83D\uDC6D", ["two_women_holding_hands"]],
  "1f46e": ["\uD83D\uDC6E", ["cop"]],
  "1f46f": ["\uD83D\uDC6F", ["dancers"]],
  "1f470": ["\uD83D\uDC70", ["bride_with_veil"]],
  "1f471": ["\uD83D\uDC71", ["person_with_blond_hair"]],
  "1f472": ["\uD83D\uDC72", ["man_with_gua_pi_mao"]],
  "1f473": ["\uD83D\uDC73", ["man_with_turban"]],
  "1f474": ["\uD83D\uDC74", ["older_man"]],
  "1f475": ["\uD83D\uDC75", ["older_woman"]],
  "1f476": ["\uD83D\uDC76", ["baby"]],
  "1f477": ["\uD83D\uDC77", ["construction_worker"]],
  "1f478": ["\uD83D\uDC78", ["princess"]],
  "1f479": ["\uD83D\uDC79", ["japanese_ogre"]],
  "1f47a": ["\uD83D\uDC7A", ["japanese_goblin"]],
  "1f47b": ["\uD83D\uDC7B", ["ghost"]],
  "1f47c": ["\uD83D\uDC7C", ["angel"]],
  "1f47d": ["\uD83D\uDC7D", ["alien"]],
  "1f47e": ["\uD83D\uDC7E", ["space_invader"]],
  "1f47f": ["\uD83D\uDC7F", ["imp"]],
  "1f480": ["\uD83D\uDC80", ["skull"]],
  "1f481": ["\uD83D\uDC81", ["information_desk_person"]],
  "1f482": ["\uD83D\uDC82", ["guardsman"]],
  "1f483": ["\uD83D\uDC83", ["dancer"]],
  "1f484": ["\uD83D\uDC84", ["lipstick"]],
  "1f485": ["\uD83D\uDC85", ["nail_care"]],
  "1f486": ["\uD83D\uDC86", ["massage"]],
  "1f487": ["\uD83D\uDC87", ["haircut"]],
  "1f488": ["\uD83D\uDC88", ["barber"]],
  "1f489": ["\uD83D\uDC89", ["syringe"]],
  "1f48a": ["\uD83D\uDC8A", ["pill"]],
  "1f48b": ["\uD83D\uDC8B", ["kiss"]],
  "1f48c": ["\uD83D\uDC8C", ["love_letter"]],
  "1f48d": ["\uD83D\uDC8D", ["ring"]],
  "1f48e": ["\uD83D\uDC8E", ["gem"]],
  "1f48f": ["\uD83D\uDC8F", ["couplekiss"]],
  "1f490": ["\uD83D\uDC90", ["bouquet"]],
  "1f491": ["\uD83D\uDC91", ["couple_with_heart"]],
  "1f492": ["\uD83D\uDC92", ["wedding"]],
  "1f493": ["\uD83D\uDC93", ["heartbeat"]],
  "1f494": ["\uD83D\uDC94", ["broken_heart"], "<\/3"],
  "1f495": ["\uD83D\uDC95", ["two_hearts"]],
  "1f496": ["\uD83D\uDC96", ["sparkling_heart"]],
  "1f497": ["\uD83D\uDC97", ["heartpulse"]],
  "1f498": ["\uD83D\uDC98", ["cupid"]],
  "1f499": ["\uD83D\uDC99", ["blue_heart"], "<3"],
  "1f49a": ["\uD83D\uDC9A", ["green_heart"], "<3"],
  "1f49b": ["\uD83D\uDC9B", ["yellow_heart"], "<3"],
  "1f49c": ["\uD83D\uDC9C", ["purple_heart"], "<3"],
  "1f49d": ["\uD83D\uDC9D", ["gift_heart"]],
  "1f49e": ["\uD83D\uDC9E", ["revolving_hearts"]],
  "1f49f": ["\uD83D\uDC9F", ["heart_decoration"]],
  "1f4a0": ["\uD83D\uDCA0", ["diamond_shape_with_a_dot_inside"]],
  "1f4a1": ["\uD83D\uDCA1", ["bulb"]],
  "1f4a2": ["\uD83D\uDCA2", ["anger"]],
  "1f4a3": ["\uD83D\uDCA3", ["bomb"]],
  "1f4a4": ["\uD83D\uDCA4", ["zzz"]],
  "1f4a5": ["\uD83D\uDCA5", ["boom", "collision"]],
  "1f4a6": ["\uD83D\uDCA6", ["sweat_drops"]],
  "1f4a7": ["\uD83D\uDCA7", ["droplet"]],
  "1f4a8": ["\uD83D\uDCA8", ["dash"]],
  "1f4a9": ["\uD83D\uDCA9", ["hankey", "poop", "shit"]],
  "1f4aa": ["\uD83D\uDCAA", ["muscle"]],
  "1f4ab": ["\uD83D\uDCAB", ["dizzy"]],
  "1f4ac": ["\uD83D\uDCAC", ["speech_balloon"]],
  "1f4ad": ["\uD83D\uDCAD", ["thought_balloon"]],
  "1f4ae": ["\uD83D\uDCAE", ["white_flower"]],
  "1f4af": ["\uD83D\uDCAF", ["100"]],
  "1f4b0": ["\uD83D\uDCB0", ["moneybag"]],
  "1f4b1": ["\uD83D\uDCB1", ["currency_exchange"]],
  "1f4b2": ["\uD83D\uDCB2", ["heavy_dollar_sign"]],
  "1f4b3": ["\uD83D\uDCB3", ["credit_card"]],
  "1f4b4": ["\uD83D\uDCB4", ["yen"]],
  "1f4b5": ["\uD83D\uDCB5", ["dollar"]],
  "1f4b6": ["\uD83D\uDCB6", ["euro"]],
  "1f4b7": ["\uD83D\uDCB7", ["pound"]],
  "1f4b8": ["\uD83D\uDCB8", ["money_with_wings"]],
  "1f4b9": ["\uD83D\uDCB9", ["chart"]],
  "1f4ba": ["\uD83D\uDCBA", ["seat"]],
  "1f4bb": ["\uD83D\uDCBB", ["computer"]],
  "1f4bc": ["\uD83D\uDCBC", ["briefcase"]],
  "1f4bd": ["\uD83D\uDCBD", ["minidisc"]],
  "1f4be": ["\uD83D\uDCBE", ["floppy_disk"]],
  "1f4bf": ["\uD83D\uDCBF", ["cd"]],
  "1f4c0": ["\uD83D\uDCC0", ["dvd"]],
  "1f4c1": ["\uD83D\uDCC1", ["file_folder"]],
  "1f4c2": ["\uD83D\uDCC2", ["open_file_folder"]],
  "1f4c3": ["\uD83D\uDCC3", ["page_with_curl"]],
  "1f4c4": ["\uD83D\uDCC4", ["page_facing_up"]],
  "1f4c5": ["\uD83D\uDCC5", ["date"]],
  "1f4c6": ["\uD83D\uDCC6", ["calendar"]],
  "1f4c7": ["\uD83D\uDCC7", ["card_index"]],
  "1f4c8": ["\uD83D\uDCC8", ["chart_with_upwards_trend"]],
  "1f4c9": ["\uD83D\uDCC9", ["chart_with_downwards_trend"]],
  "1f4ca": ["\uD83D\uDCCA", ["bar_chart"]],
  "1f4cb": ["\uD83D\uDCCB", ["clipboard"]],
  "1f4cc": ["\uD83D\uDCCC", ["pushpin"]],
  "1f4cd": ["\uD83D\uDCCD", ["round_pushpin"]],
  "1f4ce": ["\uD83D\uDCCE", ["paperclip"]],
  "1f4cf": ["\uD83D\uDCCF", ["straight_ruler"]],
  "1f4d0": ["\uD83D\uDCD0", ["triangular_ruler"]],
  "1f4d1": ["\uD83D\uDCD1", ["bookmark_tabs"]],
  "1f4d2": ["\uD83D\uDCD2", ["ledger"]],
  "1f4d3": ["\uD83D\uDCD3", ["notebook"]],
  "1f4d4": ["\uD83D\uDCD4", ["notebook_with_decorative_cover"]],
  "1f4d5": ["\uD83D\uDCD5", ["closed_book"]],
  "1f4d6": ["\uD83D\uDCD6", ["book", "open_book"]],
  "1f4d7": ["\uD83D\uDCD7", ["green_book"]],
  "1f4d8": ["\uD83D\uDCD8", ["blue_book"]],
  "1f4d9": ["\uD83D\uDCD9", ["orange_book"]],
  "1f4da": ["\uD83D\uDCDA", ["books"]],
  "1f4db": ["\uD83D\uDCDB", ["name_badge"]],
  "1f4dc": ["\uD83D\uDCDC", ["scroll"]],
  "1f4dd": ["\uD83D\uDCDD", ["memo", "pencil"]],
  "1f4de": ["\uD83D\uDCDE", ["telephone_receiver"]],
  "1f4df": ["\uD83D\uDCDF", ["pager"]],
  "1f4e0": ["\uD83D\uDCE0", ["fax"]],
  "1f4e1": ["\uD83D\uDCE1", ["satellite"]],
  "1f4e2": ["\uD83D\uDCE2", ["loudspeaker"]],
  "1f4e3": ["\uD83D\uDCE3", ["mega"]],
  "1f4e4": ["\uD83D\uDCE4", ["outbox_tray"]],
  "1f4e5": ["\uD83D\uDCE5", ["inbox_tray"]],
  "1f4e6": ["\uD83D\uDCE6", ["package"]],
  "1f4e7": ["\uD83D\uDCE7", ["e-mail"]],
  "1f4e8": ["\uD83D\uDCE8", ["incoming_envelope"]],
  "1f4e9": ["\uD83D\uDCE9", ["envelope_with_arrow"]],
  "1f4ea": ["\uD83D\uDCEA", ["mailbox_closed"]],
  "1f4eb": ["\uD83D\uDCEB", ["mailbox"]],
  "1f4ec": ["\uD83D\uDCEC", ["mailbox_with_mail"]],
  "1f4ed": ["\uD83D\uDCED", ["mailbox_with_no_mail"]],
  "1f4ee": ["\uD83D\uDCEE", ["postbox"]],
  "1f4ef": ["\uD83D\uDCEF", ["postal_horn"]],
  "1f4f0": ["\uD83D\uDCF0", ["newspaper"]],
  "1f4f1": ["\uD83D\uDCF1", ["iphone"]],
  "1f4f2": ["\uD83D\uDCF2", ["calling"]],
  "1f4f3": ["\uD83D\uDCF3", ["vibration_mode"]],
  "1f4f4": ["\uD83D\uDCF4", ["mobile_phone_off"]],
  "1f4f5": ["\uD83D\uDCF5", ["no_mobile_phones"]],
  "1f4f6": ["\uD83D\uDCF6", ["signal_strength"]],
  "1f4f7": ["\uD83D\uDCF7", ["camera"]],
  "1f4f9": ["\uD83D\uDCF9", ["video_camera"]],
  "1f4fa": ["\uD83D\uDCFA", ["tv"]],
  "1f4fb": ["\uD83D\uDCFB", ["radio"]],
  "1f4fc": ["\uD83D\uDCFC", ["vhs"]],
  "1f500": ["\uD83D\uDD00", ["twisted_rightwards_arrows"]],
  "1f501": ["\uD83D\uDD01", ["repeat"]],
  "1f502": ["\uD83D\uDD02", ["repeat_one"]],
  "1f503": ["\uD83D\uDD03", ["arrows_clockwise"]],
  "1f504": ["\uD83D\uDD04", ["arrows_counterclockwise"]],
  "1f505": ["\uD83D\uDD05", ["low_brightness"]],
  "1f506": ["\uD83D\uDD06", ["high_brightness"]],
  "1f507": ["\uD83D\uDD07", ["mute"]],
  "1f508": ["\uD83D\uDD09", ["speaker"]],
  "1f509": ["\uD83D\uDD09", ["sound"]],
  "1f50a": ["\uD83D\uDD0A", ["loud_sound"]],
  "1f50b": ["\uD83D\uDD0B", ["battery"]],
  "1f50c": ["\uD83D\uDD0C", ["electric_plug"]],
  "1f50d": ["\uD83D\uDD0D", ["mag"]],
  "1f50e": ["\uD83D\uDD0E", ["mag_right"]],
  "1f50f": ["\uD83D\uDD0F", ["lock_with_ink_pen"]],
  "1f510": ["\uD83D\uDD10", ["closed_lock_with_key"]],
  "1f511": ["\uD83D\uDD11", ["key"]],
  "1f512": ["\uD83D\uDD12", ["lock"]],
  "1f513": ["\uD83D\uDD13", ["unlock"]],
  "1f514": ["\uD83D\uDD14", ["bell"]],
  "1f515": ["\uD83D\uDD15", ["no_bell"]],
  "1f516": ["\uD83D\uDD16", ["bookmark"]],
  "1f517": ["\uD83D\uDD17", ["link"]],
  "1f518": ["\uD83D\uDD18", ["radio_button"]],
  "1f519": ["\uD83D\uDD19", ["back"]],
  "1f51a": ["\uD83D\uDD1A", ["end"]],
  "1f51b": ["\uD83D\uDD1B", ["on"]],
  "1f51c": ["\uD83D\uDD1C", ["soon"]],
  "1f51d": ["\uD83D\uDD1D", ["top"]],
  "1f51e": ["\uD83D\uDD1E", ["underage"]],
  "1f51f": ["\uD83D\uDD1F", ["keycap_ten"]],
  "1f520": ["\uD83D\uDD20", ["capital_abcd"]],
  "1f521": ["\uD83D\uDD21", ["abcd"]],
  "1f522": ["\uD83D\uDD22", ["1234"]],
  "1f523": ["\uD83D\uDD23", ["symbols"]],
  "1f524": ["\uD83D\uDD24", ["abc"]],
  "1f525": ["\uD83D\uDD25", ["fire"]],
  "1f526": ["\uD83D\uDD26", ["flashlight"]],
  "1f527": ["\uD83D\uDD27", ["wrench"]],
  "1f528": ["\uD83D\uDD28", ["hammer"]],
  "1f529": ["\uD83D\uDD29", ["nut_and_bolt"]],
  "1f52a": ["\uD83D\uDD2A", ["hocho"]],
  "1f52b": ["\uD83D\uDD2B", ["gun"]],
  "1f52c": ["\uD83D\uDD2C", ["microscope"]],
  "1f52d": ["\uD83D\uDD2D", ["telescope"]],
  "1f52e": ["\uD83D\uDD2E", ["crystal_ball"]],
  "1f52f": ["\uD83D\uDD2F", ["six_pointed_star"]],
  "1f530": ["\uD83D\uDD30", ["beginner"]],
  "1f531": ["\uD83D\uDD31", ["trident"]],
  "1f532": ["\uD83D\uDD32", ["black_square_button"]],
  "1f533": ["\uD83D\uDD33", ["white_square_button"]],
  "1f534": ["\uD83D\uDD34", ["red_circle"]],
  "1f535": ["\uD83D\uDD35", ["large_blue_circle"]],
  "1f536": ["\uD83D\uDD36", ["large_orange_diamond"]],
  "1f537": ["\uD83D\uDD37", ["large_blue_diamond"]],
  "1f538": ["\uD83D\uDD38", ["small_orange_diamond"]],
  "1f539": ["\uD83D\uDD39", ["small_blue_diamond"]],
  "1f53a": ["\uD83D\uDD3A", ["small_red_triangle"]],
  "1f53b": ["\uD83D\uDD3B", ["small_red_triangle_down"]],
  "1f53c": ["\uD83D\uDD3C", ["arrow_up_small"]],
  "1f53d": ["\uD83D\uDD3D", ["arrow_down_small"]],
  "1f550": ["\uD83D\uDD50", ["clock1"]],
  "1f551": ["\uD83D\uDD51", ["clock2"]],
  "1f552": ["\uD83D\uDD52", ["clock3"]],
  "1f553": ["\uD83D\uDD53", ["clock4"]],
  "1f554": ["\uD83D\uDD54", ["clock5"]],
  "1f555": ["\uD83D\uDD55", ["clock6"]],
  "1f556": ["\uD83D\uDD56", ["clock7"]],
  "1f557": ["\uD83D\uDD57", ["clock8"]],
  "1f558": ["\uD83D\uDD58", ["clock9"]],
  "1f559": ["\uD83D\uDD59", ["clock10"]],
  "1f55a": ["\uD83D\uDD5A", ["clock11"]],
  "1f55b": ["\uD83D\uDD5B", ["clock12"]],
  "1f55c": ["\uD83D\uDD5C", ["clock130"]],
  "1f55d": ["\uD83D\uDD5D", ["clock230"]],
  "1f55e": ["\uD83D\uDD5E", ["clock330"]],
  "1f55f": ["\uD83D\uDD5F", ["clock430"]],
  "1f560": ["\uD83D\uDD60", ["clock530"]],
  "1f561": ["\uD83D\uDD61", ["clock630"]],
  "1f562": ["\uD83D\uDD62", ["clock730"]],
  "1f563": ["\uD83D\uDD63", ["clock830"]],
  "1f564": ["\uD83D\uDD64", ["clock930"]],
  "1f565": ["\uD83D\uDD65", ["clock1030"]],
  "1f566": ["\uD83D\uDD66", ["clock1130"]],
  "1f567": ["\uD83D\uDD67", ["clock1230"]],
  "1f5fb": ["\uD83D\uDDFB", ["mount_fuji"]],
  "1f5fc": ["\uD83D\uDDFC", ["tokyo_tower"]],
  "1f5fd": ["\uD83D\uDDFD", ["statue_of_liberty"]],
  "1f5fe": ["\uD83D\uDDFE", ["japan"]],
  "1f5ff": ["\uD83D\uDDFF", ["moyai"]],
  "1f600": ["\uD83D\uDE00", ["grinning"]],
  "1f601": ["\uD83D\uDE01", ["grin"]],
  "1f602": ["\uD83D\uDE02", ["joy"]],
  "1f603": ["\uD83D\uDE03", ["smiley"], ":)"],
  "1f604": ["\uD83D\uDE04", ["smile"], ":)"],
  "1f605": ["\uD83D\uDE05", ["sweat_smile"]],
  "1f606": ["\uD83D\uDE06", ["satisfied"]],
  "1f607": ["\uD83D\uDE07", ["innocent"]],
  "1f608": ["\uD83D\uDE08", ["smiling_imp"]],
  "1f609": ["\uD83D\uDE09", ["wink"], ";)"],
  "1f60a": ["\uD83D\uDE0A", ["blush"]],
  "1f60b": ["\uD83D\uDE0B", ["yum"]],
  "1f60c": ["\uD83D\uDE0C", ["relieved"]],
  "1f60d": ["\uD83D\uDE0D", ["heart_eyes"]],
  "1f60e": ["\uD83D\uDE0E", ["sunglasses"]],
  "1f60f": ["\uD83D\uDE0F", ["smirk"]],
  "1f610": ["\uD83D\uDE10", ["neutral_face"]],
  "1f611": ["\uD83D\uDE11", ["expressionless"]],
  "1f612": ["\uD83D\uDE12", ["unamused"]],
  "1f613": ["\uD83D\uDE13", ["sweat"]],
  "1f614": ["\uD83D\uDE14", ["pensive"]],
  "1f615": ["\uD83D\uDE15", ["confused"]],
  "1f616": ["\uD83D\uDE16", ["confounded"]],
  "1f617": ["\uD83D\uDE17", ["kissing"]],
  "1f618": ["\uD83D\uDE18", ["kissing_heart"]],
  "1f619": ["\uD83D\uDE19", ["kissing_smiling_eyes"]],
  "1f61a": ["\uD83D\uDE1A", ["kissing_closed_eyes"]],
  "1f61b": ["\uD83D\uDE1B", ["stuck_out_tongue"]],
  "1f61c": ["\uD83D\uDE1C", ["stuck_out_tongue_winking_eye"], ";p"],
  "1f61d": ["\uD83D\uDE1D", ["stuck_out_tongue_closed_eyes"]],
  "1f61e": ["\uD83D\uDE1E", ["disappointed"], ":("],
  "1f61f": ["\uD83D\uDE1F", ["worried"]],
  "1f620": ["\uD83D\uDE20", ["angry"]],
  "1f621": ["\uD83D\uDE21", ["rage"]],
  "1f622": ["\uD83D\uDE22", ["cry"], ":'("],
  "1f623": ["\uD83D\uDE23", ["persevere"]],
  "1f624": ["\uD83D\uDE24", ["triumph"]],
  "1f625": ["\uD83D\uDE25", ["disappointed_relieved"]],
  "1f626": ["\uD83D\uDE26", ["frowning"]],
  "1f627": ["\uD83D\uDE27", ["anguished"]],
  "1f628": ["\uD83D\uDE28", ["fearful"]],
  "1f629": ["\uD83D\uDE29", ["weary"]],
  "1f62a": ["\uD83D\uDE2A", ["sleepy"]],
  "1f62b": ["\uD83D\uDE2B", ["tired_face"]],
  "1f62c": ["\uD83D\uDE2C", ["grimacing"]],
  "1f62d": ["\uD83D\uDE2D", ["sob"], ":'("],
  "1f62e": ["\uD83D\uDE2E", ["open_mouth"]],
  "1f62f": ["\uD83D\uDE2F", ["hushed"]],
  "1f630": ["\uD83D\uDE30", ["cold_sweat"]],
  "1f631": ["\uD83D\uDE31", ["scream"]],
  "1f632": ["\uD83D\uDE32", ["astonished"]],
  "1f633": ["\uD83D\uDE33", ["flushed"]],
  "1f634": ["\uD83D\uDE34", ["sleeping"]],
  "1f635": ["\uD83D\uDE35", ["dizzy_face"]],
  "1f636": ["\uD83D\uDE36", ["no_mouth"]],
  "1f637": ["\uD83D\uDE37", ["mask"]],
  "1f638": ["\uD83D\uDE38", ["smile_cat"]],
  "1f639": ["\uD83D\uDE39", ["joy_cat"]],
  "1f63a": ["\uD83D\uDE3A", ["smiley_cat"]],
  "1f63b": ["\uD83D\uDE3B", ["heart_eyes_cat"]],
  "1f63c": ["\uD83D\uDE3C", ["smirk_cat"]],
  "1f63d": ["\uD83D\uDE3D", ["kissing_cat"]],
  "1f63e": ["\uD83D\uDE3E", ["pouting_cat"]],
  "1f63f": ["\uD83D\uDE3F", ["crying_cat_face"]],
  "1f640": ["\uD83D\uDE40", ["scream_cat"]],
  "1f645": ["\uD83D\uDE45", ["no_good"]],
  "1f646": ["\uD83D\uDE46", ["ok_woman"]],
  "1f647": ["\uD83D\uDE47", ["bow"]],
  "1f648": ["\uD83D\uDE48", ["see_no_evil"]],
  "1f649": ["\uD83D\uDE49", ["hear_no_evil"]],
  "1f64a": ["\uD83D\uDE4A", ["speak_no_evil"]],
  "1f64b": ["\uD83D\uDE4B", ["raising_hand"]],
  "1f64c": ["\uD83D\uDE4C", ["raised_hands"]],
  "1f64d": ["\uD83D\uDE4D", ["person_frowning"]],
  "1f64e": ["\uD83D\uDE4E", ["person_with_pouting_face"]],
  "1f64f": ["\uD83D\uDE4F", ["pray"]],
  "1f680": ["\uD83D\uDE80", ["rocket"]],
  "1f681": ["\uD83D\uDE81", ["helicopter"]],
  "1f682": ["\uD83D\uDE82", ["steam_locomotive"]],
  "1f683": ["\uD83D\uDE83", ["railway_car"]],
  "1f68b": ["\uD83D\uDE8B", ["train"]],
  "1f684": ["\uD83D\uDE84", ["bullettrain_side"]],
  "1f685": ["\uD83D\uDE85", ["bullettrain_front"]],
  "1f686": ["\uD83D\uDE86", ["train2"]],
  "1f687": ["\uD83D\uDE87", ["metro"]],
  "1f688": ["\uD83D\uDE88", ["light_rail"]],
  "1f689": ["\uD83D\uDE89", ["station"]],
  "1f68a": ["\uD83D\uDE8A", ["tram"]],
  "1f68c": ["\uD83D\uDE8C", ["bus"]],
  "1f68d": ["\uD83D\uDE8D", ["oncoming_bus"]],
  "1f68e": ["\uD83D\uDE8E", ["trolleybus"]],
  "1f68f": ["\uD83D\uDE8F", ["busstop"]],
  "1f690": ["\uD83D\uDE90", ["minibus"]],
  "1f691": ["\uD83D\uDE91", ["ambulance"]],
  "1f692": ["\uD83D\uDE92", ["fire_engine"]],
  "1f693": ["\uD83D\uDE93", ["police_car"]],
  "1f694": ["\uD83D\uDE94", ["oncoming_police_car"]],
  "1f695": ["\uD83D\uDE95", ["taxi"]],
  "1f696": ["\uD83D\uDE96", ["oncoming_taxi"]],
  "1f697": ["\uD83D\uDE97", ["car", "red_car"]],
  "1f698": ["\uD83D\uDE98", ["oncoming_automobile"]],
  "1f699": ["\uD83D\uDE99", ["blue_car"]],
  "1f69a": ["\uD83D\uDE9A", ["truck"]],
  "1f69b": ["\uD83D\uDE9B", ["articulated_lorry"]],
  "1f69c": ["\uD83D\uDE9C", ["tractor"]],
  "1f69d": ["\uD83D\uDE9D", ["monorail"]],
  "1f69e": ["\uD83D\uDE9E", ["mountain_railway"]],
  "1f69f": ["\uD83D\uDE9F", ["suspension_railway"]],
  "1f6a0": ["\uD83D\uDEA0", ["mountain_cableway"]],
  "1f6a1": ["\uD83D\uDEA1", ["aerial_tramway"]],
  "1f6a2": ["\uD83D\uDEA2", ["ship"]],
  "1f6a3": ["\uD83D\uDEA3", ["rowboat"]],
  "1f6a4": ["\uD83D\uDEA4", ["speedboat"]],
  "1f6a5": ["\uD83D\uDEA5", ["traffic_light"]],
  "1f6a6": ["\uD83D\uDEA6", ["vertical_traffic_light"]],
  "1f6a7": ["\uD83D\uDEA7", ["construction"]],
  "1f6a8": ["\uD83D\uDEA8", ["rotating_light"]],
  "1f6a9": ["\uD83D\uDEA9", ["triangular_flag_on_post"]],
  "1f6aa": ["\uD83D\uDEAA", ["door"]],
  "1f6ab": ["\uD83D\uDEAB", ["no_entry_sign"]],
  "1f6ac": ["\uD83D\uDEAC", ["smoking"]],
  "1f6ad": ["\uD83D\uDEAD", ["no_smoking"]],
  "1f6ae": ["\uD83D\uDEAE", ["put_litter_in_its_place"]],
  "1f6af": ["\uD83D\uDEAF", ["do_not_litter"]],
  "1f6b0": ["\uD83D\uDEB0", ["potable_water"]],
  "1f6b1": ["\uD83D\uDEB1", ["non-potable_water"]],
  "1f6b2": ["\uD83D\uDEB2", ["bike"]],
  "1f6b3": ["\uD83D\uDEB3", ["no_bicycles"]],
  "1f6b4": ["\uD83D\uDEB4", ["bicyclist"]],
  "1f6b5": ["\uD83D\uDEB5", ["mountain_bicyclist"]],
  "1f6b6": ["\uD83D\uDEB6", ["walking"]],
  "1f6b7": ["\uD83D\uDEB7", ["no_pedestrians"]],
  "1f6b8": ["\uD83D\uDEB8", ["children_crossing"]],
  "1f6b9": ["\uD83D\uDEB9", ["mens"]],
  "1f6ba": ["\uD83D\uDEBA", ["womens"]],
  "1f6bb": ["\uD83D\uDEBB", ["restroom"]],
  "1f6bc": ["\uD83D\uDEBC", ["baby_symbol"]],
  "1f6bd": ["\uD83D\uDEBD", ["toilet"]],
  "1f6be": ["\uD83D\uDEBE", ["wc"]],
  "1f6bf": ["\uD83D\uDEBF", ["shower"]],
  "1f6c0": ["\uD83D\uDEC0", ["bath"]],
  "1f6c1": ["\uD83D\uDEC1", ["bathtub"]],
  "1f6c2": ["\uD83D\uDEC2", ["passport_control"]],
  "1f6c3": ["\uD83D\uDEC3", ["customs"]],
  "1f6c4": ["\uD83D\uDEC4", ["baggage_claim"]],
  "1f6c5": ["\uD83D\uDEC5", ["left_luggage"]],
  "0023": ["\u0023\u20E3", ["hash"]],
  "0030": ["\u0030\u20E3", ["zero"]],
  "0031": ["\u0031\u20E3", ["one"]],
  "0032": ["\u0032\u20E3", ["two"]],
  "0033": ["\u0033\u20E3", ["three"]],
  "0034": ["\u0034\u20E3", ["four"]],
  "0035": ["\u0035\u20E3", ["five"]],
  "0036": ["\u0036\u20E3", ["six"]],
  "0037": ["\u0037\u20E3", ["seven"]],
  "0038": ["\u0038\u20E3", ["eight"]],
  "0039": ["\u0039\u20E3", ["nine"]],
  "1f1e8-1f1f3": ["\uD83C\uDDE8\uD83C\uDDF3", ["cn"]],
  "1f1e9-1f1ea": ["\uD83C\uDDE9\uD83C\uDDEA", ["de"]],
  "1f1ea-1f1f8": ["\uD83C\uDDEA\uD83C\uDDF8", ["es"]],
  "1f1eb-1f1f7": ["\uD83C\uDDEB\uD83C\uDDF7", ["fr"]],
  "1f1ec-1f1e7": ["\uD83C\uDDEC\uD83C\uDDE7", ["gb", "uk"]],
  "1f1ee-1f1f9": ["\uD83C\uDDEE\uD83C\uDDF9", ["it"]],
  "1f1ef-1f1f5": ["\uD83C\uDDEF\uD83C\uDDF5", ["jp"]],
  "1f1f0-1f1f7": ["\uD83C\uDDF0\uD83C\uDDF7", ["kr"]],
  "1f1f7-1f1fa": ["\uD83C\uDDF7\uD83C\uDDFA", ["ru"]],
  "1f1fa-1f1f8": ["\uD83C\uDDFA\uD83C\uDDF8", ["us"]]
}

Config.EmojiCategories = [
["1f604", "1f603", "1f600", "1f60a", "263a", "1f609", "1f60d", "1f618", "1f61a", "1f617", "1f619", "1f61c", "1f61d", "1f61b", "1f633", "1f601", "1f614", "1f60c", "1f612", "1f61e", "1f623", "1f622", "1f602", "1f62d", "1f62a", "1f625", "1f630", "1f605", "1f613", "1f629", "1f62b", "1f628", "1f631", "1f620", "1f621", "1f624", "1f616", "1f606", "1f60b", "1f637", "1f60e", "1f634", "1f635", "1f632", "1f61f", "1f626", "1f627", "1f608", "1f47f", "1f62e", "1f62c", "1f610", "1f615", "1f62f", "1f636", "1f607", "1f60f", "1f611", "1f472", "1f473", "1f46e", "1f477", "1f482", "1f476", "1f466", "1f467", "1f468", "1f469", "1f474", "1f475", "1f471", "1f47c", "1f478", "1f63a", "1f638", "1f63b", "1f63d", "1f63c", "1f640", "1f63f", "1f639", "1f63e", "1f479", "1f47a", "1f648", "1f649", "1f64a", "1f480", "1f47d", "1f4a9", "1f525", "2728", "1f31f", "1f4ab", "1f4a5", "1f4a2", "1f4a6", "1f4a7", "1f4a4", "1f4a8", "1f442", "1f440", "1f443", "1f445", "1f444", "1f44d", "1f44e", "1f44c", "1f44a", "270a", "270c", "1f44b", "270b", "1f450", "1f446", "1f447", "1f449", "1f448", "1f64c", "1f64f", "261d", "1f44f", "1f4aa", "1f6b6", "1f3c3", "1f483", "1f46b", "1f46a", "1f46c", "1f46d", "1f48f", "1f491", "1f46f", "1f646", "1f645", "1f481", "1f64b", "1f486", "1f487", "1f485", "1f470", "1f64e", "1f64d", "1f647", "1f3a9", "1f451", "1f452", "1f45f", "1f45e", "1f461", "1f460", "1f462", "1f455", "1f454", "1f45a", "1f457", "1f3bd", "1f456", "1f458", "1f459", "1f4bc", "1f45c", "1f45d", "1f45b", "1f453", "1f380", "1f302", "1f484", "1f49b", "1f499", "1f49c", "1f49a", "2764", "1f494", "1f497", "1f493", "1f495", "1f496", "1f49e", "1f498", "1f48c", "1f48b", "1f48d", "1f48e", "1f464", "1f465", "1f4ac", "1f463", "1f4ad"],
["1f436", "1f43a", "1f431", "1f42d", "1f439", "1f430", "1f438", "1f42f", "1f428", "1f43b", "1f437", "1f43d", "1f42e", "1f417", "1f435", "1f412", "1f434", "1f411", "1f418", "1f43c", "1f427", "1f426", "1f424", "1f425", "1f423", "1f414", "1f40d", "1f422", "1f41b", "1f41d", "1f41c", "1f41e", "1f40c", "1f419", "1f41a", "1f420", "1f41f", "1f42c", "1f433", "1f40b", "1f404", "1f40f", "1f400", "1f403", "1f405", "1f407", "1f409", "1f40e", "1f410", "1f413", "1f415", "1f416", "1f401", "1f402", "1f432", "1f421", "1f40a", "1f42b", "1f42a", "1f406", "1f408", "1f429", "1f43e", "1f490", "1f338", "1f337", "1f340", "1f339", "1f33b", "1f33a", "1f341", "1f343", "1f342", "1f33f", "1f33e", "1f344", "1f335", "1f334", "1f332", "1f333", "1f330", "1f331", "1f33c", "1f310", "1f31e", "1f31d", "1f31a", "1f311", "1f312", "1f313", "1f314", "1f315", "1f316", "1f317", "1f318", "1f31c", "1f31b", "1f319", "1f30d", "1f30e", "1f30f", "1f30b", "1f30c", "1f320", "2b50", "2600", "26c5", "2601", "26a1", "2614", "2744", "26c4", "1f300", "1f301", "1f308", "1f30a"],
["1f38d", "1f49d", "1f38e", "1f392", "1f393", "1f38f", "1f386", "1f387", "1f390", "1f391", "1f383", "1f47b", "1f385", "1f384", "1f381", "1f38b", "1f389", "1f38a", "1f388", "1f38c", "1f52e", "1f3a5", "1f4f7", "1f4f9", "1f4fc", "1f4bf", "1f4c0", "1f4bd", "1f4be", "1f4bb", "1f4f1", "260e", "1f4de", "1f4df", "1f4e0", "1f4e1", "1f4fa", "1f4fb", "1f50a", "1f509", "1f508", "1f507", "1f514", "1f515", "1f4e3", "1f4e2", "23f3", "231b", "23f0", "231a", "1f513", "1f512", "1f50f", "1f510", "1f511", "1f50e", "1f4a1", "1f526", "1f506", "1f505", "1f50c", "1f50b", "1f50d", "1f6c0", "1f6c1", "1f6bf", "1f6bd", "1f527", "1f529", "1f528", "1f6aa", "1f6ac", "1f4a3", "1f52b", "1f52a", "1f48a", "1f489", "1f4b0", "1f4b4", "1f4b5", "1f4b7", "1f4b6", "1f4b3", "1f4b8", "1f4f2", "1f4e7", "1f4e5", "1f4e4", "2709", "1f4e9", "1f4e8", "1f4ef", "1f4eb", "1f4ea", "1f4ec", "1f4ed", "1f4ee", "1f4e6", "1f4dd", "1f4c4", "1f4c3", "1f4d1", "1f4ca", "1f4c8", "1f4c9", "1f4dc", "1f4cb", "1f4c5", "1f4c6", "1f4c7", "1f4c1", "1f4c2", "2702", "1f4cc", "1f4ce", "2712", "270f", "1f4cf", "1f4d0", "1f4d5", "1f4d7", "1f4d8", "1f4d9", "1f4d3", "1f4d4", "1f4d2", "1f4da", "1f4d6", "1f516", "1f4db", "1f52c", "1f52d", "1f4f0", "1f3a8", "1f3ac", "1f3a4", "1f3a7", "1f3bc", "1f3b5", "1f3b6", "1f3b9", "1f3bb", "1f3ba", "1f3b7", "1f3b8", "1f47e", "1f3ae", "1f0cf", "1f3b4", "1f004", "1f3b2", "1f3af", "1f3c8", "1f3c0", "26bd", "26be", "1f3be", "1f3b1", "1f3c9", "1f3b3", "26f3", "1f6b5", "1f6b4", "1f3c1", "1f3c7", "1f3c6", "1f3bf", "1f3c2", "1f3ca", "1f3c4", "1f3a3", "2615", "1f375", "1f376", "1f37c", "1f37a", "1f37b", "1f378", "1f379", "1f377", "1f374", "1f355", "1f354", "1f35f", "1f357", "1f356", "1f35d", "1f35b", "1f364", "1f371", "1f363", "1f365", "1f359", "1f358", "1f35a", "1f35c", "1f372", "1f362", "1f361", "1f373", "1f35e", "1f369", "1f36e", "1f366", "1f368", "1f367", "1f382", "1f370", "1f36a", "1f36b", "1f36c", "1f36d", "1f36f", "1f34e", "1f34f", "1f34a", "1f34b", "1f352", "1f347", "1f349", "1f353", "1f351", "1f348", "1f34c", "1f350", "1f34d", "1f360", "1f346", "1f345", "1f33d"],
["1f3e0", "1f3e1", "1f3eb", "1f3e2", "1f3e3", "1f3e5", "1f3e6", "1f3ea", "1f3e9", "1f3e8", "1f492", "26ea", "1f3ec", "1f3e4", "1f307", "1f306", "1f3ef", "1f3f0", "26fa", "1f3ed", "1f5fc", "1f5fe", "1f5fb", "1f304", "1f305", "1f303", "1f5fd", "1f309", "1f3a0", "1f3a1", "26f2", "1f3a2", "1f6a2", "26f5", "1f6a4", "1f6a3", "2693", "1f680", "2708", "1f4ba", "1f681", "1f682", "1f68a", "1f689", "1f69e", "1f686", "1f684", "1f685", "1f688", "1f687", "1f69d", "1f683", "1f68b", "1f68e", "1f68c", "1f68d", "1f699", "1f698", "1f697", "1f695", "1f696", "1f69b", "1f69a", "1f6a8", "1f693", "1f694", "1f692", "1f691", "1f690", "1f6b2", "1f6a1", "1f69f", "1f6a0", "1f69c", "1f488", "1f68f", "1f3ab", "1f6a6", "1f6a5", "26a0", "1f6a7", "1f530", "26fd", "1f3ee", "1f3b0", "2668", "1f5ff", "1f3aa", "1f3ad", "1f4cd", "1f6a9", "1f1ef-1f1f5", "1f1f0-1f1f7", "1f1e9-1f1ea", "1f1e8-1f1f3", "1f1fa-1f1f8", "1f1eb-1f1f7", "1f1ea-1f1f8", "1f1ee-1f1f9", "1f1f7-1f1fa", "1f1ec-1f1e7"],
["0031", "0032", "0033", "0034", "0035", "0036", "0037", "0038", "0039", "0030", "1f51f", "1f522", "0023", "1f523", "2b06", "2b07", "2b05", "27a1", "1f520", "1f521", "1f524", "2197", "2196", "2198", "2199", "2194", "2195", "1f504", "25c0", "25b6", "1f53c", "1f53d", "21a9", "21aa", "2139", "23ea", "23e9", "23eb", "23ec", "2935", "2934", "1f197", "1f500", "1f501", "1f502", "1f195", "1f199", "1f192", "1f193", "1f196", "1f4f6", "1f3a6", "1f201", "1f22f", "1f233", "1f235", "1f234", "1f232", "1f250", "1f239", "1f23a", "1f236", "1f21a", "1f6bb", "1f6b9", "1f6ba", "1f6bc", "1f6be", "1f6b0", "1f6ae", "1f17f", "267f", "1f6ad", "1f237", "1f238", "1f202", "24c2", "1f6c2", "1f6c4", "1f6c5", "1f6c3", "1f251", "3299", "3297", "1f191", "1f198", "1f194", "1f6ab", "1f51e", "1f4f5", "1f6af", "1f6b1", "1f6b3", "1f6b7", "1f6b8", "26d4", "2733", "2747", "274e", "2705", "2734", "1f49f", "1f19a", "1f4f3", "1f4f4", "1f170", "1f171", "1f18e", "1f17e", "1f4a0", "27bf", "267b", "2648", "2649", "264a", "264b", "264c", "264d", "264e", "264f", "2650", "2651", "2652", "2653", "26ce", "1f52f", "1f3e7", "1f4b9", "1f4b2", "1f4b1", "00a9", "00ae", "2122", "274c", "203c", "2049", "2757", "2753", "2755", "2754", "2b55", "1f51d", "1f51a", "1f519", "1f51b", "1f51c", "1f503", "1f55b", "1f567", "1f550", "1f55c", "1f551", "1f55d", "1f552", "1f55e", "1f553", "1f55f", "1f554", "1f560", "1f555", "1f556", "1f557", "1f558", "1f559", "1f55a", "1f561", "1f562", "1f563", "1f564", "1f565", "1f566", "2716", "2795", "2796", "2797", "2660", "2665", "2663", "2666", "1f4ae", "1f4af", "2714", "2611", "1f518", "1f517", "27b0", "3030", "303d", "1f531", "25fc", "25fb", "25fe", "25fd", "25aa", "25ab", "1f53a", "1f532", "1f533", "26ab", "26aa", "1f534", "1f535", "1f53b", "2b1c", "2b1b", "1f536", "1f537", "1f538", "1f539"]
];



Config.EmojiCategorySpritesheetDimens = [
[7, 27],
[4, 29],
[7, 33],
[3, 34],
[7, 34]
];


Config.emoji_data = {
  "00a9": [
  ["\u00A9"], "\uE24E", "\uDBBA\uDF29", ["copyright"], 0, 0
  ],
  "00ae": [
  ["\u00AE"], "\uE24F", "\uDBBA\uDF2D", ["registered"], 0, 1
  ],
  "203c": [
  ["\u203C\uFE0F", "\u203C"], "", "\uDBBA\uDF06", ["bangbang"], 0, 2
  ],
  "2049": [
  ["\u2049\uFE0F", "\u2049"], "", "\uDBBA\uDF05", ["interrobang"], 0, 3
  ],
  "2122": [
  ["\u2122"], "\uE537", "\uDBBA\uDF2A", ["tm"], 0, 4
  ],
  "2139": [
  ["\u2139\uFE0F", "\u2139"], "", "\uDBBA\uDF47", ["information_source"], 0, 5
  ],
  "2194": [
  ["\u2194\uFE0F", "\u2194"], "", "\uDBBA\uDEF6", ["left_right_arrow"], 0, 6
  ],
  "2195": [
  ["\u2195\uFE0F", "\u2195"], "", "\uDBBA\uDEF7", ["arrow_up_down"], 0, 7
  ],
  "2196": [
  ["\u2196\uFE0F", "\u2196"], "\uE237", "\uDBBA\uDEF2", ["arrow_upper_left"], 0, 8
  ],
  "2197": [
  ["\u2197\uFE0F", "\u2197"], "\uE236", "\uDBBA\uDEF0", ["arrow_upper_right"], 0, 9
  ],
  "2198": [
  ["\u2198\uFE0F", "\u2198"], "\uE238", "\uDBBA\uDEF1", ["arrow_lower_right"], 0, 10
  ],
  "2199": [
  ["\u2199\uFE0F", "\u2199"], "\uE239", "\uDBBA\uDEF3", ["arrow_lower_left"], 0, 11
  ],
  "21a9": [
  ["\u21A9\uFE0F", "\u21A9"], "", "\uDBBA\uDF83", ["leftwards_arrow_with_hook"], 0, 12
  ],
  "21aa": [
  ["\u21AA\uFE0F", "\u21AA"], "", "\uDBBA\uDF88", ["arrow_right_hook"], 0, 13
  ],
  "231a": [
  ["\u231A\uFE0F", "\u231A"], "", "\uDBB8\uDC1D", ["watch"], 0, 14
  ],
  "231b": [
  ["\u231B\uFE0F", "\u231B"], "", "\uDBB8\uDC1C", ["hourglass"], 0, 15
  ],
  "23e9": [
  ["\u23E9"], "\uE23C", "\uDBBA\uDEFE", ["fast_forward"], 0, 16
  ],
  "23ea": [
  ["\u23EA"], "\uE23D", "\uDBBA\uDEFF", ["rewind"], 0, 17
  ],
  "23eb": [
  ["\u23EB"], "", "\uDBBA\uDF03", ["arrow_double_up"], 0, 18
  ],
  "23ec": [
  ["\u23EC"], "", "\uDBBA\uDF02", ["arrow_double_down"], 0, 19
  ],
  "23f0": [
  ["\u23F0"], "\uE02D", "\uDBB8\uDC2A", ["alarm_clock"], 0, 20
  ],
  "23f3": [
  ["\u23F3"], "", "\uDBB8\uDC1B", ["hourglass_flowing_sand"], 0, 21
  ],
  "24c2": [
  ["\u24C2\uFE0F", "\u24C2"], "\uE434", "\uDBB9\uDFE1", ["m"], 0, 22
  ],
  "25aa": [
  ["\u25AA\uFE0F", "\u25AA"], "\uE21A", "\uDBBA\uDF6E", ["black_small_square"], 0, 23
  ],
  "25ab": [
  ["\u25AB\uFE0F", "\u25AB"], "\uE21B", "\uDBBA\uDF6D", ["white_small_square"], 0, 24
  ],
  "25b6": [
  ["\u25B6\uFE0F", "\u25B6"], "\uE23A", "\uDBBA\uDEFC", ["arrow_forward"], 0, 25
  ],
  "25c0": [
  ["\u25C0\uFE0F", "\u25C0"], "\uE23B", "\uDBBA\uDEFD", ["arrow_backward"], 0, 26
  ],
  "25fb": [
  ["\u25FB\uFE0F", "\u25FB"], "\uE21B", "\uDBBA\uDF71", ["white_medium_square"], 0, 27
  ],
  "25fc": [
  ["\u25FC\uFE0F", "\u25FC"], "\uE21A", "\uDBBA\uDF72", ["black_medium_square"], 0, 28
  ],
  "25fd": [
  ["\u25FD\uFE0F", "\u25FD"], "\uE21B", "\uDBBA\uDF6F", ["white_medium_small_square"], 0, 29
  ],
  "25fe": [
  ["\u25FE\uFE0F", "\u25FE"], "\uE21A", "\uDBBA\uDF70", ["black_medium_small_square"], 1, 0
  ],
  "2600": [
  ["\u2600\uFE0F", "\u2600"], "\uE04A", "\uDBB8\uDC00", ["sunny"], 1, 1
  ],
  "2601": [
  ["\u2601\uFE0F", "\u2601"], "\uE049", "\uDBB8\uDC01", ["cloud"], 1, 2
  ],
  "260e": [
  ["\u260E\uFE0F", "\u260E"], "\uE009", "\uDBB9\uDD23", ["phone", "telephone"], 1, 3
  ],
  "2611": [
  ["\u2611\uFE0F", "\u2611"], "", "\uDBBA\uDF8B", ["ballot_box_with_check"], 1, 4
  ],
  "2614": [
  ["\u2614\uFE0F", "\u2614"], "\uE04B", "\uDBB8\uDC02", ["umbrella"], 1, 5
  ],
  "2615": [
  ["\u2615\uFE0F", "\u2615"], "\uE045", "\uDBBA\uDD81", ["coffee"], 1, 6
  ],
  "261d": [
  ["\u261D\uFE0F", "\u261D"], "\uE00F", "\uDBBA\uDF98", ["point_up"], 1, 7
  ],
  "263a": [
  ["\u263A\uFE0F", "\u263A"], "\uE414", "\uDBB8\uDF36", ["relaxed"], 1, 8
  ],
  "2648": [
  ["\u2648\uFE0F", "\u2648"], "\uE23F", "\uDBB8\uDC2B", ["aries"], 1, 9
  ],
  "2649": [
  ["\u2649\uFE0F", "\u2649"], "\uE240", "\uDBB8\uDC2C", ["taurus"], 1, 10
  ],
  "264a": [
  ["\u264A\uFE0F", "\u264A"], "\uE241", "\uDBB8\uDC2D", ["gemini"], 1, 11
  ],
  "264b": [
  ["\u264B\uFE0F", "\u264B"], "\uE242", "\uDBB8\uDC2E", ["cancer"], 1, 12
  ],
  "264c": [
  ["\u264C\uFE0F", "\u264C"], "\uE243", "\uDBB8\uDC2F", ["leo"], 1, 13
  ],
  "264d": [
  ["\u264D\uFE0F", "\u264D"], "\uE244", "\uDBB8\uDC30", ["virgo"], 1, 14
  ],
  "264e": [
  ["\u264E\uFE0F", "\u264E"], "\uE245", "\uDBB8\uDC31", ["libra"], 1, 15
  ],
  "264f": [
  ["\u264F\uFE0F", "\u264F"], "\uE246", "\uDBB8\uDC32", ["scorpius"], 1, 16
  ],
  "2650": [
  ["\u2650\uFE0F", "\u2650"], "\uE247", "\uDBB8\uDC33", ["sagittarius"], 1, 17
  ],
  "2651": [
  ["\u2651\uFE0F", "\u2651"], "\uE248", "\uDBB8\uDC34", ["capricorn"], 1, 18
  ],
  "2652": [
  ["\u2652\uFE0F", "\u2652"], "\uE249", "\uDBB8\uDC35", ["aquarius"], 1, 19
  ],
  "2653": [
  ["\u2653\uFE0F", "\u2653"], "\uE24A", "\uDBB8\uDC36", ["pisces"], 1, 20
  ],
  "2660": [
  ["\u2660\uFE0F", "\u2660"], "\uE20E", "\uDBBA\uDF1B", ["spades"], 1, 21
  ],
  "2663": [
  ["\u2663\uFE0F", "\u2663"], "\uE20F", "\uDBBA\uDF1D", ["clubs"], 1, 22
  ],
  "2665": [
  ["\u2665\uFE0F", "\u2665"], "\uE20C", "\uDBBA\uDF1A", ["hearts"], 1, 23
  ],
  "2666": [
  ["\u2666\uFE0F", "\u2666"], "\uE20D", "\uDBBA\uDF1C", ["diamonds"], 1, 24
  ],
  "2668": [
  ["\u2668\uFE0F", "\u2668"], "\uE123", "\uDBB9\uDFFA", ["hotsprings"], 1, 25
  ],
  "267b": [
  ["\u267B\uFE0F", "\u267B"], "", "\uDBBA\uDF2C", ["recycle"], 1, 26
  ],
  "267f": [
  ["\u267F\uFE0F", "\u267F"], "\uE20A", "\uDBBA\uDF20", ["wheelchair"], 1, 27
  ],
  "2693": [
  ["\u2693\uFE0F", "\u2693"], "\uE202", "\uDBB9\uDCC1", ["anchor"], 1, 28
  ],
  "26a0": [
  ["\u26A0\uFE0F", "\u26A0"], "\uE252", "\uDBBA\uDF23", ["warning"], 1, 29
  ],
  "26a1": [
  ["\u26A1\uFE0F", "\u26A1"], "\uE13D", "\uDBB8\uDC04", ["zap"], 2, 0
  ],
  "26aa": [
  ["\u26AA\uFE0F", "\u26AA"], "\uE219", "\uDBBA\uDF65", ["white_circle"], 2, 1
  ],
  "26ab": [
  ["\u26AB\uFE0F", "\u26AB"], "\uE219", "\uDBBA\uDF66", ["black_circle"], 2, 2
  ],
  "26bd": [
  ["\u26BD\uFE0F", "\u26BD"], "\uE018", "\uDBB9\uDFD4", ["soccer"], 2, 3
  ],
  "26be": [
  ["\u26BE\uFE0F", "\u26BE"], "\uE016", "\uDBB9\uDFD1", ["baseball"], 2, 4
  ],
  "26c4": [
  ["\u26C4\uFE0F", "\u26C4"], "\uE048", "\uDBB8\uDC03", ["snowman"], 2, 5
  ],
  "26c5": [
  ["\u26C5\uFE0F", "\u26C5"], "\uE04A\uE049", "\uDBB8\uDC0F", ["partly_sunny"], 2, 6
  ],
  "26ce": [
  ["\u26CE"], "\uE24B", "\uDBB8\uDC37", ["ophiuchus"], 2, 7
  ],
  "26d4": [
  ["\u26D4\uFE0F", "\u26D4"], "\uE137", "\uDBBA\uDF26", ["no_entry"], 2, 8
  ],
  "26ea": [
  ["\u26EA\uFE0F", "\u26EA"], "\uE037", "\uDBB9\uDCBB", ["church"], 2, 9
  ],
  "26f2": [
  ["\u26F2\uFE0F", "\u26F2"], "\uE121", "\uDBB9\uDCBC", ["fountain"], 2, 10
  ],
  "26f3": [
  ["\u26F3\uFE0F", "\u26F3"], "\uE014", "\uDBB9\uDFD2", ["golf"], 2, 11
  ],
  "26f5": [
  ["\u26F5\uFE0F", "\u26F5"], "\uE01C", "\uDBB9\uDFEA", ["boat", "sailboat"], 2, 12
  ],
  "26fa": [
  ["\u26FA\uFE0F", "\u26FA"], "\uE122", "\uDBB9\uDFFB", ["tent"], 2, 13
  ],
  "26fd": [
  ["\u26FD\uFE0F", "\u26FD"], "\uE03A", "\uDBB9\uDFF5", ["fuelpump"], 2, 14
  ],
  "2702": [
  ["\u2702\uFE0F", "\u2702"], "\uE313", "\uDBB9\uDD3E", ["scissors"], 2, 15
  ],
  "2705": [
  ["\u2705"], "", "\uDBBA\uDF4A", ["white_check_mark"], 2, 16
  ],
  "2708": [
  ["\u2708\uFE0F", "\u2708"], "\uE01D", "\uDBB9\uDFE9", ["airplane"], 2, 17
  ],
  "2709": [
  ["\u2709\uFE0F", "\u2709"], "\uE103", "\uDBB9\uDD29", ["email", "envelope"], 2, 18
  ],
  "270a": [
  ["\u270A"], "\uE010", "\uDBBA\uDF93", ["fist"], 2, 19
  ],
  "270b": [
  ["\u270B"], "\uE012", "\uDBBA\uDF95", ["hand", "raised_hand"], 2, 20
  ],
  "270c": [
  ["\u270C\uFE0F", "\u270C"], "\uE011", "\uDBBA\uDF94", ["v"], 2, 21
  ],
  "270f": [
  ["\u270F\uFE0F", "\u270F"], "\uE301", "\uDBB9\uDD39", ["pencil2"], 2, 22
  ],
  "2712": [
  ["\u2712\uFE0F", "\u2712"], "", "\uDBB9\uDD36", ["black_nib"], 2, 23
  ],
  "2714": [
  ["\u2714\uFE0F", "\u2714"], "", "\uDBBA\uDF49", ["heavy_check_mark"], 2, 24
  ],
  "2716": [
  ["\u2716\uFE0F", "\u2716"], "\uE333", "\uDBBA\uDF53", ["heavy_multiplication_x"], 2, 25
  ],
  "2728": [
  ["\u2728"], "\uE32E", "\uDBBA\uDF60", ["sparkles"], 2, 26
  ],
  "2733": [
  ["\u2733\uFE0F", "\u2733"], "\uE206", "\uDBBA\uDF62", ["eight_spoked_asterisk"], 2, 27
  ],
  "2734": [
  ["\u2734\uFE0F", "\u2734"], "\uE205", "\uDBBA\uDF61", ["eight_pointed_black_star"], 2, 28
  ],
  "2744": [
  ["\u2744\uFE0F", "\u2744"], "", "\uDBB8\uDC0E", ["snowflake"], 2, 29
  ],
  "2747": [
  ["\u2747\uFE0F", "\u2747"], "\uE32E", "\uDBBA\uDF77", ["sparkle"], 3, 0
  ],
  "274c": [
  ["\u274C"], "\uE333", "\uDBBA\uDF45", ["x"], 3, 1
  ],
  "274e": [
  ["\u274E"], "\uE333", "\uDBBA\uDF46", ["negative_squared_cross_mark"], 3, 2
  ],
  "2753": [
  ["\u2753"], "\uE020", "\uDBBA\uDF09", ["question"], 3, 3
  ],
  "2754": [
  ["\u2754"], "\uE336", "\uDBBA\uDF0A", ["grey_question"], 3, 4
  ],
  "2755": [
  ["\u2755"], "\uE337", "\uDBBA\uDF0B", ["grey_exclamation"], 3, 5
  ],
  "2757": [
  ["\u2757\uFE0F", "\u2757"], "\uE021", "\uDBBA\uDF04", ["exclamation", "heavy_exclamation_mark"], 3, 6
  ],
  "2764": [
  ["\u2764\uFE0F", "\u2764"], "\uE022", "\uDBBA\uDF0C", ["heart"], 3, 7, "<3"
  ],
  "2795": [
  ["\u2795"], "", "\uDBBA\uDF51", ["heavy_plus_sign"], 3, 8
  ],
  "2796": [
  ["\u2796"], "", "\uDBBA\uDF52", ["heavy_minus_sign"], 3, 9
  ],
  "2797": [
  ["\u2797"], "", "\uDBBA\uDF54", ["heavy_division_sign"], 3, 10
  ],
  "27a1": [
  ["\u27A1\uFE0F", "\u27A1"], "\uE234", "\uDBBA\uDEFA", ["arrow_right"], 3, 11
  ],
  "27b0": [
  ["\u27B0"], "", "\uDBBA\uDF08", ["curly_loop"], 3, 12
  ],
  "27bf": [
  ["\u27BF"], "\uE211", "\uDBBA\uDC2B", ["loop"], 3, 13
  ],
  "2934": [
  ["\u2934\uFE0F", "\u2934"], "\uE236", "\uDBBA\uDEF4", ["arrow_heading_up"], 3, 14
  ],
  "2935": [
  ["\u2935\uFE0F", "\u2935"], "\uE238", "\uDBBA\uDEF5", ["arrow_heading_down"], 3, 15
  ],
  "2b05": [
  ["\u2B05\uFE0F", "\u2B05"], "\uE235", "\uDBBA\uDEFB", ["arrow_left"], 3, 16
  ],
  "2b06": [
  ["\u2B06\uFE0F", "\u2B06"], "\uE232", "\uDBBA\uDEF8", ["arrow_up"], 3, 17
  ],
  "2b07": [
  ["\u2B07\uFE0F", "\u2B07"], "\uE233", "\uDBBA\uDEF9", ["arrow_down"], 3, 18
  ],
  "2b1b": [
  ["\u2B1B\uFE0F", "\u2B1B"], "\uE21A", "\uDBBA\uDF6C", ["black_large_square"], 3, 19
  ],
  "2b1c": [
  ["\u2B1C\uFE0F", "\u2B1C"], "\uE21B", "\uDBBA\uDF6B", ["white_large_square"], 3, 20
  ],
  "2b50": [
  ["\u2B50\uFE0F", "\u2B50"], "\uE32F", "\uDBBA\uDF68", ["star"], 3, 21
  ],
  "2b55": [
  ["\u2B55\uFE0F", "\u2B55"], "\uE332", "\uDBBA\uDF44", ["o"], 3, 22
  ],
  "3030": [
  ["\u3030"], "", "\uDBBA\uDF07", ["wavy_dash"], 3, 23
  ],
  "303d": [
  ["\u303D\uFE0F", "\u303D"], "\uE12C", "\uDBBA\uDC1B", ["part_alternation_mark"], 3, 24
  ],
  "3297": [
  ["\u3297\uFE0F", "\u3297"], "\uE30D", "\uDBBA\uDF43", ["congratulations"], 3, 25
  ],
  "3299": [
  ["\u3299\uFE0F", "\u3299"], "\uE315", "\uDBBA\uDF2B", ["secret"], 3, 26
  ],
  "1f004": [
  ["\uD83C\uDC04\uFE0F", "\uD83C\uDC04"], "\uE12D", "\uDBBA\uDC0B", ["mahjong"], 3, 27
  ],
  "1f0cf": [
  ["\uD83C\uDCCF"], "", "\uDBBA\uDC12", ["black_joker"], 3, 28
  ],
  "1f170": [
  ["\uD83C\uDD70"], "\uE532", "\uDBB9\uDD0B", ["a"], 3, 29
  ],
  "1f171": [
  ["\uD83C\uDD71"], "\uE533", "\uDBB9\uDD0C", ["b"], 4, 0
  ],
  "1f17e": [
  ["\uD83C\uDD7E"], "\uE535", "\uDBB9\uDD0E", ["o2"], 4, 1
  ],
  "1f17f": [
  ["\uD83C\uDD7F\uFE0F", "\uD83C\uDD7F"], "\uE14F", "\uDBB9\uDFF6", ["parking"], 4, 2
  ],
  "1f18e": [
  ["\uD83C\uDD8E"], "\uE534", "\uDBB9\uDD0D", ["ab"], 4, 3
  ],
  "1f191": [
  ["\uD83C\uDD91"], "", "\uDBBA\uDF84", ["cl"], 4, 4
  ],
  "1f192": [
  ["\uD83C\uDD92"], "\uE214", "\uDBBA\uDF38", ["cool"], 4, 5
  ],
  "1f193": [
  ["\uD83C\uDD93"], "", "\uDBBA\uDF21", ["free"], 4, 6
  ],
  "1f194": [
  ["\uD83C\uDD94"], "\uE229", "\uDBBA\uDF81", ["id"], 4, 7
  ],
  "1f195": [
  ["\uD83C\uDD95"], "\uE212", "\uDBBA\uDF36", ["new"], 4, 8
  ],
  "1f196": [
  ["\uD83C\uDD96"], "", "\uDBBA\uDF28", ["ng"], 4, 9
  ],
  "1f197": [
  ["\uD83C\uDD97"], "\uE24D", "\uDBBA\uDF27", ["ok"], 4, 10
  ],
  "1f198": [
  ["\uD83C\uDD98"], "", "\uDBBA\uDF4F", ["sos"], 4, 11
  ],
  "1f199": [
  ["\uD83C\uDD99"], "\uE213", "\uDBBA\uDF37", ["up"], 4, 12
  ],
  "1f19a": [
  ["\uD83C\uDD9A"], "\uE12E", "\uDBBA\uDF32", ["vs"], 4, 13
  ],
  "1f201": [
  ["\uD83C\uDE01"], "\uE203", "\uDBBA\uDF24", ["koko"], 4, 14
  ],
  "1f202": [
  ["\uD83C\uDE02"], "\uE228", "\uDBBA\uDF3F", ["sa"], 4, 15
  ],
  "1f21a": [
  ["\uD83C\uDE1A\uFE0F", "\uD83C\uDE1A"], "\uE216", "\uDBBA\uDF3A", ["u7121"], 4, 16
  ],
  "1f22f": [
  ["\uD83C\uDE2F\uFE0F", "\uD83C\uDE2F"], "\uE22C", "\uDBBA\uDF40", ["u6307"], 4, 17
  ],
  "1f232": [
  ["\uD83C\uDE32"], "", "\uDBBA\uDF2E", ["u7981"], 4, 18
  ],
  "1f233": [
  ["\uD83C\uDE33"], "\uE22B", "\uDBBA\uDF2F", ["u7a7a"], 4, 19
  ],
  "1f234": [
  ["\uD83C\uDE34"], "", "\uDBBA\uDF30", ["u5408"], 4, 20
  ],
  "1f235": [
  ["\uD83C\uDE35"], "\uE22A", "\uDBBA\uDF31", ["u6e80"], 4, 21
  ],
  "1f236": [
  ["\uD83C\uDE36"], "\uE215", "\uDBBA\uDF39", ["u6709"], 4, 22
  ],
  "1f237": [
  ["\uD83C\uDE37"], "\uE217", "\uDBBA\uDF3B", ["u6708"], 4, 23
  ],
  "1f238": [
  ["\uD83C\uDE38"], "\uE218", "\uDBBA\uDF3C", ["u7533"], 4, 24
  ],
  "1f239": [
  ["\uD83C\uDE39"], "\uE227", "\uDBBA\uDF3E", ["u5272"], 4, 25
  ],
  "1f23a": [
  ["\uD83C\uDE3A"], "\uE22D", "\uDBBA\uDF41", ["u55b6"], 4, 26
  ],
  "1f250": [
  ["\uD83C\uDE50"], "\uE226", "\uDBBA\uDF3D", ["ideograph_advantage"], 4, 27
  ],
  "1f251": [
  ["\uD83C\uDE51"], "", "\uDBBA\uDF50", ["accept"], 4, 28
  ],
  "1f300": [
  ["\uD83C\uDF00"], "\uE443", "\uDBB8\uDC05", ["cyclone"], 4, 29
  ],
  "1f301": [
  ["\uD83C\uDF01"], "", "\uDBB8\uDC06", ["foggy"], 5, 0
  ],
  "1f302": [
  ["\uD83C\uDF02"], "\uE43C", "\uDBB8\uDC07", ["closed_umbrella"], 5, 1
  ],
  "1f303": [
  ["\uD83C\uDF03"], "\uE44B", "\uDBB8\uDC08", ["night_with_stars"], 5, 2
  ],
  "1f304": [
  ["\uD83C\uDF04"], "\uE04D", "\uDBB8\uDC09", ["sunrise_over_mountains"], 5, 3
  ],
  "1f305": [
  ["\uD83C\uDF05"], "\uE449", "\uDBB8\uDC0A", ["sunrise"], 5, 4
  ],
  "1f306": [
  ["\uD83C\uDF06"], "\uE146", "\uDBB8\uDC0B", ["city_sunset"], 5, 5
  ],
  "1f307": [
  ["\uD83C\uDF07"], "\uE44A", "\uDBB8\uDC0C", ["city_sunrise"], 5, 6
  ],
  "1f308": [
  ["\uD83C\uDF08"], "\uE44C", "\uDBB8\uDC0D", ["rainbow"], 5, 7
  ],
  "1f309": [
  ["\uD83C\uDF09"], "\uE44B", "\uDBB8\uDC10", ["bridge_at_night"], 5, 8
  ],
  "1f30a": [
  ["\uD83C\uDF0A"], "\uE43E", "\uDBB8\uDC38", ["ocean"], 5, 9
  ],
  "1f30b": [
  ["\uD83C\uDF0B"], "", "\uDBB8\uDC3A", ["volcano"], 5, 10
  ],
  "1f30c": [
  ["\uD83C\uDF0C"], "\uE44B", "\uDBB8\uDC3B", ["milky_way"], 5, 11
  ],
  "1f30d": [
  ["\uD83C\uDF0D"], "", "", ["earth_africa"], 5, 12
  ],
  "1f30e": [
  ["\uD83C\uDF0E"], "", "", ["earth_americas"], 5, 13
  ],
  "1f30f": [
  ["\uD83C\uDF0F"], "", "\uDBB8\uDC39", ["earth_asia"], 5, 14
  ],
  "1f310": [
  ["\uD83C\uDF10"], "", "", ["globe_with_meridians"], 5, 15
  ],
  "1f311": [
  ["\uD83C\uDF11"], "", "\uDBB8\uDC11", ["new_moon"], 5, 16
  ],
  "1f312": [
  ["\uD83C\uDF12"], "", "", ["waxing_crescent_moon"], 5, 17
  ],
  "1f313": [
  ["\uD83C\uDF13"], "\uE04C", "\uDBB8\uDC13", ["first_quarter_moon"], 5, 18
  ],
  "1f314": [
  ["\uD83C\uDF14"], "\uE04C", "\uDBB8\uDC12", ["moon", "waxing_gibbous_moon"], 5, 19
  ],
  "1f315": [
  ["\uD83C\uDF15"], "", "\uDBB8\uDC15", ["full_moon"], 5, 20
  ],
  "1f316": [
  ["\uD83C\uDF16"], "", "", ["waning_gibbous_moon"], 5, 21
  ],
  "1f317": [
  ["\uD83C\uDF17"], "", "", ["last_quarter_moon"], 5, 22
  ],
  "1f318": [
  ["\uD83C\uDF18"], "", "", ["waning_crescent_moon"], 5, 23
  ],
  "1f319": [
  ["\uD83C\uDF19"], "\uE04C", "\uDBB8\uDC14", ["crescent_moon"], 5, 24
  ],
  "1f31a": [
  ["\uD83C\uDF1A"], "", "", ["new_moon_with_face"], 5, 25
  ],
  "1f31b": [
  ["\uD83C\uDF1B"], "\uE04C", "\uDBB8\uDC16", ["first_quarter_moon_with_face"], 5, 26
  ],
  "1f31c": [
  ["\uD83C\uDF1C"], "", "", ["last_quarter_moon_with_face"], 5, 27
  ],
  "1f31d": [
  ["\uD83C\uDF1D"], "", "", ["full_moon_with_face"], 5, 28
  ],
  "1f31e": [
  ["\uD83C\uDF1E"], "", "", ["sun_with_face"], 5, 29
  ],
  "1f31f": [
  ["\uD83C\uDF1F"], "\uE335", "\uDBBA\uDF69", ["star2"], 6, 0
  ],
  "1f320": [
  ["\uD83C\uDF20"], "", "\uDBBA\uDF6A", ["stars"], 6, 1
  ],
  "1f330": [
  ["\uD83C\uDF30"], "", "\uDBB8\uDC4C", ["chestnut"], 6, 2
  ],
  "1f331": [
  ["\uD83C\uDF31"], "\uE110", "\uDBB8\uDC3E", ["seedling"], 6, 3
  ],
  "1f332": [
  ["\uD83C\uDF32"], "", "", ["evergreen_tree"], 6, 4
  ],
  "1f333": [
  ["\uD83C\uDF33"], "", "", ["deciduous_tree"], 6, 5
  ],
  "1f334": [
  ["\uD83C\uDF34"], "\uE307", "\uDBB8\uDC47", ["palm_tree"], 6, 6
  ],
  "1f335": [
  ["\uD83C\uDF35"], "\uE308", "\uDBB8\uDC48", ["cactus"], 6, 7
  ],
  "1f337": [
  ["\uD83C\uDF37"], "\uE304", "\uDBB8\uDC3D", ["tulip"], 6, 8
  ],
  "1f338": [
  ["\uD83C\uDF38"], "\uE030", "\uDBB8\uDC40", ["cherry_blossom"], 6, 9
  ],
  "1f339": [
  ["\uD83C\uDF39"], "\uE032", "\uDBB8\uDC41", ["rose"], 6, 10
  ],
  "1f33a": [
  ["\uD83C\uDF3A"], "\uE303", "\uDBB8\uDC45", ["hibiscus"], 6, 11
  ],
  "1f33b": [
  ["\uD83C\uDF3B"], "\uE305", "\uDBB8\uDC46", ["sunflower"], 6, 12
  ],
  "1f33c": [
  ["\uD83C\uDF3C"], "\uE305", "\uDBB8\uDC4D", ["blossom"], 6, 13
  ],
  "1f33d": [
  ["\uD83C\uDF3D"], "", "\uDBB8\uDC4A", ["corn"], 6, 14
  ],
  "1f33e": [
  ["\uD83C\uDF3E"], "\uE444", "\uDBB8\uDC49", ["ear_of_rice"], 6, 15
  ],
  "1f33f": [
  ["\uD83C\uDF3F"], "\uE110", "\uDBB8\uDC4E", ["herb"], 6, 16
  ],
  "1f340": [
  ["\uD83C\uDF40"], "\uE110", "\uDBB8\uDC3C", ["four_leaf_clover"], 6, 17
  ],
  "1f341": [
  ["\uD83C\uDF41"], "\uE118", "\uDBB8\uDC3F", ["maple_leaf"], 6, 18
  ],
  "1f342": [
  ["\uD83C\uDF42"], "\uE119", "\uDBB8\uDC42", ["fallen_leaf"], 6, 19
  ],
  "1f343": [
  ["\uD83C\uDF43"], "\uE447", "\uDBB8\uDC43", ["leaves"], 6, 20
  ],
  "1f344": [
  ["\uD83C\uDF44"], "", "\uDBB8\uDC4B", ["mushroom"], 6, 21
  ],
  "1f345": [
  ["\uD83C\uDF45"], "\uE349", "\uDBB8\uDC55", ["tomato"], 6, 22
  ],
  "1f346": [
  ["\uD83C\uDF46"], "\uE34A", "\uDBB8\uDC56", ["eggplant"], 6, 23
  ],
  "1f347": [
  ["\uD83C\uDF47"], "", "\uDBB8\uDC59", ["grapes"], 6, 24
  ],
  "1f348": [
  ["\uD83C\uDF48"], "", "\uDBB8\uDC57", ["melon"], 6, 25
  ],
  "1f349": [
  ["\uD83C\uDF49"], "\uE348", "\uDBB8\uDC54", ["watermelon"], 6, 26
  ],
  "1f34a": [
  ["\uD83C\uDF4A"], "\uE346", "\uDBB8\uDC52", ["tangerine"], 6, 27
  ],
  "1f34b": [
  ["\uD83C\uDF4B"], "", "", ["lemon"], 6, 28
  ],
  "1f34c": [
  ["\uD83C\uDF4C"], "", "\uDBB8\uDC50", ["banana"], 6, 29
  ],
  "1f34d": [
  ["\uD83C\uDF4D"], "", "\uDBB8\uDC58", ["pineapple"], 7, 0
  ],
  "1f34e": [
  ["\uD83C\uDF4E"], "\uE345", "\uDBB8\uDC51", ["apple"], 7, 1
  ],
  "1f34f": [
  ["\uD83C\uDF4F"], "\uE345", "\uDBB8\uDC5B", ["green_apple"], 7, 2
  ],
  "1f350": [
  ["\uD83C\uDF50"], "", "", ["pear"], 7, 3
  ],
  "1f351": [
  ["\uD83C\uDF51"], "", "\uDBB8\uDC5A", ["peach"], 7, 4
  ],
  "1f352": [
  ["\uD83C\uDF52"], "", "\uDBB8\uDC4F", ["cherries"], 7, 5
  ],
  "1f353": [
  ["\uD83C\uDF53"], "\uE347", "\uDBB8\uDC53", ["strawberry"], 7, 6
  ],
  "1f354": [
  ["\uD83C\uDF54"], "\uE120", "\uDBBA\uDD60", ["hamburger"], 7, 7
  ],
  "1f355": [
  ["\uD83C\uDF55"], "", "\uDBBA\uDD75", ["pizza"], 7, 8
  ],
  "1f356": [
  ["\uD83C\uDF56"], "", "\uDBBA\uDD72", ["meat_on_bone"], 7, 9
  ],
  "1f357": [
  ["\uD83C\uDF57"], "", "\uDBBA\uDD76", ["poultry_leg"], 7, 10
  ],
  "1f358": [
  ["\uD83C\uDF58"], "\uE33D", "\uDBBA\uDD69", ["rice_cracker"], 7, 11
  ],
  "1f359": [
  ["\uD83C\uDF59"], "\uE342", "\uDBBA\uDD61", ["rice_ball"], 7, 12
  ],
  "1f35a": [
  ["\uD83C\uDF5A"], "\uE33E", "\uDBBA\uDD6A", ["rice"], 7, 13
  ],
  "1f35b": [
  ["\uD83C\uDF5B"], "\uE341", "\uDBBA\uDD6C", ["curry"], 7, 14
  ],
  "1f35c": [
  ["\uD83C\uDF5C"], "\uE340", "\uDBBA\uDD63", ["ramen"], 7, 15
  ],
  "1f35d": [
  ["\uD83C\uDF5D"], "\uE33F", "\uDBBA\uDD6B", ["spaghetti"], 7, 16
  ],
  "1f35e": [
  ["\uD83C\uDF5E"], "\uE339", "\uDBBA\uDD64", ["bread"], 7, 17
  ],
  "1f35f": [
  ["\uD83C\uDF5F"], "\uE33B", "\uDBBA\uDD67", ["fries"], 7, 18
  ],
  "1f360": [
  ["\uD83C\uDF60"], "", "\uDBBA\uDD74", ["sweet_potato"], 7, 19
  ],
  "1f361": [
  ["\uD83C\uDF61"], "\uE33C", "\uDBBA\uDD68", ["dango"], 7, 20
  ],
  "1f362": [
  ["\uD83C\uDF62"], "\uE343", "\uDBBA\uDD6D", ["oden"], 7, 21
  ],
  "1f363": [
  ["\uD83C\uDF63"], "\uE344", "\uDBBA\uDD6E", ["sushi"], 7, 22
  ],
  "1f364": [
  ["\uD83C\uDF64"], "", "\uDBBA\uDD7F", ["fried_shrimp"], 7, 23
  ],
  "1f365": [
  ["\uD83C\uDF65"], "", "\uDBBA\uDD73", ["fish_cake"], 7, 24
  ],
  "1f366": [
  ["\uD83C\uDF66"], "\uE33A", "\uDBBA\uDD66", ["icecream"], 7, 25
  ],
  "1f367": [
  ["\uD83C\uDF67"], "\uE43F", "\uDBBA\uDD71", ["shaved_ice"], 7, 26
  ],
  "1f368": [
  ["\uD83C\uDF68"], "", "\uDBBA\uDD77", ["ice_cream"], 7, 27
  ],
  "1f369": [
  ["\uD83C\uDF69"], "", "\uDBBA\uDD78", ["doughnut"], 7, 28
  ],
  "1f36a": [
  ["\uD83C\uDF6A"], "", "\uDBBA\uDD79", ["cookie"], 7, 29
  ],
  "1f36b": [
  ["\uD83C\uDF6B"], "", "\uDBBA\uDD7A", ["chocolate_bar"], 8, 0
  ],
  "1f36c": [
  ["\uD83C\uDF6C"], "", "\uDBBA\uDD7B", ["candy"], 8, 1
  ],
  "1f36d": [
  ["\uD83C\uDF6D"], "", "\uDBBA\uDD7C", ["lollipop"], 8, 2
  ],
  "1f36e": [
  ["\uD83C\uDF6E"], "", "\uDBBA\uDD7D", ["custard"], 8, 3
  ],
  "1f36f": [
  ["\uD83C\uDF6F"], "", "\uDBBA\uDD7E", ["honey_pot"], 8, 4
  ],
  "1f370": [
  ["\uD83C\uDF70"], "\uE046", "\uDBBA\uDD62", ["cake"], 8, 5
  ],
  "1f371": [
  ["\uD83C\uDF71"], "\uE34C", "\uDBBA\uDD6F", ["bento"], 8, 6
  ],
  "1f372": [
  ["\uD83C\uDF72"], "\uE34D", "\uDBBA\uDD70", ["stew"], 8, 7
  ],
  "1f373": [
  ["\uD83C\uDF73"], "\uE147", "\uDBBA\uDD65", ["egg"], 8, 8
  ],
  "1f374": [
  ["\uD83C\uDF74"], "\uE043", "\uDBBA\uDD80", ["fork_and_knife"], 8, 9
  ],
  "1f375": [
  ["\uD83C\uDF75"], "\uE338", "\uDBBA\uDD84", ["tea"], 8, 10
  ],
  "1f376": [
  ["\uD83C\uDF76"], "\uE30B", "\uDBBA\uDD85", ["sake"], 8, 11
  ],
  "1f377": [
  ["\uD83C\uDF77"], "\uE044", "\uDBBA\uDD86", ["wine_glass"], 8, 12
  ],
  "1f378": [
  ["\uD83C\uDF78"], "\uE044", "\uDBBA\uDD82", ["cocktail"], 8, 13
  ],
  "1f379": [
  ["\uD83C\uDF79"], "\uE044", "\uDBBA\uDD88", ["tropical_drink"], 8, 14
  ],
  "1f37a": [
  ["\uD83C\uDF7A"], "\uE047", "\uDBBA\uDD83", ["beer"], 8, 15
  ],
  "1f37b": [
  ["\uD83C\uDF7B"], "\uE30C", "\uDBBA\uDD87", ["beers"], 8, 16
  ],
  "1f37c": [
  ["\uD83C\uDF7C"], "", "", ["baby_bottle"], 8, 17
  ],
  "1f380": [
  ["\uD83C\uDF80"], "\uE314", "\uDBB9\uDD0F", ["ribbon"], 8, 18
  ],
  "1f381": [
  ["\uD83C\uDF81"], "\uE112", "\uDBB9\uDD10", ["gift"], 8, 19
  ],
  "1f382": [
  ["\uD83C\uDF82"], "\uE34B", "\uDBB9\uDD11", ["birthday"], 8, 20
  ],
  "1f383": [
  ["\uD83C\uDF83"], "\uE445", "\uDBB9\uDD1F", ["jack_o_lantern"], 8, 21
  ],
  "1f384": [
  ["\uD83C\uDF84"], "\uE033", "\uDBB9\uDD12", ["christmas_tree"], 8, 22
  ],
  "1f385": [
  ["\uD83C\uDF85"], "\uE448", "\uDBB9\uDD13", ["santa"], 8, 23
  ],
  "1f386": [
  ["\uD83C\uDF86"], "\uE117", "\uDBB9\uDD15", ["fireworks"], 8, 24
  ],
  "1f387": [
  ["\uD83C\uDF87"], "\uE440", "\uDBB9\uDD1D", ["sparkler"], 8, 25
  ],
  "1f388": [
  ["\uD83C\uDF88"], "\uE310", "\uDBB9\uDD16", ["balloon"], 8, 26
  ],
  "1f389": [
  ["\uD83C\uDF89"], "\uE312", "\uDBB9\uDD17", ["tada"], 8, 27
  ],
  "1f38a": [
  ["\uD83C\uDF8A"], "", "\uDBB9\uDD20", ["confetti_ball"], 8, 28
  ],
  "1f38b": [
  ["\uD83C\uDF8B"], "", "\uDBB9\uDD21", ["tanabata_tree"], 8, 29
  ],
  "1f38c": [
  ["\uD83C\uDF8C"], "\uE143", "\uDBB9\uDD14", ["crossed_flags"], 9, 0
  ],
  "1f38d": [
  ["\uD83C\uDF8D"], "\uE436", "\uDBB9\uDD18", ["bamboo"], 9, 1
  ],
  "1f38e": [
  ["\uD83C\uDF8E"], "\uE438", "\uDBB9\uDD19", ["dolls"], 9, 2
  ],
  "1f38f": [
  ["\uD83C\uDF8F"], "\uE43B", "\uDBB9\uDD1C", ["flags"], 9, 3
  ],
  "1f390": [
  ["\uD83C\uDF90"], "\uE442", "\uDBB9\uDD1E", ["wind_chime"], 9, 4
  ],
  "1f391": [
  ["\uD83C\uDF91"], "\uE446", "\uDBB8\uDC17", ["rice_scene"], 9, 5
  ],
  "1f392": [
  ["\uD83C\uDF92"], "\uE43A", "\uDBB9\uDD1B", ["school_satchel"], 9, 6
  ],
  "1f393": [
  ["\uD83C\uDF93"], "\uE439", "\uDBB9\uDD1A", ["mortar_board"], 9, 7
  ],
  "1f3a0": [
  ["\uD83C\uDFA0"], "", "\uDBB9\uDFFC", ["carousel_horse"], 9, 8
  ],
  "1f3a1": [
  ["\uD83C\uDFA1"], "\uE124", "\uDBB9\uDFFD", ["ferris_wheel"], 9, 9
  ],
  "1f3a2": [
  ["\uD83C\uDFA2"], "\uE433", "\uDBB9\uDFFE", ["roller_coaster"], 9, 10
  ],
  "1f3a3": [
  ["\uD83C\uDFA3"], "\uE019", "\uDBB9\uDFFF", ["fishing_pole_and_fish"], 9, 11
  ],
  "1f3a4": [
  ["\uD83C\uDFA4"], "\uE03C", "\uDBBA\uDC00", ["microphone"], 9, 12
  ],
  "1f3a5": [
  ["\uD83C\uDFA5"], "\uE03D", "\uDBBA\uDC01", ["movie_camera"], 9, 13
  ],
  "1f3a6": [
  ["\uD83C\uDFA6"], "\uE507", "\uDBBA\uDC02", ["cinema"], 9, 14
  ],
  "1f3a7": [
  ["\uD83C\uDFA7"], "\uE30A", "\uDBBA\uDC03", ["headphones"], 9, 15
  ],
  "1f3a8": [
  ["\uD83C\uDFA8"], "\uE502", "\uDBBA\uDC04", ["art"], 9, 16
  ],
  "1f3a9": [
  ["\uD83C\uDFA9"], "\uE503", "\uDBBA\uDC05", ["tophat"], 9, 17
  ],
  "1f3aa": [
  ["\uD83C\uDFAA"], "", "\uDBBA\uDC06", ["circus_tent"], 9, 18
  ],
  "1f3ab": [
  ["\uD83C\uDFAB"], "\uE125", "\uDBBA\uDC07", ["ticket"], 9, 19
  ],
  "1f3ac": [
  ["\uD83C\uDFAC"], "\uE324", "\uDBBA\uDC08", ["clapper"], 9, 20
  ],
  "1f3ad": [
  ["\uD83C\uDFAD"], "\uE503", "\uDBBA\uDC09", ["performing_arts"], 9, 21
  ],
  "1f3ae": [
  ["\uD83C\uDFAE"], "", "\uDBBA\uDC0A", ["video_game"], 9, 22
  ],
  "1f3af": [
  ["\uD83C\uDFAF"], "\uE130", "\uDBBA\uDC0C", ["dart"], 9, 23
  ],
  "1f3b0": [
  ["\uD83C\uDFB0"], "\uE133", "\uDBBA\uDC0D", ["slot_machine"], 9, 24
  ],
  "1f3b1": [
  ["\uD83C\uDFB1"], "\uE42C", "\uDBBA\uDC0E", ["8ball"], 9, 25
  ],
  "1f3b2": [
  ["\uD83C\uDFB2"], "", "\uDBBA\uDC0F", ["game_die"], 9, 26
  ],
  "1f3b3": [
  ["\uD83C\uDFB3"], "", "\uDBBA\uDC10", ["bowling"], 9, 27
  ],
  "1f3b4": [
  ["\uD83C\uDFB4"], "", "\uDBBA\uDC11", ["flower_playing_cards"], 9, 28
  ],
  "1f3b5": [
  ["\uD83C\uDFB5"], "\uE03E", "\uDBBA\uDC13", ["musical_note"], 9, 29
  ],
  "1f3b6": [
  ["\uD83C\uDFB6"], "\uE326", "\uDBBA\uDC14", ["notes"], 10, 0
  ],
  "1f3b7": [
  ["\uD83C\uDFB7"], "\uE040", "\uDBBA\uDC15", ["saxophone"], 10, 1
  ],
  "1f3b8": [
  ["\uD83C\uDFB8"], "\uE041", "\uDBBA\uDC16", ["guitar"], 10, 2
  ],
  "1f3b9": [
  ["\uD83C\uDFB9"], "", "\uDBBA\uDC17", ["musical_keyboard"], 10, 3
  ],
  "1f3ba": [
  ["\uD83C\uDFBA"], "\uE042", "\uDBBA\uDC18", ["trumpet"], 10, 4
  ],
  "1f3bb": [
  ["\uD83C\uDFBB"], "", "\uDBBA\uDC19", ["violin"], 10, 5
  ],
  "1f3bc": [
  ["\uD83C\uDFBC"], "\uE326", "\uDBBA\uDC1A", ["musical_score"], 10, 6
  ],
  "1f3bd": [
  ["\uD83C\uDFBD"], "", "\uDBB9\uDFD0", ["running_shirt_with_sash"], 10, 7
  ],
  "1f3be": [
  ["\uD83C\uDFBE"], "\uE015", "\uDBB9\uDFD3", ["tennis"], 10, 8
  ],
  "1f3bf": [
  ["\uD83C\uDFBF"], "\uE013", "\uDBB9\uDFD5", ["ski"], 10, 9
  ],
  "1f3c0": [
  ["\uD83C\uDFC0"], "\uE42A", "\uDBB9\uDFD6", ["basketball"], 10, 10
  ],
  "1f3c1": [
  ["\uD83C\uDFC1"], "\uE132", "\uDBB9\uDFD7", ["checkered_flag"], 10, 11
  ],
  "1f3c2": [
  ["\uD83C\uDFC2"], "", "\uDBB9\uDFD8", ["snowboarder"], 10, 12
  ],
  "1f3c3": [
  ["\uD83C\uDFC3"], "\uE115", "\uDBB9\uDFD9", ["runner", "running"], 10, 13
  ],
  "1f3c4": [
  ["\uD83C\uDFC4"], "\uE017", "\uDBB9\uDFDA", ["surfer"], 10, 14
  ],
  "1f3c6": [
  ["\uD83C\uDFC6"], "\uE131", "\uDBB9\uDFDB", ["trophy"], 10, 15
  ],
  "1f3c7": [
  ["\uD83C\uDFC7"], "", "", ["horse_racing"], 10, 16
  ],
  "1f3c8": [
  ["\uD83C\uDFC8"], "\uE42B", "\uDBB9\uDFDD", ["football"], 10, 17
  ],
  "1f3c9": [
  ["\uD83C\uDFC9"], "", "", ["rugby_football"], 10, 18
  ],
  "1f3ca": [
  ["\uD83C\uDFCA"], "\uE42D", "\uDBB9\uDFDE", ["swimmer"], 10, 19
  ],
  "1f3e0": [
  ["\uD83C\uDFE0"], "\uE036", "\uDBB9\uDCB0", ["house"], 10, 20
  ],
  "1f3e1": [
  ["\uD83C\uDFE1"], "\uE036", "\uDBB9\uDCB1", ["house_with_garden"], 10, 21
  ],
  "1f3e2": [
  ["\uD83C\uDFE2"], "\uE038", "\uDBB9\uDCB2", ["office"], 10, 22
  ],
  "1f3e3": [
  ["\uD83C\uDFE3"], "\uE153", "\uDBB9\uDCB3", ["post_office"], 10, 23
  ],
  "1f3e4": [
  ["\uD83C\uDFE4"], "", "", ["european_post_office"], 10, 24
  ],
  "1f3e5": [
  ["\uD83C\uDFE5"], "\uE155", "\uDBB9\uDCB4", ["hospital"], 10, 25
  ],
  "1f3e6": [
  ["\uD83C\uDFE6"], "\uE14D", "\uDBB9\uDCB5", ["bank"], 10, 26
  ],
  "1f3e7": [
  ["\uD83C\uDFE7"], "\uE154", "\uDBB9\uDCB6", ["atm"], 10, 27
  ],
  "1f3e8": [
  ["\uD83C\uDFE8"], "\uE158", "\uDBB9\uDCB7", ["hotel"], 10, 28
  ],
  "1f3e9": [
  ["\uD83C\uDFE9"], "\uE501", "\uDBB9\uDCB8", ["love_hotel"], 10, 29
  ],
  "1f3ea": [
  ["\uD83C\uDFEA"], "\uE156", "\uDBB9\uDCB9", ["convenience_store"], 11, 0
  ],
  "1f3eb": [
  ["\uD83C\uDFEB"], "\uE157", "\uDBB9\uDCBA", ["school"], 11, 1
  ],
  "1f3ec": [
  ["\uD83C\uDFEC"], "\uE504", "\uDBB9\uDCBD", ["department_store"], 11, 2
  ],
  "1f3ed": [
  ["\uD83C\uDFED"], "\uE508", "\uDBB9\uDCC0", ["factory"], 11, 3
  ],
  "1f3ee": [
  ["\uD83C\uDFEE"], "\uE30B", "\uDBB9\uDCC2", ["izakaya_lantern", "lantern"], 11, 4
  ],
  "1f3ef": [
  ["\uD83C\uDFEF"], "\uE505", "\uDBB9\uDCBE", ["japanese_castle"], 11, 5
  ],
  "1f3f0": [
  ["\uD83C\uDFF0"], "\uE506", "\uDBB9\uDCBF", ["european_castle"], 11, 6
  ],
  "1f400": [
  ["\uD83D\uDC00"], "", "", ["rat"], 11, 7
  ],
  "1f401": [
  ["\uD83D\uDC01"], "", "", ["mouse2"], 11, 8
  ],
  "1f402": [
  ["\uD83D\uDC02"], "", "", ["ox"], 11, 9
  ],
  "1f403": [
  ["\uD83D\uDC03"], "", "", ["water_buffalo"], 11, 10
  ],
  "1f404": [
  ["\uD83D\uDC04"], "", "", ["cow2"], 11, 11
  ],
  "1f405": [
  ["\uD83D\uDC05"], "", "", ["tiger2"], 11, 12
  ],
  "1f406": [
  ["\uD83D\uDC06"], "", "", ["leopard"], 11, 13
  ],
  "1f407": [
  ["\uD83D\uDC07"], "", "", ["rabbit2"], 11, 14
  ],
  "1f408": [
  ["\uD83D\uDC08"], "", "", ["cat2"], 11, 15
  ],
  "1f409": [
  ["\uD83D\uDC09"], "", "", ["dragon"], 11, 16
  ],
  "1f40a": [
  ["\uD83D\uDC0A"], "", "", ["crocodile"], 11, 17
  ],
  "1f40b": [
  ["\uD83D\uDC0B"], "", "", ["whale2"], 11, 18
  ],
  "1f40c": [
  ["\uD83D\uDC0C"], "", "\uDBB8\uDDB9", ["snail"], 11, 19
  ],
  "1f40d": [
  ["\uD83D\uDC0D"], "\uE52D", "\uDBB8\uDDD3", ["snake"], 11, 20
  ],
  "1f40e": [
  ["\uD83D\uDC0E"], "\uE134", "\uDBB9\uDFDC", ["racehorse"], 11, 21
  ],
  "1f40f": [
  ["\uD83D\uDC0F"], "", "", ["ram"], 11, 22
  ],
  "1f410": [
  ["\uD83D\uDC10"], "", "", ["goat"], 11, 23
  ],
  "1f411": [
  ["\uD83D\uDC11"], "\uE529", "\uDBB8\uDDCF", ["sheep"], 11, 24
  ],
  "1f412": [
  ["\uD83D\uDC12"], "\uE528", "\uDBB8\uDDCE", ["monkey"], 11, 25
  ],
  "1f413": [
  ["\uD83D\uDC13"], "", "", ["rooster"], 11, 26
  ],
  "1f414": [
  ["\uD83D\uDC14"], "\uE52E", "\uDBB8\uDDD4", ["chicken"], 11, 27
  ],
  "1f415": [
  ["\uD83D\uDC15"], "", "", ["dog2"], 11, 28
  ],
  "1f416": [
  ["\uD83D\uDC16"], "", "", ["pig2"], 11, 29
  ],
  "1f417": [
  ["\uD83D\uDC17"], "\uE52F", "\uDBB8\uDDD5", ["boar"], 12, 0
  ],
  "1f418": [
  ["\uD83D\uDC18"], "\uE526", "\uDBB8\uDDCC", ["elephant"], 12, 1
  ],
  "1f419": [
  ["\uD83D\uDC19"], "\uE10A", "\uDBB8\uDDC5", ["octopus"], 12, 2
  ],
  "1f41a": [
  ["\uD83D\uDC1A"], "\uE441", "\uDBB8\uDDC6", ["shell"], 12, 3
  ],
  "1f41b": [
  ["\uD83D\uDC1B"], "\uE525", "\uDBB8\uDDCB", ["bug"], 12, 4
  ],
  "1f41c": [
  ["\uD83D\uDC1C"], "", "\uDBB8\uDDDA", ["ant"], 12, 5
  ],
  "1f41d": [
  ["\uD83D\uDC1D"], "", "\uDBB8\uDDE1", ["bee", "honeybee"], 12, 6
  ],
  "1f41e": [
  ["\uD83D\uDC1E"], "", "\uDBB8\uDDE2", ["beetle"], 12, 7
  ],
  "1f41f": [
  ["\uD83D\uDC1F"], "\uE019", "\uDBB8\uDDBD", ["fish"], 12, 8
  ],
  "1f420": [
  ["\uD83D\uDC20"], "\uE522", "\uDBB8\uDDC9", ["tropical_fish"], 12, 9
  ],
  "1f421": [
  ["\uD83D\uDC21"], "\uE019", "\uDBB8\uDDD9", ["blowfish"], 12, 10
  ],
  "1f422": [
  ["\uD83D\uDC22"], "", "\uDBB8\uDDDC", ["turtle"], 12, 11
  ],
  "1f423": [
  ["\uD83D\uDC23"], "\uE523", "\uDBB8\uDDDD", ["hatching_chick"], 12, 12
  ],
  "1f424": [
  ["\uD83D\uDC24"], "\uE523", "\uDBB8\uDDBA", ["baby_chick"], 12, 13
  ],
  "1f425": [
  ["\uD83D\uDC25"], "\uE523", "\uDBB8\uDDBB", ["hatched_chick"], 12, 14
  ],
  "1f426": [
  ["\uD83D\uDC26"], "\uE521", "\uDBB8\uDDC8", ["bird"], 12, 15
  ],
  "1f427": [
  ["\uD83D\uDC27"], "\uE055", "\uDBB8\uDDBC", ["penguin"], 12, 16
  ],
  "1f428": [
  ["\uD83D\uDC28"], "\uE527", "\uDBB8\uDDCD", ["koala"], 12, 17
  ],
  "1f429": [
  ["\uD83D\uDC29"], "\uE052", "\uDBB8\uDDD8", ["poodle"], 12, 18
  ],
  "1f42a": [
  ["\uD83D\uDC2A"], "", "", ["dromedary_camel"], 12, 19
  ],
  "1f42b": [
  ["\uD83D\uDC2B"], "\uE530", "\uDBB8\uDDD6", ["camel"], 12, 20
  ],
  "1f42c": [
  ["\uD83D\uDC2C"], "\uE520", "\uDBB8\uDDC7", ["dolphin", "flipper"], 12, 21
  ],
  "1f42d": [
  ["\uD83D\uDC2D"], "\uE053", "\uDBB8\uDDC2", ["mouse"], 12, 22
  ],
  "1f42e": [
  ["\uD83D\uDC2E"], "\uE52B", "\uDBB8\uDDD1", ["cow"], 12, 23
  ],
  "1f42f": [
  ["\uD83D\uDC2F"], "\uE050", "\uDBB8\uDDC0", ["tiger"], 12, 24
  ],
  "1f430": [
  ["\uD83D\uDC30"], "\uE52C", "\uDBB8\uDDD2", ["rabbit"], 12, 25
  ],
  "1f431": [
  ["\uD83D\uDC31"], "\uE04F", "\uDBB8\uDDB8", ["cat"], 12, 26
  ],
  "1f432": [
  ["\uD83D\uDC32"], "", "\uDBB8\uDDDE", ["dragon_face"], 12, 27
  ],
  "1f433": [
  ["\uD83D\uDC33"], "\uE054", "\uDBB8\uDDC3", ["whale"], 12, 28
  ],
  "1f434": [
  ["\uD83D\uDC34"], "\uE01A", "\uDBB8\uDDBE", ["horse"], 12, 29
  ],
  "1f435": [
  ["\uD83D\uDC35"], "\uE109", "\uDBB8\uDDC4", ["monkey_face"], 13, 0
  ],
  "1f436": [
  ["\uD83D\uDC36"], "\uE052", "\uDBB8\uDDB7", ["dog"], 13, 1
  ],
  "1f437": [
  ["\uD83D\uDC37"], "\uE10B", "\uDBB8\uDDBF", ["pig"], 13, 2
  ],
  "1f438": [
  ["\uD83D\uDC38"], "\uE531", "\uDBB8\uDDD7", ["frog"], 13, 3
  ],
  "1f439": [
  ["\uD83D\uDC39"], "\uE524", "\uDBB8\uDDCA", ["hamster"], 13, 4
  ],
  "1f43a": [
  ["\uD83D\uDC3A"], "\uE52A", "\uDBB8\uDDD0", ["wolf"], 13, 5
  ],
  "1f43b": [
  ["\uD83D\uDC3B"], "\uE051", "\uDBB8\uDDC1", ["bear"], 13, 6
  ],
  "1f43c": [
  ["\uD83D\uDC3C"], "", "\uDBB8\uDDDF", ["panda_face"], 13, 7
  ],
  "1f43d": [
  ["\uD83D\uDC3D"], "\uE10B", "\uDBB8\uDDE0", ["pig_nose"], 13, 8
  ],
  "1f43e": [
  ["\uD83D\uDC3E"], "\uE536", "\uDBB8\uDDDB", ["feet", "paw_prints"], 13, 9
  ],
  "1f440": [
  ["\uD83D\uDC40"], "\uE419", "\uDBB8\uDD90", ["eyes"], 13, 10
  ],
  "1f442": [
  ["\uD83D\uDC42"], "\uE41B", "\uDBB8\uDD91", ["ear"], 13, 11
  ],
  "1f443": [
  ["\uD83D\uDC43"], "\uE41A", "\uDBB8\uDD92", ["nose"], 13, 12
  ],
  "1f444": [
  ["\uD83D\uDC44"], "\uE41C", "\uDBB8\uDD93", ["lips"], 13, 13
  ],
  "1f445": [
  ["\uD83D\uDC45"], "\uE409", "\uDBB8\uDD94", ["tongue"], 13, 14
  ],
  "1f446": [
  ["\uD83D\uDC46"], "\uE22E", "\uDBBA\uDF99", ["point_up_2"], 13, 15
  ],
  "1f447": [
  ["\uD83D\uDC47"], "\uE22F", "\uDBBA\uDF9A", ["point_down"], 13, 16
  ],
  "1f448": [
  ["\uD83D\uDC48"], "\uE230", "\uDBBA\uDF9B", ["point_left"], 13, 17
  ],
  "1f449": [
  ["\uD83D\uDC49"], "\uE231", "\uDBBA\uDF9C", ["point_right"], 13, 18
  ],
  "1f44a": [
  ["\uD83D\uDC4A"], "\uE00D", "\uDBBA\uDF96", ["facepunch", "punch"], 13, 19
  ],
  "1f44b": [
  ["\uD83D\uDC4B"], "\uE41E", "\uDBBA\uDF9D", ["wave"], 13, 20
  ],
  "1f44c": [
  ["\uD83D\uDC4C"], "\uE420", "\uDBBA\uDF9F", ["ok_hand"], 13, 21
  ],
  "1f44d": [
  ["\uD83D\uDC4D"], "\uE00E", "\uDBBA\uDF97", ["+1", "thumbsup"], 13, 22
  ],
  "1f44e": [
  ["\uD83D\uDC4E"], "\uE421", "\uDBBA\uDFA0", ["-1", "thumbsdown"], 13, 23
  ],
  "1f44f": [
  ["\uD83D\uDC4F"], "\uE41F", "\uDBBA\uDF9E", ["clap"], 13, 24
  ],
  "1f450": [
  ["\uD83D\uDC50"], "\uE422", "\uDBBA\uDFA1", ["open_hands"], 13, 25
  ],
  "1f451": [
  ["\uD83D\uDC51"], "\uE10E", "\uDBB9\uDCD1", ["crown"], 13, 26
  ],
  "1f452": [
  ["\uD83D\uDC52"], "\uE318", "\uDBB9\uDCD4", ["womans_hat"], 13, 27
  ],
  "1f453": [
  ["\uD83D\uDC53"], "", "\uDBB9\uDCCE", ["eyeglasses"], 13, 28
  ],
  "1f454": [
  ["\uD83D\uDC54"], "\uE302", "\uDBB9\uDCD3", ["necktie"], 13, 29
  ],
  "1f455": [
  ["\uD83D\uDC55"], "\uE006", "\uDBB9\uDCCF", ["shirt", "tshirt"], 14, 0
  ],
  "1f456": [
  ["\uD83D\uDC56"], "", "\uDBB9\uDCD0", ["jeans"], 14, 1
  ],
  "1f457": [
  ["\uD83D\uDC57"], "\uE319", "\uDBB9\uDCD5", ["dress"], 14, 2
  ],
  "1f458": [
  ["\uD83D\uDC58"], "\uE321", "\uDBB9\uDCD9", ["kimono"], 14, 3
  ],
  "1f459": [
  ["\uD83D\uDC59"], "\uE322", "\uDBB9\uDCDA", ["bikini"], 14, 4
  ],
  "1f45a": [
  ["\uD83D\uDC5A"], "\uE006", "\uDBB9\uDCDB", ["womans_clothes"], 14, 5
  ],
  "1f45b": [
  ["\uD83D\uDC5B"], "", "\uDBB9\uDCDC", ["purse"], 14, 6
  ],
  "1f45c": [
  ["\uD83D\uDC5C"], "\uE323", "\uDBB9\uDCF0", ["handbag"], 14, 7
  ],
  "1f45d": [
  ["\uD83D\uDC5D"], "", "\uDBB9\uDCF1", ["pouch"], 14, 8
  ],
  "1f45e": [
  ["\uD83D\uDC5E"], "\uE007", "\uDBB9\uDCCC", ["mans_shoe", "shoe"], 14, 9
  ],
  "1f45f": [
  ["\uD83D\uDC5F"], "\uE007", "\uDBB9\uDCCD", ["athletic_shoe"], 14, 10
  ],
  "1f460": [
  ["\uD83D\uDC60"], "\uE13E", "\uDBB9\uDCD6", ["high_heel"], 14, 11
  ],
  "1f461": [
  ["\uD83D\uDC61"], "\uE31A", "\uDBB9\uDCD7", ["sandal"], 14, 12
  ],
  "1f462": [
  ["\uD83D\uDC62"], "\uE31B", "\uDBB9\uDCD8", ["boot"], 14, 13
  ],
  "1f463": [
  ["\uD83D\uDC63"], "\uE536", "\uDBB9\uDD53", ["footprints"], 14, 14
  ],
  "1f464": [
  ["\uD83D\uDC64"], "", "\uDBB8\uDD9A", ["bust_in_silhouette"], 14, 15
  ],
  "1f465": [
  ["\uD83D\uDC65"], "", "", ["busts_in_silhouette"], 14, 16
  ],
  "1f466": [
  ["\uD83D\uDC66"], "\uE001", "\uDBB8\uDD9B", ["boy"], 14, 17
  ],
  "1f467": [
  ["\uD83D\uDC67"], "\uE002", "\uDBB8\uDD9C", ["girl"], 14, 18
  ],
  "1f468": [
  ["\uD83D\uDC68"], "\uE004", "\uDBB8\uDD9D", ["man"], 14, 19
  ],
  "1f469": [
  ["\uD83D\uDC69"], "\uE005", "\uDBB8\uDD9E", ["woman"], 14, 20
  ],
  "1f46a": [
  ["\uD83D\uDC6A"], "", "\uDBB8\uDD9F", ["family"], 14, 21
  ],
  "1f46b": [
  ["\uD83D\uDC6B"], "\uE428", "\uDBB8\uDDA0", ["couple"], 14, 22
  ],
  "1f46c": [
  ["\uD83D\uDC6C"], "", "", ["two_men_holding_hands"], 14, 23
  ],
  "1f46d": [
  ["\uD83D\uDC6D"], "", "", ["two_women_holding_hands"], 14, 24
  ],
  "1f46e": [
  ["\uD83D\uDC6E"], "\uE152", "\uDBB8\uDDA1", ["cop"], 14, 25
  ],
  "1f46f": [
  ["\uD83D\uDC6F"], "\uE429", "\uDBB8\uDDA2", ["dancers"], 14, 26
  ],
  "1f470": [
  ["\uD83D\uDC70"], "", "\uDBB8\uDDA3", ["bride_with_veil"], 14, 27
  ],
  "1f471": [
  ["\uD83D\uDC71"], "\uE515", "\uDBB8\uDDA4", ["person_with_blond_hair"], 14, 28
  ],
  "1f472": [
  ["\uD83D\uDC72"], "\uE516", "\uDBB8\uDDA5", ["man_with_gua_pi_mao"], 14, 29
  ],
  "1f473": [
  ["\uD83D\uDC73"], "\uE517", "\uDBB8\uDDA6", ["man_with_turban"], 15, 0
  ],
  "1f474": [
  ["\uD83D\uDC74"], "\uE518", "\uDBB8\uDDA7", ["older_man"], 15, 1
  ],
  "1f475": [
  ["\uD83D\uDC75"], "\uE519", "\uDBB8\uDDA8", ["older_woman"], 15, 2
  ],
  "1f476": [
  ["\uD83D\uDC76"], "\uE51A", "\uDBB8\uDDA9", ["baby"], 15, 3
  ],
  "1f477": [
  ["\uD83D\uDC77"], "\uE51B", "\uDBB8\uDDAA", ["construction_worker"], 15, 4
  ],
  "1f478": [
  ["\uD83D\uDC78"], "\uE51C", "\uDBB8\uDDAB", ["princess"], 15, 5
  ],
  "1f479": [
  ["\uD83D\uDC79"], "", "\uDBB8\uDDAC", ["japanese_ogre"], 15, 6
  ],
  "1f47a": [
  ["\uD83D\uDC7A"], "", "\uDBB8\uDDAD", ["japanese_goblin"], 15, 7
  ],
  "1f47b": [
  ["\uD83D\uDC7B"], "\uE11B", "\uDBB8\uDDAE", ["ghost"], 15, 8
  ],
  "1f47c": [
  ["\uD83D\uDC7C"], "\uE04E", "\uDBB8\uDDAF", ["angel"], 15, 9
  ],
  "1f47d": [
  ["\uD83D\uDC7D"], "\uE10C", "\uDBB8\uDDB0", ["alien"], 15, 10
  ],
  "1f47e": [
  ["\uD83D\uDC7E"], "\uE12B", "\uDBB8\uDDB1", ["space_invader"], 15, 11
  ],
  "1f47f": [
  ["\uD83D\uDC7F"], "\uE11A", "\uDBB8\uDDB2", ["imp"], 15, 12
  ],
  "1f480": [
  ["\uD83D\uDC80"], "\uE11C", "\uDBB8\uDDB3", ["skull"], 15, 13
  ],
  "1f481": [
  ["\uD83D\uDC81"], "\uE253", "\uDBB8\uDDB4", ["information_desk_person"], 15, 14
  ],
  "1f482": [
  ["\uD83D\uDC82"], "\uE51E", "\uDBB8\uDDB5", ["guardsman"], 15, 15
  ],
  "1f483": [
  ["\uD83D\uDC83"], "\uE51F", "\uDBB8\uDDB6", ["dancer"], 15, 16
  ],
  "1f484": [
  ["\uD83D\uDC84"], "\uE31C", "\uDBB8\uDD95", ["lipstick"], 15, 17
  ],
  "1f485": [
  ["\uD83D\uDC85"], "\uE31D", "\uDBB8\uDD96", ["nail_care"], 15, 18
  ],
  "1f486": [
  ["\uD83D\uDC86"], "\uE31E", "\uDBB8\uDD97", ["massage"], 15, 19
  ],
  "1f487": [
  ["\uD83D\uDC87"], "\uE31F", "\uDBB8\uDD98", ["haircut"], 15, 20
  ],
  "1f488": [
  ["\uD83D\uDC88"], "\uE320", "\uDBB8\uDD99", ["barber"], 15, 21
  ],
  "1f489": [
  ["\uD83D\uDC89"], "\uE13B", "\uDBB9\uDD09", ["syringe"], 15, 22
  ],
  "1f48a": [
  ["\uD83D\uDC8A"], "\uE30F", "\uDBB9\uDD0A", ["pill"], 15, 23
  ],
  "1f48b": [
  ["\uD83D\uDC8B"], "\uE003", "\uDBBA\uDC23", ["kiss"], 15, 24
  ],
  "1f48c": [
  ["\uD83D\uDC8C"], "\uE103\uE328", "\uDBBA\uDC24", ["love_letter"], 15, 25
  ],
  "1f48d": [
  ["\uD83D\uDC8D"], "\uE034", "\uDBBA\uDC25", ["ring"], 15, 26
  ],
  "1f48e": [
  ["\uD83D\uDC8E"], "\uE035", "\uDBBA\uDC26", ["gem"], 15, 27
  ],
  "1f48f": [
  ["\uD83D\uDC8F"], "\uE111", "\uDBBA\uDC27", ["couplekiss"], 15, 28
  ],
  "1f490": [
  ["\uD83D\uDC90"], "\uE306", "\uDBBA\uDC28", ["bouquet"], 15, 29
  ],
  "1f491": [
  ["\uD83D\uDC91"], "\uE425", "\uDBBA\uDC29", ["couple_with_heart"], 16, 0
  ],
  "1f492": [
  ["\uD83D\uDC92"], "\uE43D", "\uDBBA\uDC2A", ["wedding"], 16, 1
  ],
  "1f493": [
  ["\uD83D\uDC93"], "\uE327", "\uDBBA\uDF0D", ["heartbeat"], 16, 2
  ],
  "1f494": [
  ["\uD83D\uDC94"], "\uE023", "\uDBBA\uDF0E", ["broken_heart"], 16, 3, "<\/3"
  ],
  "1f495": [
  ["\uD83D\uDC95"], "\uE327", "\uDBBA\uDF0F", ["two_hearts"], 16, 4
  ],
  "1f496": [
  ["\uD83D\uDC96"], "\uE327", "\uDBBA\uDF10", ["sparkling_heart"], 16, 5
  ],
  "1f497": [
  ["\uD83D\uDC97"], "\uE328", "\uDBBA\uDF11", ["heartpulse"], 16, 6
  ],
  "1f498": [
  ["\uD83D\uDC98"], "\uE329", "\uDBBA\uDF12", ["cupid"], 16, 7
  ],
  "1f499": [
  ["\uD83D\uDC99"], "\uE32A", "\uDBBA\uDF13", ["blue_heart"], 16, 8, "<3"
  ],
  "1f49a": [
  ["\uD83D\uDC9A"], "\uE32B", "\uDBBA\uDF14", ["green_heart"], 16, 9, "<3"
  ],
  "1f49b": [
  ["\uD83D\uDC9B"], "\uE32C", "\uDBBA\uDF15", ["yellow_heart"], 16, 10, "<3"
  ],
  "1f49c": [
  ["\uD83D\uDC9C"], "\uE32D", "\uDBBA\uDF16", ["purple_heart"], 16, 11, "<3"
  ],
  "1f49d": [
  ["\uD83D\uDC9D"], "\uE437", "\uDBBA\uDF17", ["gift_heart"], 16, 12
  ],
  "1f49e": [
  ["\uD83D\uDC9E"], "\uE327", "\uDBBA\uDF18", ["revolving_hearts"], 16, 13
  ],
  "1f49f": [
  ["\uD83D\uDC9F"], "\uE204", "\uDBBA\uDF19", ["heart_decoration"], 16, 14
  ],
  "1f4a0": [
  ["\uD83D\uDCA0"], "", "\uDBBA\uDF55", ["diamond_shape_with_a_dot_inside"], 16, 15
  ],
  "1f4a1": [
  ["\uD83D\uDCA1"], "\uE10F", "\uDBBA\uDF56", ["bulb"], 16, 16
  ],
  "1f4a2": [
  ["\uD83D\uDCA2"], "\uE334", "\uDBBA\uDF57", ["anger"], 16, 17
  ],
  "1f4a3": [
  ["\uD83D\uDCA3"], "\uE311", "\uDBBA\uDF58", ["bomb"], 16, 18
  ],
  "1f4a4": [
  ["\uD83D\uDCA4"], "\uE13C", "\uDBBA\uDF59", ["zzz"], 16, 19
  ],
  "1f4a5": [
  ["\uD83D\uDCA5"], "", "\uDBBA\uDF5A", ["boom", "collision"], 16, 20
  ],
  "1f4a6": [
  ["\uD83D\uDCA6"], "\uE331", "\uDBBA\uDF5B", ["sweat_drops"], 16, 21
  ],
  "1f4a7": [
  ["\uD83D\uDCA7"], "\uE331", "\uDBBA\uDF5C", ["droplet"], 16, 22
  ],
  "1f4a8": [
  ["\uD83D\uDCA8"], "\uE330", "\uDBBA\uDF5D", ["dash"], 16, 23
  ],
  "1f4a9": [
  ["\uD83D\uDCA9"], "\uE05A", "\uDBB9\uDCF4", ["hankey", "poop", "shit"], 16, 24
  ],
  "1f4aa": [
  ["\uD83D\uDCAA"], "\uE14C", "\uDBBA\uDF5E", ["muscle"], 16, 25
  ],
  "1f4ab": [
  ["\uD83D\uDCAB"], "\uE407", "\uDBBA\uDF5F", ["dizzy"], 16, 26
  ],
  "1f4ac": [
  ["\uD83D\uDCAC"], "", "\uDBB9\uDD32", ["speech_balloon"], 16, 27
  ],
  "1f4ad": [
  ["\uD83D\uDCAD"], "", "", ["thought_balloon"], 16, 28
  ],
  "1f4ae": [
  ["\uD83D\uDCAE"], "", "\uDBBA\uDF7A", ["white_flower"], 16, 29
  ],
  "1f4af": [
  ["\uD83D\uDCAF"], "", "\uDBBA\uDF7B", ["100"], 17, 0
  ],
  "1f4b0": [
  ["\uD83D\uDCB0"], "\uE12F", "\uDBB9\uDCDD", ["moneybag"], 17, 1
  ],
  "1f4b1": [
  ["\uD83D\uDCB1"], "\uE149", "\uDBB9\uDCDE", ["currency_exchange"], 17, 2
  ],
  "1f4b2": [
  ["\uD83D\uDCB2"], "\uE12F", "\uDBB9\uDCE0", ["heavy_dollar_sign"], 17, 3
  ],
  "1f4b3": [
  ["\uD83D\uDCB3"], "", "\uDBB9\uDCE1", ["credit_card"], 17, 4
  ],
  "1f4b4": [
  ["\uD83D\uDCB4"], "", "\uDBB9\uDCE2", ["yen"], 17, 5
  ],
  "1f4b5": [
  ["\uD83D\uDCB5"], "\uE12F", "\uDBB9\uDCE3", ["dollar"], 17, 6
  ],
  "1f4b6": [
  ["\uD83D\uDCB6"], "", "", ["euro"], 17, 7
  ],
  "1f4b7": [
  ["\uD83D\uDCB7"], "", "", ["pound"], 17, 8
  ],
  "1f4b8": [
  ["\uD83D\uDCB8"], "", "\uDBB9\uDCE4", ["money_with_wings"], 17, 9
  ],
  "1f4b9": [
  ["\uD83D\uDCB9"], "\uE14A", "\uDBB9\uDCDF", ["chart"], 17, 10
  ],
  "1f4ba": [
  ["\uD83D\uDCBA"], "\uE11F", "\uDBB9\uDD37", ["seat"], 17, 11
  ],
  "1f4bb": [
  ["\uD83D\uDCBB"], "\uE00C", "\uDBB9\uDD38", ["computer"], 17, 12
  ],
  "1f4bc": [
  ["\uD83D\uDCBC"], "\uE11E", "\uDBB9\uDD3B", ["briefcase"], 17, 13
  ],
  "1f4bd": [
  ["\uD83D\uDCBD"], "\uE316", "\uDBB9\uDD3C", ["minidisc"], 17, 14
  ],
  "1f4be": [
  ["\uD83D\uDCBE"], "\uE316", "\uDBB9\uDD3D", ["floppy_disk"], 17, 15
  ],
  "1f4bf": [
  ["\uD83D\uDCBF"], "\uE126", "\uDBBA\uDC1D", ["cd"], 17, 16
  ],
  "1f4c0": [
  ["\uD83D\uDCC0"], "\uE127", "\uDBBA\uDC1E", ["dvd"], 17, 17
  ],
  "1f4c1": [
  ["\uD83D\uDCC1"], "", "\uDBB9\uDD43", ["file_folder"], 17, 18
  ],
  "1f4c2": [
  ["\uD83D\uDCC2"], "", "\uDBB9\uDD44", ["open_file_folder"], 17, 19
  ],
  "1f4c3": [
  ["\uD83D\uDCC3"], "\uE301", "\uDBB9\uDD40", ["page_with_curl"], 17, 20
  ],
  "1f4c4": [
  ["\uD83D\uDCC4"], "\uE301", "\uDBB9\uDD41", ["page_facing_up"], 17, 21
  ],
  "1f4c5": [
  ["\uD83D\uDCC5"], "", "\uDBB9\uDD42", ["date"], 17, 22
  ],
  "1f4c6": [
  ["\uD83D\uDCC6"], "", "\uDBB9\uDD49", ["calendar"], 17, 23
  ],
  "1f4c7": [
  ["\uD83D\uDCC7"], "\uE148", "\uDBB9\uDD4D", ["card_index"], 17, 24
  ],
  "1f4c8": [
  ["\uD83D\uDCC8"], "\uE14A", "\uDBB9\uDD4B", ["chart_with_upwards_trend"], 17, 25
  ],
  "1f4c9": [
  ["\uD83D\uDCC9"], "", "\uDBB9\uDD4C", ["chart_with_downwards_trend"], 17, 26
  ],
  "1f4ca": [
  ["\uD83D\uDCCA"], "\uE14A", "\uDBB9\uDD4A", ["bar_chart"], 17, 27
  ],
  "1f4cb": [
  ["\uD83D\uDCCB"], "\uE301", "\uDBB9\uDD48", ["clipboard"], 17, 28
  ],
  "1f4cc": [
  ["\uD83D\uDCCC"], "", "\uDBB9\uDD4E", ["pushpin"], 17, 29
  ],
  "1f4cd": [
  ["\uD83D\uDCCD"], "", "\uDBB9\uDD3F", ["round_pushpin"], 18, 0
  ],
  "1f4ce": [
  ["\uD83D\uDCCE"], "", "\uDBB9\uDD3A", ["paperclip"], 18, 1
  ],
  "1f4cf": [
  ["\uD83D\uDCCF"], "", "\uDBB9\uDD50", ["straight_ruler"], 18, 2
  ],
  "1f4d0": [
  ["\uD83D\uDCD0"], "", "\uDBB9\uDD51", ["triangular_ruler"], 18, 3
  ],
  "1f4d1": [
  ["\uD83D\uDCD1"], "\uE301", "\uDBB9\uDD52", ["bookmark_tabs"], 18, 4
  ],
  "1f4d2": [
  ["\uD83D\uDCD2"], "\uE148", "\uDBB9\uDD4F", ["ledger"], 18, 5
  ],
  "1f4d3": [
  ["\uD83D\uDCD3"], "\uE148", "\uDBB9\uDD45", ["notebook"], 18, 6
  ],
  "1f4d4": [
  ["\uD83D\uDCD4"], "\uE148", "\uDBB9\uDD47", ["notebook_with_decorative_cover"], 18, 7
  ],
  "1f4d5": [
  ["\uD83D\uDCD5"], "\uE148", "\uDBB9\uDD02", ["closed_book"], 18, 8
  ],
  "1f4d6": [
  ["\uD83D\uDCD6"], "\uE148", "\uDBB9\uDD46", ["book", "open_book"], 18, 9
  ],
  "1f4d7": [
  ["\uD83D\uDCD7"], "\uE148", "\uDBB9\uDCFF", ["green_book"], 18, 10
  ],
  "1f4d8": [
  ["\uD83D\uDCD8"], "\uE148", "\uDBB9\uDD00", ["blue_book"], 18, 11
  ],
  "1f4d9": [
  ["\uD83D\uDCD9"], "\uE148", "\uDBB9\uDD01", ["orange_book"], 18, 12
  ],
  "1f4da": [
  ["\uD83D\uDCDA"], "\uE148", "\uDBB9\uDD03", ["books"], 18, 13
  ],
  "1f4db": [
  ["\uD83D\uDCDB"], "", "\uDBB9\uDD04", ["name_badge"], 18, 14
  ],
  "1f4dc": [
  ["\uD83D\uDCDC"], "", "\uDBB9\uDCFD", ["scroll"], 18, 15
  ],
  "1f4dd": [
  ["\uD83D\uDCDD"], "\uE301", "\uDBB9\uDD27", ["memo", "pencil"], 18, 16
  ],
  "1f4de": [
  ["\uD83D\uDCDE"], "\uE009", "\uDBB9\uDD24", ["telephone_receiver"], 18, 17
  ],
  "1f4df": [
  ["\uD83D\uDCDF"], "", "\uDBB9\uDD22", ["pager"], 18, 18
  ],
  "1f4e0": [
  ["\uD83D\uDCE0"], "\uE00B", "\uDBB9\uDD28", ["fax"], 18, 19
  ],
  "1f4e1": [
  ["\uD83D\uDCE1"], "\uE14B", "\uDBB9\uDD31", ["satellite"], 18, 20
  ],
  "1f4e2": [
  ["\uD83D\uDCE2"], "\uE142", "\uDBB9\uDD2F", ["loudspeaker"], 18, 21
  ],
  "1f4e3": [
  ["\uD83D\uDCE3"], "\uE317", "\uDBB9\uDD30", ["mega"], 18, 22
  ],
  "1f4e4": [
  ["\uD83D\uDCE4"], "", "\uDBB9\uDD33", ["outbox_tray"], 18, 23
  ],
  "1f4e5": [
  ["\uD83D\uDCE5"], "", "\uDBB9\uDD34", ["inbox_tray"], 18, 24
  ],
  "1f4e6": [
  ["\uD83D\uDCE6"], "\uE112", "\uDBB9\uDD35", ["package"], 18, 25
  ],
  "1f4e7": [
  ["\uD83D\uDCE7"], "\uE103", "\uDBBA\uDF92", ["e-mail"], 18, 26
  ],
  "1f4e8": [
  ["\uD83D\uDCE8"], "\uE103", "\uDBB9\uDD2A", ["incoming_envelope"], 18, 27
  ],
  "1f4e9": [
  ["\uD83D\uDCE9"], "\uE103", "\uDBB9\uDD2B", ["envelope_with_arrow"], 18, 28
  ],
  "1f4ea": [
  ["\uD83D\uDCEA"], "\uE101", "\uDBB9\uDD2C", ["mailbox_closed"], 18, 29
  ],
  "1f4eb": [
  ["\uD83D\uDCEB"], "\uE101", "\uDBB9\uDD2D", ["mailbox"], 19, 0
  ],
  "1f4ec": [
  ["\uD83D\uDCEC"], "", "", ["mailbox_with_mail"], 19, 1
  ],
  "1f4ed": [
  ["\uD83D\uDCED"], "", "", ["mailbox_with_no_mail"], 19, 2
  ],
  "1f4ee": [
  ["\uD83D\uDCEE"], "\uE102", "\uDBB9\uDD2E", ["postbox"], 19, 3
  ],
  "1f4ef": [
  ["\uD83D\uDCEF"], "", "", ["postal_horn"], 19, 4
  ],
  "1f4f0": [
  ["\uD83D\uDCF0"], "", "\uDBBA\uDC22", ["newspaper"], 19, 5
  ],
  "1f4f1": [
  ["\uD83D\uDCF1"], "\uE00A", "\uDBB9\uDD25", ["iphone"], 19, 6
  ],
  "1f4f2": [
  ["\uD83D\uDCF2"], "\uE104", "\uDBB9\uDD26", ["calling"], 19, 7
  ],
  "1f4f3": [
  ["\uD83D\uDCF3"], "\uE250", "\uDBBA\uDC39", ["vibration_mode"], 19, 8
  ],
  "1f4f4": [
  ["\uD83D\uDCF4"], "\uE251", "\uDBBA\uDC3A", ["mobile_phone_off"], 19, 9
  ],
  "1f4f5": [
  ["\uD83D\uDCF5"], "", "", ["no_mobile_phones"], 19, 10
  ],
  "1f4f6": [
  ["\uD83D\uDCF6"], "\uE20B", "\uDBBA\uDC38", ["signal_strength"], 19, 11
  ],
  "1f4f7": [
  ["\uD83D\uDCF7"], "\uE008", "\uDBB9\uDCEF", ["camera"], 19, 12
  ],
  "1f4f9": [
  ["\uD83D\uDCF9"], "\uE03D", "\uDBB9\uDCF9", ["video_camera"], 19, 13
  ],
  "1f4fa": [
  ["\uD83D\uDCFA"], "\uE12A", "\uDBBA\uDC1C", ["tv"], 19, 14
  ],
  "1f4fb": [
  ["\uD83D\uDCFB"], "\uE128", "\uDBBA\uDC1F", ["radio"], 19, 15
  ],
  "1f4fc": [
  ["\uD83D\uDCFC"], "\uE129", "\uDBBA\uDC20", ["vhs"], 19, 16
  ],
  "1f500": [
  ["\uD83D\uDD00"], "", "", ["twisted_rightwards_arrows"], 19, 17
  ],
  "1f501": [
  ["\uD83D\uDD01"], "", "", ["repeat"], 19, 18
  ],
  "1f502": [
  ["\uD83D\uDD02"], "", "", ["repeat_one"], 19, 19
  ],
  "1f503": [
  ["\uD83D\uDD03"], "", "\uDBBA\uDF91", ["arrows_clockwise"], 19, 20
  ],
  "1f504": [
  ["\uD83D\uDD04"], "", "", ["arrows_counterclockwise"], 19, 21
  ],
  "1f505": [
  ["\uD83D\uDD05"], "", "", ["low_brightness"], 19, 22
  ],
  "1f506": [
  ["\uD83D\uDD06"], "", "", ["high_brightness"], 19, 23
  ],
  "1f507": [
  ["\uD83D\uDD07"], "", "", ["mute"], 19, 24
  ],
  "1f508": [
  ["\uD83D\uDD08"], "", "", ["speaker"], 19, 25
  ],
  "1f509": [
  ["\uD83D\uDD09"], "", "", ["sound"], 19, 26
  ],
  "1f50a": [
  ["\uD83D\uDD0A"], "\uE141", "\uDBBA\uDC21", ["loud_sound"], 19, 27
  ],
  "1f50b": [
  ["\uD83D\uDD0B"], "", "\uDBB9\uDCFC", ["battery"], 19, 28
  ],
  "1f50c": [
  ["\uD83D\uDD0C"], "", "\uDBB9\uDCFE", ["electric_plug"], 19, 29
  ],
  "1f50d": [
  ["\uD83D\uDD0D"], "\uE114", "\uDBBA\uDF85", ["mag"], 20, 0
  ],
  "1f50e": [
  ["\uD83D\uDD0E"], "\uE114", "\uDBBA\uDF8D", ["mag_right"], 20, 1
  ],
  "1f50f": [
  ["\uD83D\uDD0F"], "\uE144", "\uDBBA\uDF90", ["lock_with_ink_pen"], 20, 2
  ],
  "1f510": [
  ["\uD83D\uDD10"], "\uE144", "\uDBBA\uDF8A", ["closed_lock_with_key"], 20, 3
  ],
  "1f511": [
  ["\uD83D\uDD11"], "\uE03F", "\uDBBA\uDF82", ["key"], 20, 4
  ],
  "1f512": [
  ["\uD83D\uDD12"], "\uE144", "\uDBBA\uDF86", ["lock"], 20, 5
  ],
  "1f513": [
  ["\uD83D\uDD13"], "\uE145", "\uDBBA\uDF87", ["unlock"], 20, 6
  ],
  "1f514": [
  ["\uD83D\uDD14"], "\uE325", "\uDBB9\uDCF2", ["bell"], 20, 7
  ],
  "1f515": [
  ["\uD83D\uDD15"], "", "", ["no_bell"], 20, 8
  ],
  "1f516": [
  ["\uD83D\uDD16"], "", "\uDBBA\uDF8F", ["bookmark"], 20, 9
  ],
  "1f517": [
  ["\uD83D\uDD17"], "", "\uDBBA\uDF4B", ["link"], 20, 10
  ],
  "1f518": [
  ["\uD83D\uDD18"], "", "\uDBBA\uDF8C", ["radio_button"], 20, 11
  ],
  "1f519": [
  ["\uD83D\uDD19"], "\uE235", "\uDBBA\uDF8E", ["back"], 20, 12
  ],
  "1f51a": [
  ["\uD83D\uDD1A"], "", "\uDBB8\uDC1A", ["end"], 20, 13
  ],
  "1f51b": [
  ["\uD83D\uDD1B"], "", "\uDBB8\uDC19", ["on"], 20, 14
  ],
  "1f51c": [
  ["\uD83D\uDD1C"], "", "\uDBB8\uDC18", ["soon"], 20, 15
  ],
  "1f51d": [
  ["\uD83D\uDD1D"], "\uE24C", "\uDBBA\uDF42", ["top"], 20, 16
  ],
  "1f51e": [
  ["\uD83D\uDD1E"], "\uE207", "\uDBBA\uDF25", ["underage"], 20, 17
  ],
  "1f51f": [
  ["\uD83D\uDD1F"], "", "\uDBBA\uDC3B", ["keycap_ten"], 20, 18
  ],
  "1f520": [
  ["\uD83D\uDD20"], "", "\uDBBA\uDF7C", ["capital_abcd"], 20, 19
  ],
  "1f521": [
  ["\uD83D\uDD21"], "", "\uDBBA\uDF7D", ["abcd"], 20, 20
  ],
  "1f522": [
  ["\uD83D\uDD22"], "", "\uDBBA\uDF7E", ["1234"], 20, 21
  ],
  "1f523": [
  ["\uD83D\uDD23"], "", "\uDBBA\uDF7F", ["symbols"], 20, 22
  ],
  "1f524": [
  ["\uD83D\uDD24"], "", "\uDBBA\uDF80", ["abc"], 20, 23
  ],
  "1f525": [
  ["\uD83D\uDD25"], "\uE11D", "\uDBB9\uDCF6", ["fire"], 20, 24
  ],
  "1f526": [
  ["\uD83D\uDD26"], "", "\uDBB9\uDCFB", ["flashlight"], 20, 25
  ],
  "1f527": [
  ["\uD83D\uDD27"], "", "\uDBB9\uDCC9", ["wrench"], 20, 26
  ],
  "1f528": [
  ["\uD83D\uDD28"], "\uE116", "\uDBB9\uDCCA", ["hammer"], 20, 27
  ],
  "1f529": [
  ["\uD83D\uDD29"], "", "\uDBB9\uDCCB", ["nut_and_bolt"], 20, 28
  ],
  "1f52a": [
  ["\uD83D\uDD2A"], "", "\uDBB9\uDCFA", ["hocho", "knife"], 20, 29
  ],
  "1f52b": [
  ["\uD83D\uDD2B"], "\uE113", "\uDBB9\uDCF5", ["gun"], 21, 0
  ],
  "1f52c": [
  ["\uD83D\uDD2C"], "", "", ["microscope"], 21, 1
  ],
  "1f52d": [
  ["\uD83D\uDD2D"], "", "", ["telescope"], 21, 2
  ],
  "1f52e": [
  ["\uD83D\uDD2E"], "\uE23E", "\uDBB9\uDCF7", ["crystal_ball"], 21, 3
  ],
  "1f52f": [
  ["\uD83D\uDD2F"], "\uE23E", "\uDBB9\uDCF8", ["six_pointed_star"], 21, 4
  ],
  "1f530": [
  ["\uD83D\uDD30"], "\uE209", "\uDBB8\uDC44", ["beginner"], 21, 5
  ],
  "1f531": [
  ["\uD83D\uDD31"], "\uE031", "\uDBB9\uDCD2", ["trident"], 21, 6
  ],
  "1f532": [
  ["\uD83D\uDD32"], "\uE21A", "\uDBBA\uDF64", ["black_square_button"], 21, 7
  ],
  "1f533": [
  ["\uD83D\uDD33"], "\uE21B", "\uDBBA\uDF67", ["white_square_button"], 21, 8
  ],
  "1f534": [
  ["\uD83D\uDD34"], "\uE219", "\uDBBA\uDF63", ["red_circle"], 21, 9
  ],
  "1f535": [
  ["\uD83D\uDD35"], "\uE21A", "\uDBBA\uDF64", ["large_blue_circle"], 21, 10
  ],
  "1f536": [
  ["\uD83D\uDD36"], "\uE21B", "\uDBBA\uDF73", ["large_orange_diamond"], 21, 11
  ],
  "1f537": [
  ["\uD83D\uDD37"], "\uE21B", "\uDBBA\uDF74", ["large_blue_diamond"], 21, 12
  ],
  "1f538": [
  ["\uD83D\uDD38"], "\uE21B", "\uDBBA\uDF75", ["small_orange_diamond"], 21, 13
  ],
  "1f539": [
  ["\uD83D\uDD39"], "\uE21B", "\uDBBA\uDF76", ["small_blue_diamond"], 21, 14
  ],
  "1f53a": [
  ["\uD83D\uDD3A"], "", "\uDBBA\uDF78", ["small_red_triangle"], 21, 15
  ],
  "1f53b": [
  ["\uD83D\uDD3B"], "", "\uDBBA\uDF79", ["small_red_triangle_down"], 21, 16
  ],
  "1f53c": [
  ["\uD83D\uDD3C"], "", "\uDBBA\uDF01", ["arrow_up_small"], 21, 17
  ],
  "1f53d": [
  ["\uD83D\uDD3D"], "", "\uDBBA\uDF00", ["arrow_down_small"], 21, 18
  ],
  "1f550": [
  ["\uD83D\uDD50"], "\uE024", "\uDBB8\uDC1E", ["clock1"], 21, 19
  ],
  "1f551": [
  ["\uD83D\uDD51"], "\uE025", "\uDBB8\uDC1F", ["clock2"], 21, 20
  ],
  "1f552": [
  ["\uD83D\uDD52"], "\uE026", "\uDBB8\uDC20", ["clock3"], 21, 21
  ],
  "1f553": [
  ["\uD83D\uDD53"], "\uE027", "\uDBB8\uDC21", ["clock4"], 21, 22
  ],
  "1f554": [
  ["\uD83D\uDD54"], "\uE028", "\uDBB8\uDC22", ["clock5"], 21, 23
  ],
  "1f555": [
  ["\uD83D\uDD55"], "\uE029", "\uDBB8\uDC23", ["clock6"], 21, 24
  ],
  "1f556": [
  ["\uD83D\uDD56"], "\uE02A", "\uDBB8\uDC24", ["clock7"], 21, 25
  ],
  "1f557": [
  ["\uD83D\uDD57"], "\uE02B", "\uDBB8\uDC25", ["clock8"], 21, 26
  ],
  "1f558": [
  ["\uD83D\uDD58"], "\uE02C", "\uDBB8\uDC26", ["clock9"], 21, 27
  ],
  "1f559": [
  ["\uD83D\uDD59"], "\uE02D", "\uDBB8\uDC27", ["clock10"], 21, 28
  ],
  "1f55a": [
  ["\uD83D\uDD5A"], "\uE02E", "\uDBB8\uDC28", ["clock11"], 21, 29
  ],
  "1f55b": [
  ["\uD83D\uDD5B"], "\uE02F", "\uDBB8\uDC29", ["clock12"], 22, 0
  ],
  "1f55c": [
  ["\uD83D\uDD5C"], "", "", ["clock130"], 22, 1
  ],
  "1f55d": [
  ["\uD83D\uDD5D"], "", "", ["clock230"], 22, 2
  ],
  "1f55e": [
  ["\uD83D\uDD5E"], "", "", ["clock330"], 22, 3
  ],
  "1f55f": [
  ["\uD83D\uDD5F"], "", "", ["clock430"], 22, 4
  ],
  "1f560": [
  ["\uD83D\uDD60"], "", "", ["clock530"], 22, 5
  ],
  "1f561": [
  ["\uD83D\uDD61"], "", "", ["clock630"], 22, 6
  ],
  "1f562": [
  ["\uD83D\uDD62"], "", "", ["clock730"], 22, 7
  ],
  "1f563": [
  ["\uD83D\uDD63"], "", "", ["clock830"], 22, 8
  ],
  "1f564": [
  ["\uD83D\uDD64"], "", "", ["clock930"], 22, 9
  ],
  "1f565": [
  ["\uD83D\uDD65"], "", "", ["clock1030"], 22, 10
  ],
  "1f566": [
  ["\uD83D\uDD66"], "", "", ["clock1130"], 22, 11
  ],
  "1f567": [
  ["\uD83D\uDD67"], "", "", ["clock1230"], 22, 12
  ],
  "1f5fb": [
  ["\uD83D\uDDFB"], "\uE03B", "\uDBB9\uDCC3", ["mount_fuji"], 22, 13
  ],
  "1f5fc": [
  ["\uD83D\uDDFC"], "\uE509", "\uDBB9\uDCC4", ["tokyo_tower"], 22, 14
  ],
  "1f5fd": [
  ["\uD83D\uDDFD"], "\uE51D", "\uDBB9\uDCC6", ["statue_of_liberty"], 22, 15
  ],
  "1f5fe": [
  ["\uD83D\uDDFE"], "", "\uDBB9\uDCC7", ["japan"], 22, 16
  ],
  "1f5ff": [
  ["\uD83D\uDDFF"], "", "\uDBB9\uDCC8", ["moyai"], 22, 17
  ],
  "1f600": [
  ["\uD83D\uDE00"], "", "", ["grinning"], 22, 18, ":D"
  ],
  "1f601": [
  ["\uD83D\uDE01"], "\uE404", "\uDBB8\uDF33", ["grin"], 22, 19
  ],
  "1f602": [
  ["\uD83D\uDE02"], "\uE412", "\uDBB8\uDF34", ["joy"], 22, 20
  ],
  "1f603": [
  ["\uD83D\uDE03"], "\uE057", "\uDBB8\uDF30", ["smiley"], 22, 21, ":)"
  ],
  "1f604": [
  ["\uD83D\uDE04"], "\uE415", "\uDBB8\uDF38", ["smile"], 22, 22, ":)"
  ],
  "1f605": [
  ["\uD83D\uDE05"], "\uE415\uE331", "\uDBB8\uDF31", ["sweat_smile"], 22, 23
  ],
  "1f606": [
  ["\uD83D\uDE06"], "\uE40A", "\uDBB8\uDF32", ["satisfied"], 22, 24
  ],
  "1f607": [
  ["\uD83D\uDE07"], "", "", ["innocent"], 22, 25
  ],
  "1f608": [
  ["\uD83D\uDE08"], "", "", ["smiling_imp"], 22, 26
  ],
  "1f609": [
  ["\uD83D\uDE09"], "\uE405", "\uDBB8\uDF47", ["wink"], 22, 27, ";)"
  ],
  "1f60a": [
  ["\uD83D\uDE0A"], "\uE056", "\uDBB8\uDF35", ["blush"], 22, 28
  ],
  "1f60b": [
  ["\uD83D\uDE0B"], "\uE056", "\uDBB8\uDF2B", ["yum"], 22, 29
  ],
  "1f60c": [
  ["\uD83D\uDE0C"], "\uE40A", "\uDBB8\uDF3E", ["relieved"], 23, 0
  ],
  "1f60d": [
  ["\uD83D\uDE0D"], "\uE106", "\uDBB8\uDF27", ["heart_eyes"], 23, 1
  ],
  "1f60e": [
  ["\uD83D\uDE0E"], "", "", ["sunglasses"], 23, 2
  ],
  "1f60f": [
  ["\uD83D\uDE0F"], "\uE402", "\uDBB8\uDF43", ["smirk"], 23, 3
  ],
  "1f610": [
  ["\uD83D\uDE10"], "", "", ["neutral_face"], 23, 4
  ],
  "1f611": [
  ["\uD83D\uDE11"], "", "", ["expressionless"], 23, 5
  ],
  "1f612": [
  ["\uD83D\uDE12"], "\uE40E", "\uDBB8\uDF26", ["unamused"], 23, 6
  ],
  "1f613": [
  ["\uD83D\uDE13"], "\uE108", "\uDBB8\uDF44", ["sweat"], 23, 7
  ],
  "1f614": [
  ["\uD83D\uDE14"], "\uE403", "\uDBB8\uDF40", ["pensive"], 23, 8
  ],
  "1f615": [
  ["\uD83D\uDE15"], "", "", ["confused"], 23, 9
  ],
  "1f616": [
  ["\uD83D\uDE16"], "\uE407", "\uDBB8\uDF3F", ["confounded"], 23, 10
  ],
  "1f617": [
  ["\uD83D\uDE17"], "", "", ["kissing"], 23, 11
  ],
  "1f618": [
  ["\uD83D\uDE18"], "\uE418", "\uDBB8\uDF2C", ["kissing_heart"], 23, 12
  ],
  "1f619": [
  ["\uD83D\uDE19"], "", "", ["kissing_smiling_eyes"], 23, 13
  ],
  "1f61a": [
  ["\uD83D\uDE1A"], "\uE417", "\uDBB8\uDF2D", ["kissing_closed_eyes"], 23, 14
  ],
  "1f61b": [
  ["\uD83D\uDE1B"], "", "", ["stuck_out_tongue"], 23, 15, ":p"
  ],
  "1f61c": [
  ["\uD83D\uDE1C"], "\uE105", "\uDBB8\uDF29", ["stuck_out_tongue_winking_eye"], 23, 16, ";p"
  ],
  "1f61d": [
  ["\uD83D\uDE1D"], "\uE409", "\uDBB8\uDF2A", ["stuck_out_tongue_closed_eyes"], 23, 17
  ],
  "1f61e": [
  ["\uD83D\uDE1E"], "\uE058", "\uDBB8\uDF23", ["disappointed"], 23, 18, ":("
  ],
  "1f61f": [
  ["\uD83D\uDE1F"], "", "", ["worried"], 23, 19
  ],
  "1f620": [
  ["\uD83D\uDE20"], "\uE059", "\uDBB8\uDF20", ["angry"], 23, 20
  ],
  "1f621": [
  ["\uD83D\uDE21"], "\uE416", "\uDBB8\uDF3D", ["rage"], 23, 21
  ],
  "1f622": [
  ["\uD83D\uDE22"], "\uE413", "\uDBB8\uDF39", ["cry"], 23, 22, ":'("
  ],
  "1f623": [
  ["\uD83D\uDE23"], "\uE406", "\uDBB8\uDF3C", ["persevere"], 23, 23
  ],
  "1f624": [
  ["\uD83D\uDE24"], "\uE404", "\uDBB8\uDF28", ["triumph"], 23, 24
  ],
  "1f625": [
  ["\uD83D\uDE25"], "\uE401", "\uDBB8\uDF45", ["disappointed_relieved"], 23, 25
  ],
  "1f626": [
  ["\uD83D\uDE26"], "", "", ["frowning"], 23, 26
  ],
  "1f627": [
  ["\uD83D\uDE27"], "", "", ["anguished"], 23, 27
  ],
  "1f628": [
  ["\uD83D\uDE28"], "\uE40B", "\uDBB8\uDF3B", ["fearful"], 23, 28
  ],
  "1f629": [
  ["\uD83D\uDE29"], "\uE403", "\uDBB8\uDF21", ["weary"], 23, 29
  ],
  "1f62a": [
  ["\uD83D\uDE2A"], "\uE408", "\uDBB8\uDF42", ["sleepy"], 24, 0
  ],
  "1f62b": [
  ["\uD83D\uDE2B"], "\uE406", "\uDBB8\uDF46", ["tired_face"], 24, 1
  ],
  "1f62c": [
  ["\uD83D\uDE2C"], "", "", ["grimacing"], 24, 2
  ],
  "1f62d": [
  ["\uD83D\uDE2D"], "\uE411", "\uDBB8\uDF3A", ["sob"], 24, 3, ":'("
  ],
  "1f62e": [
  ["\uD83D\uDE2E"], "", "", ["open_mouth"], 24, 4
  ],
  "1f62f": [
  ["\uD83D\uDE2F"], "", "", ["hushed"], 24, 5
  ],
  "1f630": [
  ["\uD83D\uDE30"], "\uE40F", "\uDBB8\uDF25", ["cold_sweat"], 24, 6
  ],
  "1f631": [
  ["\uD83D\uDE31"], "\uE107", "\uDBB8\uDF41", ["scream"], 24, 7
  ],
  "1f632": [
  ["\uD83D\uDE32"], "\uE410", "\uDBB8\uDF22", ["astonished"], 24, 8
  ],
  "1f633": [
  ["\uD83D\uDE33"], "\uE40D", "\uDBB8\uDF2F", ["flushed"], 24, 9
  ],
  "1f634": [
  ["\uD83D\uDE34"], "", "", ["sleeping"], 24, 10
  ],
  "1f635": [
  ["\uD83D\uDE35"], "\uE406", "\uDBB8\uDF24", ["dizzy_face"], 24, 11
  ],
  "1f636": [
  ["\uD83D\uDE36"], "", "", ["no_mouth"], 24, 12
  ],
  "1f637": [
  ["\uD83D\uDE37"], "\uE40C", "\uDBB8\uDF2E", ["mask"], 24, 13
  ],
  "1f638": [
  ["\uD83D\uDE38"], "\uE404", "\uDBB8\uDF49", ["smile_cat"], 24, 14
  ],
  "1f639": [
  ["\uD83D\uDE39"], "\uE412", "\uDBB8\uDF4A", ["joy_cat"], 24, 15
  ],
  "1f63a": [
  ["\uD83D\uDE3A"], "\uE057", "\uDBB8\uDF48", ["smiley_cat"], 24, 16
  ],
  "1f63b": [
  ["\uD83D\uDE3B"], "\uE106", "\uDBB8\uDF4C", ["heart_eyes_cat"], 24, 17
  ],
  "1f63c": [
  ["\uD83D\uDE3C"], "\uE404", "\uDBB8\uDF4F", ["smirk_cat"], 24, 18
  ],
  "1f63d": [
  ["\uD83D\uDE3D"], "\uE418", "\uDBB8\uDF4B", ["kissing_cat"], 24, 19
  ],
  "1f63e": [
  ["\uD83D\uDE3E"], "\uE416", "\uDBB8\uDF4E", ["pouting_cat"], 24, 20
  ],
  "1f63f": [
  ["\uD83D\uDE3F"], "\uE413", "\uDBB8\uDF4D", ["crying_cat_face"], 24, 21
  ],
  "1f640": [
  ["\uD83D\uDE40"], "\uE403", "\uDBB8\uDF50", ["scream_cat"], 24, 22
  ],
  "1f645": [
  ["\uD83D\uDE45"], "\uE423", "\uDBB8\uDF51", ["no_good"], 24, 23
  ],
  "1f646": [
  ["\uD83D\uDE46"], "\uE424", "\uDBB8\uDF52", ["ok_woman"], 24, 24
  ],
  "1f647": [
  ["\uD83D\uDE47"], "\uE426", "\uDBB8\uDF53", ["bow"], 24, 25
  ],
  "1f648": [
  ["\uD83D\uDE48"], "", "\uDBB8\uDF54", ["see_no_evil"], 24, 26
  ],
  "1f649": [
  ["\uD83D\uDE49"], "", "\uDBB8\uDF56", ["hear_no_evil"], 24, 27
  ],
  "1f64a": [
  ["\uD83D\uDE4A"], "", "\uDBB8\uDF55", ["speak_no_evil"], 24, 28
  ],
  "1f64b": [
  ["\uD83D\uDE4B"], "\uE012", "\uDBB8\uDF57", ["raising_hand"], 24, 29
  ],
  "1f64c": [
  ["\uD83D\uDE4C"], "\uE427", "\uDBB8\uDF58", ["raised_hands"], 25, 0
  ],
  "1f64d": [
  ["\uD83D\uDE4D"], "\uE403", "\uDBB8\uDF59", ["person_frowning"], 25, 1
  ],
  "1f64e": [
  ["\uD83D\uDE4E"], "\uE416", "\uDBB8\uDF5A", ["person_with_pouting_face"], 25, 2
  ],
  "1f64f": [
  ["\uD83D\uDE4F"], "\uE41D", "\uDBB8\uDF5B", ["pray"], 25, 3
  ],
  "1f680": [
  ["\uD83D\uDE80"], "\uE10D", "\uDBB9\uDFED", ["rocket"], 25, 4
  ],
  "1f681": [
  ["\uD83D\uDE81"], "", "", ["helicopter"], 25, 5
  ],
  "1f682": [
  ["\uD83D\uDE82"], "", "", ["steam_locomotive"], 25, 6
  ],
  "1f683": [
  ["\uD83D\uDE83"], "\uE01E", "\uDBB9\uDFDF", ["railway_car"], 25, 7
  ],
  "1f684": [
  ["\uD83D\uDE84"], "\uE435", "\uDBB9\uDFE2", ["bullettrain_side"], 25, 8
  ],
  "1f685": [
  ["\uD83D\uDE85"], "\uE01F", "\uDBB9\uDFE3", ["bullettrain_front"], 25, 9
  ],
  "1f686": [
  ["\uD83D\uDE86"], "", "", ["train2"], 25, 10
  ],
  "1f687": [
  ["\uD83D\uDE87"], "\uE434", "\uDBB9\uDFE0", ["metro"], 25, 11
  ],
  "1f688": [
  ["\uD83D\uDE88"], "", "", ["light_rail"], 25, 12
  ],
  "1f689": [
  ["\uD83D\uDE89"], "\uE039", "\uDBB9\uDFEC", ["station"], 25, 13
  ],
  "1f68a": [
  ["\uD83D\uDE8A"], "", "", ["tram"], 25, 14
  ],
  "1f68b": [
  ["\uD83D\uDE8B"], "", "", ["train"], 25, 15
  ],
  "1f68c": [
  ["\uD83D\uDE8C"], "\uE159", "\uDBB9\uDFE6", ["bus"], 25, 16
  ],
  "1f68d": [
  ["\uD83D\uDE8D"], "", "", ["oncoming_bus"], 25, 17
  ],
  "1f68e": [
  ["\uD83D\uDE8E"], "", "", ["trolleybus"], 25, 18
  ],
  "1f68f": [
  ["\uD83D\uDE8F"], "\uE150", "\uDBB9\uDFE7", ["busstop"], 25, 19
  ],
  "1f690": [
  ["\uD83D\uDE90"], "", "", ["minibus"], 25, 20
  ],
  "1f691": [
  ["\uD83D\uDE91"], "\uE431", "\uDBB9\uDFF3", ["ambulance"], 25, 21
  ],
  "1f692": [
  ["\uD83D\uDE92"], "\uE430", "\uDBB9\uDFF2", ["fire_engine"], 25, 22
  ],
  "1f693": [
  ["\uD83D\uDE93"], "\uE432", "\uDBB9\uDFF4", ["police_car"], 25, 23
  ],
  "1f694": [
  ["\uD83D\uDE94"], "", "", ["oncoming_police_car"], 25, 24
  ],
  "1f695": [
  ["\uD83D\uDE95"], "\uE15A", "\uDBB9\uDFEF", ["taxi"], 25, 25
  ],
  "1f696": [
  ["\uD83D\uDE96"], "", "", ["oncoming_taxi"], 25, 26
  ],
  "1f697": [
  ["\uD83D\uDE97"], "\uE01B", "\uDBB9\uDFE4", ["car", "red_car"], 25, 27
  ],
  "1f698": [
  ["\uD83D\uDE98"], "", "", ["oncoming_automobile"], 25, 28
  ],
  "1f699": [
  ["\uD83D\uDE99"], "\uE42E", "\uDBB9\uDFE5", ["blue_car"], 25, 29
  ],
  "1f69a": [
  ["\uD83D\uDE9A"], "\uE42F", "\uDBB9\uDFF1", ["truck"], 26, 0
  ],
  "1f69b": [
  ["\uD83D\uDE9B"], "", "", ["articulated_lorry"], 26, 1
  ],
  "1f69c": [
  ["\uD83D\uDE9C"], "", "", ["tractor"], 26, 2
  ],
  "1f69d": [
  ["\uD83D\uDE9D"], "", "", ["monorail"], 26, 3
  ],
  "1f69e": [
  ["\uD83D\uDE9E"], "", "", ["mountain_railway"], 26, 4
  ],
  "1f69f": [
  ["\uD83D\uDE9F"], "", "", ["suspension_railway"], 26, 5
  ],
  "1f6a0": [
  ["\uD83D\uDEA0"], "", "", ["mountain_cableway"], 26, 6
  ],
  "1f6a1": [
  ["\uD83D\uDEA1"], "", "", ["aerial_tramway"], 26, 7
  ],
  "1f6a2": [
  ["\uD83D\uDEA2"], "\uE202", "\uDBB9\uDFE8", ["ship"], 26, 8
  ],
  "1f6a3": [
  ["\uD83D\uDEA3"], "", "", ["rowboat"], 26, 9
  ],
  "1f6a4": [
  ["\uD83D\uDEA4"], "\uE135", "\uDBB9\uDFEE", ["speedboat"], 26, 10
  ],
  "1f6a5": [
  ["\uD83D\uDEA5"], "\uE14E", "\uDBB9\uDFF7", ["traffic_light"], 26, 11
  ],
  "1f6a6": [
  ["\uD83D\uDEA6"], "", "", ["vertical_traffic_light"], 26, 12
  ],
  "1f6a7": [
  ["\uD83D\uDEA7"], "\uE137", "\uDBB9\uDFF8", ["construction"], 26, 13
  ],
  "1f6a8": [
  ["\uD83D\uDEA8"], "\uE432", "\uDBB9\uDFF9", ["rotating_light"], 26, 14
  ],
  "1f6a9": [
  ["\uD83D\uDEA9"], "", "\uDBBA\uDF22", ["triangular_flag_on_post"], 26, 15
  ],
  "1f6aa": [
  ["\uD83D\uDEAA"], "", "\uDBB9\uDCF3", ["door"], 26, 16
  ],
  "1f6ab": [
  ["\uD83D\uDEAB"], "", "\uDBBA\uDF48", ["no_entry_sign"], 26, 17
  ],
  "1f6ac": [
  ["\uD83D\uDEAC"], "\uE30E", "\uDBBA\uDF1E", ["smoking"], 26, 18
  ],
  "1f6ad": [
  ["\uD83D\uDEAD"], "\uE208", "\uDBBA\uDF1F", ["no_smoking"], 26, 19
  ],
  "1f6ae": [
  ["\uD83D\uDEAE"], "", "", ["put_litter_in_its_place"], 26, 20
  ],
  "1f6af": [
  ["\uD83D\uDEAF"], "", "", ["do_not_litter"], 26, 21
  ],
  "1f6b0": [
  ["\uD83D\uDEB0"], "", "", ["potable_water"], 26, 22
  ],
  "1f6b1": [
  ["\uD83D\uDEB1"], "", "", ["non-potable_water"], 26, 23
  ],
  "1f6b2": [
  ["\uD83D\uDEB2"], "\uE136", "\uDBB9\uDFEB", ["bike"], 26, 24
  ],
  "1f6b3": [
  ["\uD83D\uDEB3"], "", "", ["no_bicycles"], 26, 25
  ],
  "1f6b4": [
  ["\uD83D\uDEB4"], "", "", ["bicyclist"], 26, 26
  ],
  "1f6b5": [
  ["\uD83D\uDEB5"], "", "", ["mountain_bicyclist"], 26, 27
  ],
  "1f6b6": [
  ["\uD83D\uDEB6"], "\uE201", "\uDBB9\uDFF0", ["walking"], 26, 28
  ],
  "1f6b7": [
  ["\uD83D\uDEB7"], "", "", ["no_pedestrians"], 26, 29
  ],
  "1f6b8": [
  ["\uD83D\uDEB8"], "", "", ["children_crossing"], 27, 0
  ],
  "1f6b9": [
  ["\uD83D\uDEB9"], "\uE138", "\uDBBA\uDF33", ["mens"], 27, 1
  ],
  "1f6ba": [
  ["\uD83D\uDEBA"], "\uE139", "\uDBBA\uDF34", ["womens"], 27, 2
  ],
  "1f6bb": [
  ["\uD83D\uDEBB"], "\uE151", "\uDBB9\uDD06", ["restroom"], 27, 3
  ],
  "1f6bc": [
  ["\uD83D\uDEBC"], "\uE13A", "\uDBBA\uDF35", ["baby_symbol"], 27, 4
  ],
  "1f6bd": [
  ["\uD83D\uDEBD"], "\uE140", "\uDBB9\uDD07", ["toilet"], 27, 5
  ],
  "1f6be": [
  ["\uD83D\uDEBE"], "\uE309", "\uDBB9\uDD08", ["wc"], 27, 6
  ],
  "1f6bf": [
  ["\uD83D\uDEBF"], "", "", ["shower"], 27, 7
  ],
  "1f6c0": [
  ["\uD83D\uDEC0"], "\uE13F", "\uDBB9\uDD05", ["bath"], 27, 8
  ],
  "1f6c1": [
  ["\uD83D\uDEC1"], "", "", ["bathtub"], 27, 9
  ],
  "1f6c2": [
  ["\uD83D\uDEC2"], "", "", ["passport_control"], 27, 10
  ],
  "1f6c3": [
  ["\uD83D\uDEC3"], "", "", ["customs"], 27, 11
  ],
  "1f6c4": [
  ["\uD83D\uDEC4"], "", "", ["baggage_claim"], 27, 12
  ],
  "1f6c5": [
  ["\uD83D\uDEC5"], "", "", ["left_luggage"], 27, 13
  ],
  "0023-20e3": [
  ["\u0023\uFE0F\u20E3", "\u0023\u20E3"], "\uE210", "\uDBBA\uDC2C", ["hash"], 27, 14
  ],
  "0030-20e3": [
  ["\u0030\uFE0F\u20E3", "\u0030\u20E3"], "\uE225", "\uDBBA\uDC37", ["zero"], 27, 15
  ],
  "0031-20e3": [
  ["\u0031\uFE0F\u20E3", "\u0031\u20E3"], "\uE21C", "\uDBBA\uDC2E", ["one"], 27, 16
  ],
  "0032-20e3": [
  ["\u0032\uFE0F\u20E3", "\u0032\u20E3"], "\uE21D", "\uDBBA\uDC2F", ["two"], 27, 17
  ],
  "0033-20e3": [
  ["\u0033\uFE0F\u20E3", "\u0033\u20E3"], "\uE21E", "\uDBBA\uDC30", ["three"], 27, 18
  ],
  "0034-20e3": [
  ["\u0034\uFE0F\u20E3", "\u0034\u20E3"], "\uE21F", "\uDBBA\uDC31", ["four"], 27, 19
  ],
  "0035-20e3": [
  ["\u0035\uFE0F\u20E3", "\u0035\u20E3"], "\uE220", "\uDBBA\uDC32", ["five"], 27, 20
  ],
  "0036-20e3": [
  ["\u0036\uFE0F\u20E3", "\u0036\u20E3"], "\uE221", "\uDBBA\uDC33", ["six"], 27, 21
  ],
  "0037-20e3": [
  ["\u0037\uFE0F\u20E3", "\u0037\u20E3"], "\uE222", "\uDBBA\uDC34", ["seven"], 27, 22
  ],
  "0038-20e3": [
  ["\u0038\uFE0F\u20E3", "\u0038\u20E3"], "\uE223", "\uDBBA\uDC35", ["eight"], 27, 23
  ],
  "0039-20e3": [
  ["\u0039\uFE0F\u20E3", "\u0039\u20E3"], "\uE224", "\uDBBA\uDC36", ["nine"], 27, 24
  ],
  "1f1e8-1f1f3": [
  ["\uD83C\uDDE8\uD83C\uDDF3"], "\uE513", "\uDBB9\uDCED", ["cn"], 27, 25
  ],
  "1f1e9-1f1ea": [
  ["\uD83C\uDDE9\uD83C\uDDEA"], "\uE50E", "\uDBB9\uDCE8", ["de"], 27, 26
  ],
  "1f1ea-1f1f8": [
  ["\uD83C\uDDEA\uD83C\uDDF8"], "\uE511", "\uDBB9\uDCEB", ["es"], 27, 27
  ],
  "1f1eb-1f1f7": [
  ["\uD83C\uDDEB\uD83C\uDDF7"], "\uE50D", "\uDBB9\uDCE7", ["fr"], 27, 28
  ],
  "1f1ec-1f1e7": [
  ["\uD83C\uDDEC\uD83C\uDDE7"], "\uE510", "\uDBB9\uDCEA", ["gb", "uk"], 27, 29
  ],
  "1f1ee-1f1f9": [
  ["\uD83C\uDDEE\uD83C\uDDF9"], "\uE50F", "\uDBB9\uDCE9", ["it"], 28, 0
  ],
  "1f1ef-1f1f5": [
  ["\uD83C\uDDEF\uD83C\uDDF5"], "\uE50B", "\uDBB9\uDCE5", ["jp"], 28, 1
  ],
  "1f1f0-1f1f7": [
  ["\uD83C\uDDF0\uD83C\uDDF7"], "\uE514", "\uDBB9\uDCEE", ["kr"], 28, 2
  ],
  "1f1f7-1f1fa": [
  ["\uD83C\uDDF7\uD83C\uDDFA"], "\uE512", "\uDBB9\uDCEC", ["ru"], 28, 3
  ],
  "1f1fa-1f1f8": [
  ["\uD83C\uDDFA\uD83C\uDDF8"], "\uE50C", "\uDBB9\uDCE6", ["us"], 28, 4
  ]
};

Config.smileys = {
  "<3": "heart",
  "<\/3": "broken_heart",
  ":)": "blush",
  "(:": "blush",
  ":-)": "blush",
  "C:": "smile",
  "c:": "smile",
  ":D": "smile",
  ":-D": "smile",
  ";)": "wink",
  ";-)": "wink",
  "):": "disappointed",
  ":(": "disappointed",
  ":-(": "disappointed",
  ":'(": "cry",
  "=)": "smiley",
  "=-)": "smiley",
  ":*": "kiss",
  ":-*": "kiss",
  ":>": "laughing",
  ":->": "laughing",
  "8)": "sunglasses",
  ":\\\\": "confused",
  ":-\\\\": "confused",
  ":\/": "confused",
  ":-\/": "confused",
  ":|": "neutral_face",
  ":-|": "neutral_face",
  ":o": "open_mouth",
  ":-o": "open_mouth",
  ">:(": "angry",
  ">:-(": "angry",
  ":p": "stuck_out_tongue",
  ":-p": "stuck_out_tongue",
  ":P": "stuck_out_tongue",
  ":-P": "stuck_out_tongue",
  ":b": "stuck_out_tongue",
  ":-b": "stuck_out_tongue",
  ";p": "stuck_out_tongue_winking_eye",
  ";-p": "stuck_out_tongue_winking_eye",
  ";b": "stuck_out_tongue_winking_eye",
  ";-b": "stuck_out_tongue_winking_eye",
  ";P": "stuck_out_tongue_winking_eye",
  ";-P": "stuck_out_tongue_winking_eye",
  ":o)": "monkey_face",
  "D:": "anguished"
};

Config.inits = {};
Config.map = {};

Config.mapcolon = {};
var a = [];
Config.reversemap = {};

Config.init_emoticons = function()
{
  if (Config.inits.emoticons)
    return;
  Config.init_colons(); // we require this for the emoticons map
  Config.inits.emoticons = 1;

  var a = [];
  Config.map.emoticons = {};
  for (var i in Config.emoticons_data)
  {
    // because we never see some characters in our text except as
    // entities, we must do some replacing
    var emoticon = i.replace(/\&/g, '&amp;').replace(/\</g, '&lt;')
    .replace(/\>/g, '&gt;');

    if (!Config.map.colons[emoji.emoticons_data[i]])
      continue;

    Config.map.emoticons[emoticon] = Config.map.colons[Config.emoticons_data[i]];
    a.push(Config.escape_rx(emoticon));
  }
  Config.rx_emoticons = new RegExp(('(^|\\s)(' + a.join('|') + ')(?=$|[\\s|\\?\\.,!])'), 'g');
};
Config.init_colons = function()
{
  if (Config.inits.colons)
    return;
  Config.inits.colons = 1;
  Config.rx_colons = new RegExp('\:[^\\s:]+\:', 'g');
  Config.map.colons = {};
  for (var i in Config.data)
  {
    for (var j = 0; j < Config.data[i][3].length; j++)
    {
      Config.map.colons[emoji.data[i][3][j]] = i;
    }
  }
};
Config.init_unified = function()
{
  if (Config.inits.unified)
    return;
  Config.inits.unified = 1;

  buildMap();

};


Config.escape_rx = function(text)
{
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

function buildMap()
{
  var colons = [],codes=[];
  for (var i in Config.emoji_data)
  {
    for (var j = 0; j < Config.emoji_data[i][0].length; j++)
    {
      colons.push(Config.escape_rx (":"+Config.emoji_data[i][3][0])+":");
      codes.push(Config.emoji_data[i][0][0]);

      // it is a map of {"colon smiley":"unicode char"}
      Config.map[Config.emoji_data[i][3][0]] = Config.emoji_data[i][0][0];
      Config.mapcolon[":"+Config.emoji_data[i][3][0]+":"] = Config.emoji_data[i][0][0];
      // it is a map of {"unicode char": "colon smiley"}
      Config.reversemap[Config.emoji_data[i][0][0]] = Config.emoji_data[i][3][0];
    }

    Config.rx_colons = new RegExp('(' + colons.join('|') + ')', "g");
    Config.rx_codes = new RegExp('(' + codes.join('|') + ')', "g");
  }
}


/*! Angular Emoji 1.1.0 2015-11-15 */

"use strict";function cancelEvent(a){return a=a||window.event,a&&(a=a.originalEvent||a,a.stopPropagation&&a.stopPropagation(),a.preventDefault&&a.preventDefault()),!1}var emojiApp=angular.module("emojiApp",["ngSanitize"]);emojiApp.config(["$sceProvider",function(a){a.enabled(!1);var b,c,d,e,f,g,h,i={},j={};for(c=0;c<Config.EmojiCategories.length;c++)for(h=Config.EmojiCategorySpritesheetDimens[c][1],b=0;b<Config.EmojiCategories[c].length;b++)e=Config.Emoji[Config.EmojiCategories[c][b]],d=e[1][0],f=Math.floor(b/h),g=b%h,i[":"+d+":"]=[c,f,g,":"+d+":"],j[d]=e[0];$.emojiarea.spritesheetPath="img/emojisprite_!.png",$.emojiarea.spritesheetDimens=Config.EmojiCategorySpritesheetDimens,$.emojiarea.iconSize=20,$.emojiarea.icons=i,$.emojiarea.reverseIcons=j}]),emojiApp.directive("contenteditable",["$sce",function(a){return{restrict:"A",require:"?ngModel",link:function(a,b,c,d){function e(){var a=b.html();c.stripBr&&"<br>"==a&&(a=""),d.$setViewValue(a)}d&&(d.$render=function(){b.html(d.$viewValue||"")},b.on("blur keyup change",function(){a.$evalAsync(e)}),e())}}}]),emojiApp.directive("emojiForm",["$timeout","$http","$interpolate","$compile",function(a,b,c,d){function e(b,e,f){function g(){}function h(){q&&($(q).trigger("change"),i())}function i(){var a=q.offsetHeight;u!=a&&(u=a,b.$emit("ui_editor_resize"))}function j(a){var c=(a.originalEvent||a).target,d=(c||{}).src||"",e=!1;if("data:"==d.substr(0,5)){e=!0;var f=dataUrlToBlob(d);ErrorService.confirm({type:"FILE_CLIPBOARD_PASTE"}).then(function(){b.draftMessage.files=[f],b.draftMessage.isMedia=!0}),setZeroTimeout(function(){c.parentNode.removeChild(c)})}else if(d&&!d.match(/img\/blank\.gif/)){var g=document.createTextNode(" "+d+" ");setTimeout(function(){c.parentNode.replaceChild(g,c)},100)}}function k(a){console.log("onPasteEvent");var c,d,e=(a.originalEvent||a).clipboardData,f=e&&e.items||[],g=[];for(d=0;d<f.length;d++)"file"==f[d].kind&&(c=f[d].getAsFile(),g.push(c));g.length>0&&ErrorService.confirm({type:"FILES_CLIPBOARD_PASTE",files:g}).then(function(){b.draftMessage.files=g,b.draftMessage.isMedia=!0})}function l(a){return 9!=a.keyCode||a.shiftKey||a.ctrlKey||a.metaKey||$modalStack.getTop()?void 0:(p.focus(),cancelEvent(a))}var m=$("textarea",e)[0],n=$("input",e),o=$("#emojibtn",e)[0],p=m,q=($(m).emojiarea({button:o,norealTime:!0}),$(".emoji-menu",e)[0],$(".emoji-wysiwyg-editor",e)[0]),r=d($("#messageDiv"));if($("#messageDiv").replaceWith(r(b)),q){p=q,$(q).addClass("form-control"),$(m).attr("placeholder")&&$(q).attr("placeholder",c($(m).attr("placeholder"))(b));var s;$(q).on("DOMNodeInserted",j).on("keyup",function(c){i(),v||b.$apply(function(){b.emojiMessage.messagetext=q.textContent}),a.cancel(s),s=a(h,1e3)})}var t=!0;$(p).on("keydown",function(c){if(q&&i(),13==c.keyCode){var d=!1;if(t&&!c.shiftKey?d=!0:t||!c.ctrlKey&&!c.metaKey||(d=!0),d)return a.cancel(s),h(),b.emojiMessage.replyToUser(),g(),cancelEvent(c)}});var u=q.offsetHeight;$(document).on("keydown",l),$(document).on("paste",k);var v=!1;b.$on("$destroy",function(){$(document).off("paste",k),$(document).off("keydown",l),$(submitBtn).off("mousedown"),n.off("change"),q&&$(q).off("DOMNodeInserted keyup",j),$(p).off("keydown")})}return{scope:{emojiMessage:"="},link:e}}]),emojiApp.directive("contenteditable",["$sce",function(a){return{restrict:"A",require:"?ngModel",link:function(a,b,c,d){function e(){var a=b.html();c.stripBr&&"<br>"==a&&(a=""),d.$setViewValue(a)}d&&(d.$render=function(){b.html(d.$viewValue||"")},b.on("blur keyup change",function(){a.$evalAsync(e)}),e())}}}]),emojiApp.filter("colonToCode",function(){return function(a){return a?(Config.rx_colons||Config.init_unified(),a.replace(Config.rx_colons,function(a){var b=Config.mapcolon[a];return b?b:""})):""}}),emojiApp.filter("codeToSmiley",function(){return function(a){return a?(Config.rx_codes||Config.init_unified(),a.replace(Config.rx_codes,function(a){var b=Config.reversemap[a];if(b){b=":"+b+":";var c=$.emojiarea.createIcon($.emojiarea.icons[b]);return c}return""})):""}}),emojiApp.filter("colonToSmiley",function(){return function(a){return a?(Config.rx_colons||Config.init_unified(),a.replace(Config.rx_colons,function(a){if(a){var b=$.emojiarea.createIcon($.emojiarea.icons[a]);return b}return""})):""}}),function(a){function b(a){h=a}function c(){i=!0}function d(){return i?(i=!1,""):h}function e(){var a,b,c,e=Array.prototype.slice.call(arguments),f=e.pop(),g=[],h=1==e.length,i=!0,m=d();for(b=0;b<e.length;b++)if(c=e[b]=m+e[b],"xt_"!=c.substr(0,3)&&void 0!==j[c])g.push(j[c]);else if(l){try{a=localStorage.getItem(c)}catch(n){l=!1}try{a=void 0===a||null===a?!1:JSON.parse(a)}catch(n){a=!1}g.push(j[c]=a)}else k?i=!1:g.push(j[c]=!1);return i?f(h?g[0]:g):void chrome.storage.local.get(e,function(a){var d;for(g=[],b=0;b<e.length;b++)c=e[b],d=a[c],d=void 0===d||null===d?!1:JSON.parse(d),g.push(j[c]=d);f(h?g[0]:g)})}function f(a,b){var c,e,f={},g=d();for(c in a)if(a.hasOwnProperty(c))if(e=a[c],c=g+c,j[c]=e,e=JSON.stringify(e),l)try{localStorage.setItem(c,e)}catch(h){l=!1}else f[c]=e;return l||!k?void(b&&b()):void chrome.storage.local.set(f,b)}function g(){var a,b,c,e=Array.prototype.slice.call(arguments),f=d();for("function"==typeof e[e.length-1]&&(c=e.pop()),a=0;a<e.length;a++)if(b=e[a]=f+e[a],delete j[b],l)try{localStorage.removeItem(b)}catch(g){l=!1}k?chrome.storage.local.remove(e,c):c&&c()}var h="",i=!1,j={},k=!!(a.chrome&&chrome.storage&&chrome.storage.local),l=!k&&!!a.localStorage;a.ConfigStorage={prefix:b,noPrefix:c,get:e,set:f,remove:g}}(this),function(a,b,c){var d=1,e=3,f=["p","div","pre","form"],g=27,h=9;a.emojiarea={path:"",spritesheetPath:"",spritesheetDimens:[],iconSize:20,icons:{},defaults:{button:null,buttonLabel:"Emojis",buttonPosition:"after"}};var i=":joy:,:kissing_heart:,:heart:,:heart_eyes:,:blush:,:grin:,:+1:,:relaxed:,:pensive:,:smile:,:sob:,:kiss:,:unamused:,:flushed:,:stuck_out_tongue_winking_eye:,:see_no_evil:,:wink:,:smiley:,:cry:,:stuck_out_tongue_closed_eyes:,:scream:,:rage:,:smirk:,:disappointed:,:sweat_smile:,:kissing_closed_eyes:,:speak_no_evil:,:relieved:,:grinning:,:yum:,:laughing:,:ok_hand:,:neutral_face:,:confused:".split(",");a.fn.emojiarea=function(b){return b=a.extend({},a.emojiarea.defaults,b),this.each(function(){var d=a(this);"contentEditable"in c.body&&b.wysiwyg!==!1?new m(d,b):new l(d,b)})};var j={};j.restoreSelection=function(){return b.getSelection?function(a){var c=b.getSelection();c.removeAllRanges();for(var d=0,e=a.length;e>d;++d)c.addRange(a[d])}:c.selection&&c.selection.createRange?function(a){a&&a.select()}:void 0}(),j.saveSelection=function(){return b.getSelection?function(){var a=b.getSelection(),c=[];if(a.rangeCount)for(var d=0,e=a.rangeCount;e>d;++d)c.push(a.getRangeAt(d));return c}:c.selection&&c.selection.createRange?function(){var a=c.selection;return"none"!==a.type.toLowerCase()?a.createRange():null}:void 0}(),j.replaceSelection=function(){return b.getSelection?function(a){var d,e=b.getSelection(),f="string"==typeof a?c.createTextNode(a):a;e.getRangeAt&&e.rangeCount&&(d=e.getRangeAt(0),d.deleteContents(),d.insertNode(c.createTextNode(" ")),d.insertNode(f),d.setStart(f,0),b.setTimeout(function(){d=c.createRange(),d.setStartAfter(f),d.collapse(!0),e.removeAllRanges(),e.addRange(d)},0))}:c.selection&&c.selection.createRange?function(a){var b=c.selection.createRange();"string"==typeof a?b.text=a:b.pasteHTML(a.outerHTML)}:void 0}(),j.insertAtCursor=function(a,b){a=" "+a;var d,e,f,g=b.value;"undefined"!=typeof b.selectionStart&&"undefined"!=typeof b.selectionEnd?(e=b.selectionStart,d=b.selectionEnd,b.value=g.substring(0,e)+a+g.substring(b.selectionEnd),b.selectionStart=b.selectionEnd=e+a.length):"undefined"!=typeof c.selection&&"undefined"!=typeof c.selection.createRange&&(b.focus(),f=c.selection.createRange(),f.text=a,f.select())},j.extend=function(a,b){if("undefined"!=typeof a&&a||(a={}),"object"==typeof b)for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return a},j.escapeRegex=function(a){return(a+"").replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")},j.htmlEntities=function(a){return String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},j.emojiInserted=function(a,b){ConfigStorage.get("emojis_recent",function(b){b=b||i||[];var c=b.indexOf(a);return c?(-1!=c&&b.splice(c,1),b.unshift(a),b.length>42&&(b=b.slice(42)),void ConfigStorage.set({emojis_recent:b})):!1})};var k=function(){};k.prototype.setup=function(){var a=this;this.$editor.on("focus",function(){a.hasFocus=!0}),this.$editor.on("blur",function(){a.hasFocus=!1}),this.setupButton()},k.prototype.setupButton=function(){var b,c=this;this.options.button?b=a(this.options.button):this.options.button!==!1?(b=a('<a href="javascript:void(0)">'),b.html(this.options.buttonLabel),b.addClass("emoji-button"),b.attr({title:this.options.buttonLabel}),this.$editor[this.options.buttonPosition](b)):b=a(""),b.on("click",function(a){n.show(c),a.stopPropagation()}),this.$button=b},k.createIcon=function(b,c){var d=b[0],e=b[1],f=b[2],g=b[3],h=a.emojiarea.spritesheetPath,i=c&&Config.Mobile?26:a.emojiarea.iconSize,k=-(i*f),l=-(i*e),m=a.emojiarea.spritesheetDimens[d][1]*i,n=a.emojiarea.spritesheetDimens[d][0]*i,o="display:inline-block;";return o+="width:"+i+"px;",o+="height:"+i+"px;",o+="background:url('"+h.replace("!",d)+"') "+k+"px "+l+"px no-repeat;",o+="background-size:"+m+"px "+n+"px;",'<img src="img/blank.gif" class="img" style="'+o+'" alt="'+j.htmlEntities(g)+'">'},a.emojiarea.createIcon=k.createIcon;var l=function(a,b){this.options=b,this.$textarea=a,this.$editor=a,this.setup()};l.prototype.insert=function(b){a.emojiarea.icons.hasOwnProperty(b)&&(j.insertAtCursor(b,this.$textarea[0]),j.emojiInserted(b,this.menu),this.$textarea.trigger("change"))},l.prototype.val=function(){return this.$textarea.val()},j.extend(l.prototype,k.prototype);var m=function(b,d){var e=this;this.options=d||{},this.$textarea=b,this.$editor=a("<div>").addClass("emoji-wysiwyg-editor"),this.$editor.text(b.val()),this.$editor.attr({contenteditable:"true",id:"messageDiv","ng-model":"emojiMessage.rawhtml"});var f="blur change";this.options.norealTime||(f+=" keyup"),this.$editor.on(f,function(a){return e.onChange.apply(e,[a])}),this.$editor.on("paste",function(a){return e.onPaste.apply(e,[a])}),this.$editor.on("mousedown focus",function(){c.execCommand("enableObjectResizing",!1,!1)}),this.$editor.on("blur",function(){c.execCommand("enableObjectResizing",!0,!0)});var g=this.$editor.text(),h=a.emojiarea.icons;for(var i in h)h.hasOwnProperty(i)&&(g=g.replace(new RegExp(j.escapeRegex(i),"g"),k.createIcon(h[i])));this.$editor.html(g),b.hide().after(this.$editor),this.setup(),a(c.body).on("mousedown",function(){e.hasFocus&&(e.selection=j.saveSelection())})};m.prototype.onPaste=function(a){var b,d=(a.originalEvent||a).clipboardData,e=d&&d.items||[];for(b=0;b<e.length;b++)if("file"==e[b].kind)return a.preventDefault(),!0;var f=(a.originalEvent||a).clipboardData.getData("text/plain"),g=this;return setTimeout(function(){g.onChange()},0),f.length?(c.execCommand("insertText",!1,f),cancelEvent(a)):!0},m.prototype.onChange=function(a){this.$textarea.val(this.val()).trigger("change")},m.prototype.insert=function(b){var c=a(k.createIcon(a.emojiarea.icons[b]));c[0].attachEvent&&c[0].attachEvent("onresizestart",function(a){a.returnValue=!1},!1),this.$editor.trigger("focus"),this.selection&&j.restoreSelection(this.selection);try{j.replaceSelection(c[0])}catch(d){}j.emojiInserted(b,this.menu),this.onChange()},m.prototype.val=function(){for(var a=[],b=[],c=function(){a.push(b.join("")),b=[]},g=function(a){if(a.nodeType===e)b.push(a.nodeValue);else if(a.nodeType===d){var h=a.tagName.toLowerCase(),i=-1!==f.indexOf(h);if(i&&b.length&&c(),"img"===h){var j=a.getAttribute("alt")||"";return void(j&&b.push(j))}"br"===h&&c();for(var k=a.childNodes,l=0;l<k.length;l++)g(k[l]);i&&b.length&&c()}},h=this.$editor[0].childNodes,i=0;i<h.length;i++)g(h[i]);return b.length&&c(),a.join("\n")},j.extend(m.prototype,k.prototype);var n=function(){var d=this,e=a(c.body),f=a(b);this.visible=!1,this.emojiarea=null,this.$menu=a("<div>"),this.$menu.addClass("emoji-menu"),this.$menu.hide(),this.$itemsTailWrap=a('<div class="emoji-items-wrap1"></div>').appendTo(this.$menu),this.$categoryTabs=a('<table class="emoji-menu-tabs"><tr><td><a class="emoji-menu-tab icon-recent" ></a></td><td><a class="emoji-menu-tab icon-smile" ></a></td><td><a class="emoji-menu-tab icon-flower"></a></td><td><a class="emoji-menu-tab icon-bell"></a></td><td><a class="emoji-menu-tab icon-car"></a></td><td><a class="emoji-menu-tab icon-grid"></a></td></tr></table>').appendTo(this.$itemsTailWrap),this.$itemsWrap=a('<div class="emoji-items-wrap nano mobile_scrollable_wrap"></div>').appendTo(this.$itemsTailWrap),this.$items=a('<div class="emoji-items nano-content">').appendTo(this.$itemsWrap),e.append(this.$menu),Config.Mobile||this.$itemsWrap.nanoScroller({preventPageScrolling:!0,tabIndex:-1}),e.on("keydown",function(a){(a.keyCode===g||a.keyCode===h)&&d.hide()}),e.on("message_send",function(a){d.hide()}),e.on("mouseup",function(a){a=a.originalEvent||a;for(var c=a.originalTarget||a.target||b;c&&c!=b;)if(c=c.parentNode,c==d.$menu[0]||d.emojiarea&&c==d.emojiarea.$button[0])return;d.hide()}),f.on("resize",function(){d.visible&&d.reposition()}),this.$menu.on("mouseup","a",function(a){return a.stopPropagation(),!1}),this.$menu.on("click","a",function(c){if(a(this).hasClass("emoji-menu-tab"))return d.getTabIndex(this)!==d.currentCategory&&d.selectCategory(d.getTabIndex(this)),!1;var e=a(".label",a(this)).text();return b.setTimeout(function(){d.onItemSelected(e),(c.ctrlKey||c.metaKey)&&d.hide()},0),c.stopPropagation(),!1}),this.selectCategory(0)};n.prototype.getTabIndex=function(a){return this.$categoryTabs.find(".emoji-menu-tab").index(a)},n.prototype.selectCategory=function(a){this.$categoryTabs.find(".emoji-menu-tab").each(function(b){b===a?this.className+="-selected":this.className=this.className.replace("-selected","")}),this.currentCategory=a,this.load(a),Config.Mobile||this.$itemsWrap.nanoScroller({scroll:"top"})},n.prototype.onItemSelected=function(a){this.emojiarea.insert(a)},n.prototype.load=function(b){var c=[],d=a.emojiarea.icons,e=a.emojiarea.path,f=this;e.length&&"/"!==e.charAt(e.length-1)&&(e+="/");var g=function(){f.$items.html(c.join("")),Config.Mobile||setTimeout(function(){f.$itemsWrap.nanoScroller()},100)};if(b>0){for(var h in d)d.hasOwnProperty(h)&&d[h][0]===b-1&&c.push('<a href="javascript:void(0)" title="'+j.htmlEntities(h)+'">'+k.createIcon(d[h],!0)+'<span class="label">'+j.htmlEntities(h)+"</span></a>");g()}else ConfigStorage.get("emojis_recent",function(a){a=a||i||[];var b,e;for(e=0;e<a.length;e++)b=a[e],d[b]&&c.push('<a href="javascript:void(0)" title="'+j.htmlEntities(b)+'">'+k.createIcon(d[b],!0)+'<span class="label">'+j.htmlEntities(b)+"</span></a>");g()})},n.prototype.reposition=function(){var a=this.emojiarea.$button,b=a.offset();b.top+=a.outerHeight(),b.left+=Math.round(a.outerWidth()/2),this.$menu.css({top:b.top,left:b.left})},n.prototype.hide=function(a){this.emojiarea&&(this.emojiarea.menu=null,this.emojiarea.$button.removeClass("on"),this.emojiarea=null),this.visible=!1,this.$menu.hide("fast")},n.prototype.show=function(a){return this.emojiarea&&this.emojiarea===a?this.hide():(a.$button.addClass("on"),this.emojiarea=a,this.emojiarea.menu=this,this.reposition(),this.$menu.show("fast"),this.currentCategory||this.load(0),void(this.visible=!0))},n.show=function(){var a=null;return function(b){a=a||new n,a.show(b)}}()}(jQuery,window,document),function(a,b,c){var d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H;z={paneClass:"nano-pane",sliderClass:"nano-slider",contentClass:"nano-content",iOSNativeScrolling:!1,preventPageScrolling:!1,disableResize:!1,alwaysVisible:!1,flashDelay:1500,sliderMinHeight:20,sliderMaxHeight:null,documentContext:null,windowContext:null},u="scrollbar",t="scroll",l="mousedown",m="mouseenter",n="mousemove",p="mousewheel",o="mouseup",s="resize",h="drag",i="enter",w="up",r="panedown",f="DOMMouseScroll",g="down",x="wheel",j="keydown",k="keyup",v="touchmove",d="Microsoft Internet Explorer"===b.navigator.appName&&/msie 7./i.test(b.navigator.appVersion)&&b.ActiveXObject,e=null,D=b.requestAnimationFrame,y=b.cancelAnimationFrame,F=c.createElement("div").style,H=function(){var a,b,c,d,e,f;for(d=["t","webkitT","MozT","msT","OT"],a=e=0,f=d.length;f>e;a=++e)if(c=d[a],b=d[a]+"ransform",b in F)return d[a].substr(0,d[a].length-1);return!1}(),G=function(a){return H===!1?!1:""===H?a:H+a.charAt(0).toUpperCase()+a.substr(1)},E=G("transform"),B=E!==!1,A=function(){var a,b,d;return a=c.createElement("div"),b=a.style,b.position="absolute",b.width="100px",b.height="100px",b.overflow=t,b.top="-9999px",c.body.appendChild(a),d=a.offsetWidth-a.clientWidth,c.body.removeChild(a),d},C=function(){var a,c,d;return c=b.navigator.userAgent,(a=/(?=.+Mac OS X)(?=.+Firefox)/.test(c))?(d=/Firefox\/\d{2}\./.exec(c),d&&(d=d[0].replace(/\D+/g,"")),a&&+d>23):!1},q=function(){function j(d,f){this.el=d,this.options=f,e||(e=A()),this.$el=a(this.el),this.doc=a(this.options.documentContext||c),this.win=a(this.options.windowContext||b),this.body=this.doc.find("body"),this.$content=this.$el.children("."+f.contentClass),this.$content.attr("tabindex",this.options.tabIndex||0),this.content=this.$content[0],this.previousPosition=0,this.options.iOSNativeScrolling&&(null!=this.el.style.WebkitOverflowScrolling||navigator.userAgent.match(/mobi.+Gecko/i))?this.nativeScrolling():this.generate(),this.createEvents(),this.addEvents(),this.reset()}return j.prototype.preventScrolling=function(a,b){if(this.isActive)if(a.type===f)(b===g&&a.originalEvent.detail>0||b===w&&a.originalEvent.detail<0)&&a.preventDefault();else if(a.type===p){if(!a.originalEvent||!a.originalEvent.wheelDelta)return;(b===g&&a.originalEvent.wheelDelta<0||b===w&&a.originalEvent.wheelDelta>0)&&a.preventDefault()}},j.prototype.nativeScrolling=function(){this.$content.css({WebkitOverflowScrolling:"touch"}),this.iOSNativeScrolling=!0,this.isActive=!0},j.prototype.updateScrollValues=function(){var a,b;a=this.content,this.maxScrollTop=a.scrollHeight-a.clientHeight,this.prevScrollTop=this.contentScrollTop||0,this.contentScrollTop=a.scrollTop,b=this.contentScrollTop>this.previousPosition?"down":this.contentScrollTop<this.previousPosition?"up":"same",this.previousPosition=this.contentScrollTop,"same"!==b&&this.$el.trigger("update",{position:this.contentScrollTop,maximum:this.maxScrollTop,direction:b}),this.iOSNativeScrolling||(this.maxSliderTop=this.paneHeight-this.sliderHeight,this.sliderTop=0===this.maxScrollTop?0:this.contentScrollTop*this.maxSliderTop/this.maxScrollTop)},j.prototype.setOnScrollStyles=function(){var a;B?(a={},a[E]="translate(0, "+this.sliderTop+"px)"):a={top:this.sliderTop},D?(y&&this.scrollRAF&&y(this.scrollRAF),this.scrollRAF=D(function(b){return function(){return b.scrollRAF=null,b.slider.css(a)}}(this))):this.slider.css(a)},j.prototype.createEvents=function(){this.events={down:function(a){return function(b){return a.isBeingDragged=!0,a.offsetY=b.pageY-a.slider.offset().top,a.slider.is(b.target)||(a.offsetY=0),a.pane.addClass("active"),a.doc.bind(n,a.events[h]).bind(o,a.events[w]),a.body.bind(m,a.events[i]),!1}}(this),drag:function(a){return function(b){return a.sliderY=b.pageY-a.$el.offset().top-a.paneTop-(a.offsetY||.5*a.sliderHeight),a.scroll(),a.contentScrollTop>=a.maxScrollTop&&a.prevScrollTop!==a.maxScrollTop?a.$el.trigger("scrollend"):0===a.contentScrollTop&&0!==a.prevScrollTop&&a.$el.trigger("scrolltop"),!1}}(this),up:function(a){return function(b){return a.isBeingDragged=!1,a.pane.removeClass("active"),a.doc.unbind(n,a.events[h]).unbind(o,a.events[w]),a.body.unbind(m,a.events[i]),!1}}(this),resize:function(a){return function(b){a.reset()}}(this),panedown:function(a){return function(b){return a.sliderY=(b.offsetY||b.originalEvent.layerY)-.5*a.sliderHeight,a.scroll(),a.events.down(b),!1}}(this),scroll:function(a){return function(b){a.updateScrollValues(),a.isBeingDragged||(a.iOSNativeScrolling||(a.sliderY=a.sliderTop,a.setOnScrollStyles()),null!=b&&(a.contentScrollTop>=a.maxScrollTop?(a.options.preventPageScrolling&&a.preventScrolling(b,g),a.prevScrollTop!==a.maxScrollTop&&a.$el.trigger("scrollend")):0===a.contentScrollTop&&(a.options.preventPageScrolling&&a.preventScrolling(b,w),0!==a.prevScrollTop&&a.$el.trigger("scrolltop"))))}}(this),wheel:function(a){return function(b){var c;if(null!=b)return c=b.delta||b.wheelDelta||b.originalEvent&&b.originalEvent.wheelDelta||-b.detail||b.originalEvent&&-b.originalEvent.detail,c&&(a.sliderY+=-c/3),a.scroll(),!1}}(this),enter:function(a){return function(b){var c;if(a.isBeingDragged)return 1!==(b.buttons||b.which)?(c=a.events)[w].apply(c,arguments):void 0}}(this)}},j.prototype.addEvents=function(){var a;this.removeEvents(),a=this.events,this.options.disableResize||this.win.bind(s,a[s]),this.iOSNativeScrolling||(this.slider.bind(l,a[g]),this.pane.bind(l,a[r]).bind(""+p+" "+f,a[x])),this.$content.bind(""+t+" "+p+" "+f+" "+v,a[t])},j.prototype.removeEvents=function(){var a;a=this.events,this.win.unbind(s,a[s]),this.iOSNativeScrolling||(this.slider.unbind(),this.pane.unbind()),this.$content.unbind(""+t+" "+p+" "+f+" "+v,a[t])},j.prototype.generate=function(){var a,c,d,f,g,h,i;return f=this.options,h=f.paneClass,i=f.sliderClass,a=f.contentClass,(g=this.$el.children("."+h)).length||g.children("."+i).length||this.$el.append('<div class="'+h+'"><div class="'+i+'" /></div>'),this.pane=this.$el.children("."+h),this.slider=this.pane.find("."+i),0===e&&C()?(d=b.getComputedStyle(this.content,null).getPropertyValue("padding-right").replace(/[^0-9.]+/g,""),c={right:-14,paddingRight:+d+14}):e&&(c={right:-e},this.$el.addClass("has-scrollbar")),null!=c&&this.$content.css(c),this},j.prototype.restore=function(){this.stopped=!1,this.iOSNativeScrolling||this.pane.show(),this.addEvents()},j.prototype.reset=function(){var a,b,c,f,g,h,i,j,k,l,m,n;return this.iOSNativeScrolling?void(this.contentHeight=this.content.scrollHeight):(this.$el.find("."+this.options.paneClass).length||this.generate().stop(),this.stopped&&this.restore(),a=this.content,f=a.style,g=f.overflowY,d&&this.$content.css({height:this.$content.height()}),b=a.scrollHeight+e,l=parseInt(this.$el.css("max-height"),10),l>0&&(this.$el.height(""),this.$el.height(a.scrollHeight>l?l:a.scrollHeight)),i=this.pane.outerHeight(!1),k=parseInt(this.pane.css("top"),10),h=parseInt(this.pane.css("bottom"),10),j=i+k+h,n=Math.round(j/b*j),n<this.options.sliderMinHeight?n=this.options.sliderMinHeight:null!=this.options.sliderMaxHeight&&n>this.options.sliderMaxHeight&&(n=this.options.sliderMaxHeight),g===t&&f.overflowX!==t&&(n+=e),this.maxSliderTop=j-n,this.contentHeight=b,this.paneHeight=i,this.paneOuterHeight=j,this.sliderHeight=n,this.paneTop=k,this.slider.height(n),this.events.scroll(),this.pane.show(),this.isActive=!0,a.scrollHeight===a.clientHeight||this.pane.outerHeight(!0)>=a.scrollHeight&&g!==t?(this.pane.hide(),this.isActive=!1):this.el.clientHeight===a.scrollHeight&&g===t?this.slider.hide():this.slider.show(),this.pane.css({opacity:this.options.alwaysVisible?1:"",visibility:this.options.alwaysVisible?"visible":""}),c=this.$content.css("position"),("static"===c||"relative"===c)&&(m=parseInt(this.$content.css("right"),10),m&&this.$content.css({right:"",marginRight:m})),this)},j.prototype.scroll=function(){return this.isActive?(this.sliderY=Math.max(0,this.sliderY),this.sliderY=Math.min(this.maxSliderTop,this.sliderY),this.$content.scrollTop(this.maxScrollTop*this.sliderY/this.maxSliderTop),this.iOSNativeScrolling||(this.updateScrollValues(),this.setOnScrollStyles()),this):void 0},j.prototype.scrollBottom=function(a){return this.isActive?(this.$content.scrollTop(this.contentHeight-this.$content.height()-a).trigger(p),this.stop().restore(),this):void 0},j.prototype.scrollTop=function(a){return this.isActive?(this.$content.scrollTop(+a).trigger(p),this.stop().restore(),this):void 0},j.prototype.scrollTo=function(a){return this.isActive?(this.scrollTop(this.$el.find(a).get(0).offsetTop),this):void 0},j.prototype.stop=function(){return y&&this.scrollRAF&&(y(this.scrollRAF),this.scrollRAF=null),this.stopped=!0,this.removeEvents(),this.iOSNativeScrolling||this.pane.hide(),this},j.prototype.destroy=function(){return this.stopped||this.stop(),!this.iOSNativeScrolling&&this.pane.length&&this.pane.remove(),d&&this.$content.height(""),this.$content.removeAttr("tabindex"),this.$el.hasClass("has-scrollbar")&&(this.$el.removeClass("has-scrollbar"),this.$content.css({right:""})),this},j.prototype.flash=function(){return!this.iOSNativeScrolling&&this.isActive?(this.reset(),this.pane.addClass("flashed"),setTimeout(function(a){return function(){a.pane.removeClass("flashed")}}(this),this.options.flashDelay),this):void 0},j}(),a.fn.nanoScroller=function(b){return this.each(function(){var c,d;if((d=this.nanoscroller)||(c=a.extend({},z,b),this.nanoscroller=d=new q(this,c)),b&&"object"==typeof b){if(a.extend(d.options,b),null!=b.scrollBottom)return d.scrollBottom(b.scrollBottom);if(null!=b.scrollTop)return d.scrollTop(b.scrollTop);if(b.scrollTo)return d.scrollTo(b.scrollTo);if("bottom"===b.scroll)return d.scrollBottom(0);if("top"===b.scroll)return d.scrollTop(0);if(b.scroll&&b.scroll instanceof a)return d.scrollTo(b.scroll);if(b.stop)return d.stop();if(b.destroy)return d.destroy();if(b.flash)return d.flash()}return d.reset()})},a.fn.nanoScroller.Constructor=q}(jQuery,window,document);

(function(e){if(typeof define==="function"&&define.amd){define(["jquery"],e)}else{e(jQuery)}})(function(e){"use strict";var t={},n=Math.max,r=Math.min;t.c={};t.c.d=e(document);t.c.t=function(e){return e.originalEvent.touches.length-1};t.o=function(){var n=this;this.o=null;this.$=null;this.i=null;this.g=null;this.v=null;this.cv=null;this.x=0;this.y=0;this.w=0;this.h=0;this.$c=null;this.c=null;this.t=0;this.isInit=false;this.fgColor=null;this.pColor=null;this.dH=null;this.cH=null;this.eH=null;this.rH=null;this.scale=1;this.relative=false;this.relativeWidth=false;this.relativeHeight=false;this.$div=null;this.run=function(){var t=function(e,t){var r;for(r in t){n.o[r]=t[r]}n._carve().init();n._configure()._draw()};if(this.$.data("kontroled"))return;this.$.data("kontroled",true);this.extend();this.o=e.extend({min:this.$.data("min")!==undefined?this.$.data("min"):0,max:this.$.data("max")!==undefined?this.$.data("max"):100,stopper:true,readOnly:this.$.data("readonly")||this.$.attr("readonly")==="readonly",cursor:this.$.data("cursor")===true&&30||this.$.data("cursor")||0,thickness:this.$.data("thickness")&&Math.max(Math.min(this.$.data("thickness"),1),.01)||.35,lineCap:this.$.data("linecap")||"butt",width:this.$.data("width")||200,height:this.$.data("height")||200,displayInput:this.$.data("displayinput")==null||this.$.data("displayinput"),displayPrevious:this.$.data("displayprevious"),fgColor:this.$.data("fgcolor")||"#87CEEB",inputColor:this.$.data("inputcolor"),font:this.$.data("font")||"Arial",fontWeight:this.$.data("font-weight")||"bold",inline:false,step:this.$.data("step")||1,rotation:this.$.data("rotation"),draw:null,change:null,cancel:null,release:null,format:function(e){return e},parse:function(e){return parseFloat(e)}},this.o);this.o.flip=this.o.rotation==="anticlockwise"||this.o.rotation==="acw";if(!this.o.inputColor){this.o.inputColor=this.o.fgColor}if(this.$.is("fieldset")){this.v={};this.i=this.$.find("input");this.i.each(function(t){var r=e(this);n.i[t]=r;n.v[t]=n.o.parse(r.val());r.bind("change blur",function(){var e={};e[t]=r.val();n.val(n._validate(e))})});this.$.find("legend").remove()}else{this.i=this.$;this.v=this.o.parse(this.$.val());this.v===""&&(this.v=this.o.min);this.$.bind("change blur",function(){n.val(n._validate(n.o.parse(n.$.val())))})}!this.o.displayInput&&this.$.hide();this.$c=e(document.createElement("canvas")).attr({width:this.o.width,height:this.o.height});this.$div=e('<div style="'+(this.o.inline?"display:inline;":"")+"width:"+this.o.width+"px;height:"+this.o.height+"px;"+'"></div>');this.$.wrap(this.$div).before(this.$c);this.$div=this.$.parent();if(typeof G_vmlCanvasManager!=="undefined"){G_vmlCanvasManager.initElement(this.$c[0])}this.c=this.$c[0].getContext?this.$c[0].getContext("2d"):null;if(!this.c){throw{name:"CanvasNotSupportedException",message:"Canvas not supported. Please use excanvas on IE8.0.",toString:function(){return this.name+": "+this.message}}}this.scale=(window.devicePixelRatio||1)/(this.c.webkitBackingStorePixelRatio||this.c.mozBackingStorePixelRatio||this.c.msBackingStorePixelRatio||this.c.oBackingStorePixelRatio||this.c.backingStorePixelRatio||1);this.relativeWidth=this.o.width%1!==0&&this.o.width.indexOf("%");this.relativeHeight=this.o.height%1!==0&&this.o.height.indexOf("%");this.relative=this.relativeWidth||this.relativeHeight;this._carve();if(this.v instanceof Object){this.cv={};this.copy(this.v,this.cv)}else{this.cv=this.v}this.$.bind("configure",t).parent().bind("configure",t);this._listen()._configure()._xy().init();this.isInit=true;this.$.val(this.o.format(this.v));this._draw();return this};this._carve=function(){if(this.relative){var e=this.relativeWidth?this.$div.parent().width()*parseInt(this.o.width)/100:this.$div.parent().width(),t=this.relativeHeight?this.$div.parent().height()*parseInt(this.o.height)/100:this.$div.parent().height();this.w=this.h=Math.min(e,t)}else{this.w=this.o.width;this.h=this.o.height}this.$div.css({width:this.w+"px",height:this.h+"px"});this.$c.attr({width:this.w,height:this.h});if(this.scale!==1){this.$c[0].width=this.$c[0].width*this.scale;this.$c[0].height=this.$c[0].height*this.scale;this.$c.width(this.w);this.$c.height(this.h)}return this};this._draw=function(){var e=true;n.g=n.c;n.clear();n.dH&&(e=n.dH());e!==false&&n.draw()};this._touch=function(e){var r=function(e){var t=n.xy2val(e.originalEvent.touches[n.t].pageX,e.originalEvent.touches[n.t].pageY);if(t==n.cv)return;if(n.cH&&n.cH(t)===false)return;n.change(n._validate(t));n._draw()};this.t=t.c.t(e);r(e);t.c.d.bind("touchmove.k",r).bind("touchend.k",function(){t.c.d.unbind("touchmove.k touchend.k");n.val(n.cv)});return this};this._mouse=function(e){var r=function(e){var t=n.xy2val(e.pageX,e.pageY);if(t==n.cv)return;if(n.cH&&n.cH(t)===false)return;n.change(n._validate(t));n._draw()};r(e);t.c.d.bind("mousemove.k",r).bind("keyup.k",function(e){if(e.keyCode===27){t.c.d.unbind("mouseup.k mousemove.k keyup.k");if(n.eH&&n.eH()===false)return;n.cancel()}}).bind("mouseup.k",function(e){t.c.d.unbind("mousemove.k mouseup.k keyup.k");n.val(n.cv)});return this};this._xy=function(){var e=this.$c.offset();this.x=e.left;this.y=e.top;return this};this._listen=function(){if(!this.o.readOnly){this.$c.bind("mousedown",function(e){e.preventDefault();n._xy()._mouse(e)}).bind("touchstart",function(e){e.preventDefault();n._xy()._touch(e)});this.listen()}else{this.$.attr("readonly","readonly")}if(this.relative){e(window).resize(function(){n._carve().init();n._draw()})}return this};this._configure=function(){if(this.o.draw)this.dH=this.o.draw;if(this.o.change)this.cH=this.o.change;if(this.o.cancel)this.eH=this.o.cancel;if(this.o.release)this.rH=this.o.release;if(this.o.displayPrevious){this.pColor=this.h2rgba(this.o.fgColor,"0.4");this.fgColor=this.h2rgba(this.o.fgColor,"0.6")}else{this.fgColor=this.o.fgColor}return this};this._clear=function(){this.$c[0].width=this.$c[0].width};this._validate=function(e){var t=~~((e<0?-.5:.5)+e/this.o.step)*this.o.step;return Math.round(t*100)/100};this.listen=function(){};this.extend=function(){};this.init=function(){};this.change=function(e){};this.val=function(e){};this.xy2val=function(e,t){};this.draw=function(){};this.clear=function(){this._clear()};this.h2rgba=function(e,t){var n;e=e.substring(1,7);n=[parseInt(e.substring(0,2),16),parseInt(e.substring(2,4),16),parseInt(e.substring(4,6),16)];return"rgba("+n[0]+","+n[1]+","+n[2]+","+t+")"};this.copy=function(e,t){for(var n in e){t[n]=e[n]}}};t.Dial=function(){t.o.call(this);this.startAngle=null;this.xy=null;this.radius=null;this.lineWidth=null;this.cursorExt=null;this.w2=null;this.PI2=2*Math.PI;this.extend=function(){this.o=e.extend({bgColor:this.$.data("bgcolor")||"#EEEEEE",angleOffset:this.$.data("angleoffset")||0,angleArc:this.$.data("anglearc")||360,inline:true},this.o)};this.val=function(e,t){if(null!=e){e=this.o.parse(e);if(t!==false&&e!=this.v&&this.rH&&this.rH(e)===false){return}this.cv=this.o.stopper?n(r(e,this.o.max),this.o.min):e;this.v=this.cv;this.$.val(this.o.format(this.v));this._draw()}else{return this.v}};this.xy2val=function(e,t){var i,s;i=Math.atan2(e-(this.x+this.w2),-(t-this.y-this.w2))-this.angleOffset;if(this.o.flip){i=this.angleArc-i-this.PI2}if(this.angleArc!=this.PI2&&i<0&&i>-.5){i=0}else if(i<0){i+=this.PI2}s=i*(this.o.max-this.o.min)/this.angleArc+this.o.min;this.o.stopper&&(s=n(r(s,this.o.max),this.o.min));return s};this.listen=function(){var t=this,i,s,o=function(e){e.preventDefault();var o=e.originalEvent,u=o.detail||o.wheelDeltaX,a=o.detail||o.wheelDeltaY,f=t._validate(t.o.parse(t.$.val()))+(u>0||a>0?t.o.step:u<0||a<0?-t.o.step:0);f=n(r(f,t.o.max),t.o.min);t.val(f,false);if(t.rH){clearTimeout(i);i=setTimeout(function(){t.rH(f);i=null},100);if(!s){s=setTimeout(function(){if(i)t.rH(f);s=null},200)}}},u,a,f=1,l={37:-t.o.step,38:t.o.step,39:t.o.step,40:-t.o.step};this.$.bind("keydown",function(i){var s=i.keyCode;if(s>=96&&s<=105){s=i.keyCode=s-48}u=parseInt(String.fromCharCode(s));if(isNaN(u)){s!==13&&s!==8&&s!==9&&s!==189&&(s!==190||t.$.val().match(/\./))&&i.preventDefault();if(e.inArray(s,[37,38,39,40])>-1){i.preventDefault();var o=t.o.parse(t.$.val())+l[s]*f;t.o.stopper&&(o=n(r(o,t.o.max),t.o.min));t.change(t._validate(o));t._draw();a=window.setTimeout(function(){f*=2},30)}}}).bind("keyup",function(e){if(isNaN(u)){if(a){window.clearTimeout(a);a=null;f=1;t.val(t.$.val())}}else{t.$.val()>t.o.max&&t.$.val(t.o.max)||t.$.val()<t.o.min&&t.$.val(t.o.min)}});this.$c.bind("mousewheel DOMMouseScroll",o);this.$.bind("mousewheel DOMMouseScroll",o)};this.init=function(){if(this.v<this.o.min||this.v>this.o.max){this.v=this.o.min}this.$.val(this.v);this.w2=this.w/2;this.cursorExt=this.o.cursor/100;this.xy=this.w2*this.scale;this.lineWidth=this.xy*this.o.thickness;this.lineCap=this.o.lineCap;this.radius=this.xy-this.lineWidth/2;this.o.angleOffset&&(this.o.angleOffset=isNaN(this.o.angleOffset)?0:this.o.angleOffset);this.o.angleArc&&(this.o.angleArc=isNaN(this.o.angleArc)?this.PI2:this.o.angleArc);this.angleOffset=this.o.angleOffset*Math.PI/180;this.angleArc=this.o.angleArc*Math.PI/180;this.startAngle=1.5*Math.PI+this.angleOffset;this.endAngle=1.5*Math.PI+this.angleOffset+this.angleArc;var e=n(String(Math.abs(this.o.max)).length,String(Math.abs(this.o.min)).length,2)+2;this.o.displayInput&&this.i.css({width:(this.w/2+4>>0)+"px",height:(this.w/3>>0)+"px",position:"absolute","vertical-align":"middle","margin-top":(this.w/3>>0)+"px","margin-left":"-"+(this.w*3/4+2>>0)+"px",border:0,background:"none",font:this.o.fontWeight+" "+(this.w/e>>0)+"px "+this.o.font,"text-align":"center",color:this.o.inputColor||this.o.fgColor,padding:"0px","-webkit-appearance":"none"})||this.i.css({width:"0px",visibility:"hidden"})};this.change=function(e){this.cv=e;this.$.val(this.o.format(e))};this.angle=function(e){return(e-this.o.min)*this.angleArc/(this.o.max-this.o.min)};this.arc=function(e){var t,n;e=this.angle(e);if(this.o.flip){t=this.endAngle+1e-5;n=t-e-1e-5}else{t=this.startAngle-1e-5;n=t+e+1e-5}this.o.cursor&&(t=n-this.cursorExt)&&(n=n+this.cursorExt);return{s:t,e:n,d:this.o.flip&&!this.o.cursor}};this.draw=function(){var e=this.g,t=this.arc(this.cv),n,r=1;e.lineWidth=this.lineWidth;e.lineCap=this.lineCap;if(this.o.bgColor!=="none"){e.beginPath();e.strokeStyle=this.o.bgColor;e.arc(this.xy,this.xy,this.radius,this.endAngle-1e-5,this.startAngle+1e-5,true);e.stroke()}if(this.o.displayPrevious){n=this.arc(this.v);e.beginPath();e.strokeStyle=this.pColor;e.arc(this.xy,this.xy,this.radius,n.s,n.e,n.d);e.stroke();r=this.cv==this.v}e.beginPath();e.strokeStyle=r?this.o.fgColor:this.fgColor;e.arc(this.xy,this.xy,this.radius,t.s,t.e,t.d);e.stroke()};this.cancel=function(){this.val(this.v)}};e.fn.dial=e.fn.knob=function(n){return this.each(function(){var r=new t.Dial;r.o=n;r.$=e(this);r.run()}).parent()}})

/*
 * @license
 * angular-socket-io v0.7.0
 * (c) 2014 Brian Ford http://briantford.com
 * License: MIT
 */
angular.module("btford.socket-io",[]).provider("socketFactory",function(){"use strict";var n="socket:";this.$get=["$rootScope","$timeout",function(t,e){var r=function(n,t){return t?function(){var r=arguments;e(function(){t.apply(n,r)},0)}:angular.noop};return function(e){e=e||{};var o=e.ioSocket||io.connect(),c=void 0===e.prefix?n:e.prefix,u=e.scope||t,i=function(n,t){o.on(n,t.__ng=r(o,t))},a=function(n,t){o.once(n,t.__ng=r(o,t))},s={on:i,addListener:i,once:a,emit:function(n,t,e){var c=arguments.length-1,e=arguments[c];return"function"==typeof e&&(e=r(o,e),arguments[c]=e),o.emit.apply(o,arguments)},removeListener:function(n,t){return t&&t.__ng&&(arguments[1]=t.__ng),o.removeListener.apply(o,arguments)},removeAllListeners:function(){return o.removeAllListeners.apply(o,arguments)},disconnect:function(n){return o.disconnect(n)},connect:function(){return o.connect()},forward:function(n,t){n instanceof Array==!1&&(n=[n]),t||(t=u),n.forEach(function(n){var e=c+n,u=r(o,function(){Array.prototype.unshift.call(arguments,e),t.$broadcast.apply(t,arguments)});t.$on("$destroy",function(){o.removeListener(n,u)}),o.on(n,u)})}};return s}}]});

var directives = angular.module('directivesModule', []);

directives.directive('adjustHeight', function($window, $document, $timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			scope.calculate = function() {
        var top = $(element).offset().top;
        var height = $(window).height();
        var neededHeight = height - top;
        //console.log(top, height, neededHeight, element);

        $(element).css('height', neededHeight);
      };
      $timeout(function(){
        scope.calculate();
      }, 100);

      $window.addEventListener('resize', function() {
        scope.calculate();
      });

      // Listen for possible container size changes
      scope.$on('changedContainers', function() {
        scope.calculate();
      });
		}
	};
});

directives.directive('adjustHeightChat', function($window, $document, $timeout) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.calculate = function() {
        var top = $(element).offset().top;
        var height = $(window).height();
        var footer = $('div.footer').outerHeight();
        var neededHeight = height - top - footer;
        //console.log(top, height, footer, neededHeight);

        $(element).css('height', neededHeight);
      };
      $timeout(function(){
        scope.calculate();
      }, 100);

      $window.addEventListener('resize', function() {
        scope.calculate();
      });

      // Listen for possible container size changes
      scope.$on('changedContainers', function() {
        scope.calculate();
      });
    }
  };
});

directives.directive('scrollMe', function() {
  return {
    restrict: 'A',
    scope: {
      trigger: '&scrollMe'
    },
    link: function(scope, element, attrs) {
      // If space is bigger, load more items
      element.on('scroll', function() {
        if($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight) {
          scope.$apply(function() {
            // Trigger scroll
            scope.trigger();
          });
        }
      });
    }
  }
});

directives.directive('myRefresh', ['$location', function($location) {
  return {
    restrict: 'A',
    scope: {
      trigger: '&myRefresh'
    },
    link: function(scope, element, attrs) {
      element.bind('click', function() {
        if(element[0] && element[0].href && element[0].href === $location.absUrl()){
          //console.log("Recarga!");
          scope.trigger();
        }
      });
    }
  };
}]);

directives.directive('markedsg', function () {
  return {
    restrict: 'AE',
    replace: true,
    scope: {
      markedsg: '='
    },
    link: function (scope, element, attrs) {
      set(scope.markedsg || element.text() || '');

      if (attrs.markedsg) {
        scope.$watch('markedsg', set);
      }

      function unindent(text) {
        if (!text) return text;

        var lines = text
          .replace(/\t/g, '  ')
          .split(/\r?\n/);

        var i, l, min = null, line, len = lines.length;
        for (i = 0; i < len; i++) {
          line = lines[i];
          l = line.match(/^(\s*)/)[0].length;
          if (l === line.length) { continue; }
          min = (l < min || min === null) ? l : min;
        }

        if (min !== null && min > 0) {
          for (i = 0; i < len; i++) {
            lines[i] = lines[i].substr(min);
          }
        }
        return lines.join('\n');
      }

      function set(text) {
        text = unindent(text || '');
        // Parse mentions links
        var links = $('<div>' + text + '</div>');
        links.find('a.user-mention').each(function( index ) {
          $(this).attr("href", "/u/"+ $(this).data('username') +"/"+ $(this).data('id'));
          if($(this).data('comment') != undefined) {
            $(this).before('<i class="fa fa-reply comment-response"></i>')
          }
        });
        text = links.html();
        element.html(marked(text, scope.opts || null));
      }

    }
  };
});

directives.directive('populometro', function() {
  return {
    restrict: 'EACM',
    template: function(elem, attrs) {
      return '<div style="display:block;width:100px;height:80px;margin: 0 auto"><svg style="position:absolute" width="100" height="100"><g><polygon points="50 20 54 50 46 50" fill="#E6E9EE" transform="rotate({{ (knob*2.4) - 120 }} 50 50)"></polygon><circle class="ring" cx="50" cy="50" r="10" fill="#E6E9EE"></circle><circle class="ring" cx="51" cy="51" r="8" fill="#d0d7dd"></circle><circle class="ring" cx="50" cy="50" r="7" fill="#F1F1F1"></circle></g></svg><div style="display: none; position:absolute;top:50%;width:100px;text-align:center;font-weight:bold;font-size: 1.1em;">{{ knob | number : 0 }}</div><input value="{{ knob }}"></div>';
    },
    replace: true,
    scope: true,
    link: function(scope, elem, attrs) {
      scope.opts = {
        'width':100,
        'height':80,
        'bgColor':'#E6E9EE',
        'fgColor':'#386db8',
        'readOnly':true,
        'displayInput':false,
        'max': 100,
        'angleArc':240,
        'angleOffset':-120,
        'thickness':'.25'
      };
      var renderKnob = function(){
        scope.knob = scope.$eval(attrs.knobData);
        $elem = $(elem).find('input');
        $elem.val(scope.knob);
        $elem.change();
        $elem.knob(scope.opts);
      };
      scope.$watch(attrs.knobData, function () {
        renderKnob();
      });
    },
  }
});

var filters = angular.module('filtersModule', []);

filters.filter('date_at', function() {
	return function(input) {
		var date = new Date(input);
    var months = new Array("enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre");

    return date.getDate() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
	};
});

filters.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);
    for (var i=0; i<total; i++)
      input.push(i);
    return input;
  };
});

filters.filter('percentage', function ($window) {
  return function (input, decimals, suffix) {
    decimals = angular.isNumber(decimals)? decimals: 0;
    suffix = suffix || '%';
    if ($window.isNaN(input)) {
        return '';
    }
    return Math.round(input * Math.pow(10, decimals + 2))/Math.pow(10, decimals) + suffix
  };
});

var activeReader = angular.module('activeReader', []);

activeReader.factory('Bridge', function($rootScope) {
	var bridge = {};
	bridge.changePost = function(post) {
		// If reader view module is active then it'll catch the request
		$rootScope.$broadcast('resolvePost', post);
	};
	return bridge;
});

'use strict';

var services = angular.module('sg.services', []);

services.factory('AdvancedAcl', ['$rootScope', function($rootScope) {
  return {
    can: function(action, object, user_info, author_id, category_id) {
      var can = false;

      // If own object
      can = can || ( $rootScope.can(action + '-own-' + object) && user_info.id === author_id );

      // Or some category moderator
      var category_owner = false;
      if(user_info != null) {
        if('categories' in user_info.roles[0]) {
          category_owner = (user_info.roles[0].categories).indexOf(category_id) > -1;
        }
      }
      can = can || ( $rootScope.can(action + '-category-' + object) && category_owner);

      // Or supreme power
      can = can || $rootScope.can(action + '-board-' + object);

      return can;
    }
  };
}]);

services.service('modalService', ['$uibModal', function ($modal) {
  var modalDefaults = {
    backdrop: true,
    keyboard: true,
    modalFade: true,
    windowClass: 'modal-confirm',
    size: 'sm',
    templateUrl: '/js/partials/modal.html'
  };

  var modalOptions = {
    closeButtonText: 'Cerrar',
    actionButtonText: 'Aceptar',
    headerText: '¿Estás seguro?',
    bodyText: '¿Quieres realizar esta acción?'
  };

  this.showModal = function (customModalDefaults, customModalOptions) {
    if (!customModalDefaults) customModalDefaults = {};
    customModalDefaults.backdrop = 'static';
    return this.show(customModalDefaults, customModalOptions);
  };

  this.show = function (customModalDefaults, customModalOptions) {
    //Create temp objects to work with since we're in a singleton service
    var tempModalDefaults = {};
    var tempModalOptions = {};

    //Map angular-ui modal custom defaults to modal defaults defined in service
    angular.extend(tempModalDefaults, modalDefaults, customModalDefaults);

    //Map modal.html $scope custom properties to defaults defined in service
    angular.extend(tempModalOptions, modalOptions, customModalOptions);

    if (!tempModalDefaults.controller) {
      tempModalDefaults.controller = function ($scope, $uibModalInstance) {
        $scope.modalOptions = tempModalOptions;
        $scope.modalOptions.ok = function (result) {
          $uibModalInstance.close(result);
        };
        $scope.modalOptions.close = function (result) {
          $uibModalInstance.dismiss('cancel');
        };
      }
    }

    return $modal.open(tempModalDefaults).result;
  };
}]);

services.factory('socket', function (socketFactory) {
  return socketFactory({
    //prefix: 'foo~',
    ioSocket: io.connect(socketio_url)
  });
})

var FeedService = ['$resource', function($resource) {
  return $resource(layer_path + 'feed');
}];

// @codekit-prepend "feed_service"

var FeedModule = angular.module('feedModule', ['ngResource']);

// Service of the feed module
FeedModule.factory('Feed', FeedService);

var CategoryService = ['$resource', function($resource) {
  return $resource(layer_path + 'category/:categoryId',
    {
      categoryId: '@categoryId'
    },
    {
      'update': {
        method:'PUT'
      },
      'writable': {
        method: 'GET',
        params: {permissions:'write'},
        isArray: true
      }
    }
  );
}];

var CategoryListController = ['$scope', '$rootScope', '$timeout', '$location', 'Category', 'Feed', 'Bridge', '$route', '$routeParams', '$http', 'socket',
  function($scope, $rootScope, $timeout, $location, Category, Feed, Bridge, $route, $routeParams, $http, socket) {

  	$scope.categories = [];
  	//$scope.resolving  = true;

    $scope.resolving = {
      categories: true,
      init: false,
      older: false,
      newer: false,
      loaded: false,
    };

  	$scope.category = {};
  	$scope.posts = []; // General feed
    $scope.top_posts = []; // Top feed
  	//$scope.resolving_posts = true;
    //$scope.resolving.older = false;
  	$scope.offset = 0; // We use this to know how many posts have we loaded
  	//$scope.previewStyle = {};

    // Auxiliar variable to know what comment to show
    $scope.view_comment = {
      position: -1
    };

    $scope.activePostId = null;

    // Old composer helper vars
    /*$scope.composer = {
      open: false,
      minimized: false
    };*/

    $scope.viewing = {
      top_posts: false
    };

    $scope.toggleCategories = function() {
      $scope.status.show_categories = !$scope.status.show_categories;
      if(!$scope.status.show_categories) {
        $scope.startupFeed($scope.category);
      }
      $timeout(function() {
        $scope.$broadcast('changedContainers');
      }, 50);
    }

    $scope.appendCategories = function(data, mark_as_unread) {
      mark_as_unread = typeof mark_as_unread !== 'undefined' ? mark_as_unread : false;
      for(p in data) {
        for(c in $scope.categories) {
          for(s in $scope.categories[c].subcategories) {
            if (data[p].category == $scope.categories[c].subcategories[s].id) {
              data[p].category = {
                name: $scope.categories[c].subcategories[s].name,
                color: $scope.categories[c].color,
                slug: $scope.categories[c].subcategories[s].slug
              }
              break;
            }
          }
        }
        if(mark_as_unread) {
          data[p].unread = true;
          data[p].new = true;
        }
      }
    };

    $scope.getTopFeed = function() {
      $scope.resolving_posts = true;
      $scope.top_posts = [];
      var date = new Date();

      var request_vars = {
        limit: 30,
        offset: 0,
        relevant: date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2)
      };

      Feed.get(request_vars, function(response) {
        $scope.appendCategories(response.feed);

        $scope.top_posts = response.feed;
        $scope.page.title = "SpartanGeek.com | Comunidad de tecnología, geeks y más";
        $scope.page.description = "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos.";
        $scope.resolving_posts = false;
      });
    };

  	$scope.startupFeed = function(category) {
  		$scope.resolving_posts = true;
      $scope.posts = [];
      $scope.resolving.loaded = false;

      var vp_h = $(window).height();
      var limit = 10 * Math.ceil(vp_h / 700);

  		Feed.get({limit: limit, offset: 0, category: category.id}, function(data) {

        // For logged users, sync the feed position for new messages notifications
        if($scope.user.isLogged) {
          $scope.status.pending = 0;
          // For sync purposes
          if(category.slug == null) {
            $scope.status.viewing = 'all';
          } else {
            $scope.status.viewing = category.id;
          }
        }

        if(data.feed.length > 0) {
          $scope.appendCategories(data.feed);
          $scope.status.newer_post_date = get_newer_date(data.feed);
          $scope.posts = data.feed;
        }

        // Title... ToDo: Use a service to update this
        if(category.slug != null) {
          $scope.page.title = "SpartanGeek.com | " + category.name;
          $scope.page.description = category.description;
        } else {
          $scope.page.title = "SpartanGeek.com | Comunidad de tecnología, geeks y más";
          $scope.page.description = "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos.";
        }

  			$scope.resolving_posts = false;
  			$scope.offset = data.feed.length;
        $scope.resolving.loaded = true;
  		});
  	};

  	$scope.walkFeed = function() {
      //console.log($scope.resolving.older);
      if(!$scope.resolving.older) {
        $scope.resolving.older = true;
        var pending = $scope.status.pending;
        //console.log($scope.offset, pending);
    		Feed.get({limit: 10, offset: $scope.offset + pending, category: $scope.category.id}, function(data) {
          $scope.appendCategories(data.feed);
    			$scope.posts = $scope.posts.concat(data.feed);
    			$scope.offset = $scope.offset + data.feed.length;
          $scope.resolving.older = false;
    		});
        dataLayer.push({
          'event': 'VirtualPageview',
          'virtualPageURL': '/feed/' + $scope.category.slug,
        });
      } else {
        console.log("FeedGet already running...");
      }
  	};

    var get_newer_date = function(posts) {
      var newer_d = new Date(posts[0].created_at);
      var newer_i = 0;
      for(var i = 1; i < posts.length; i++) {
        var test = new Date(posts[i].created_at);
        if(newer_d < test) {
          newer_d = test;
          newer_i = i;
        }
      }
      return posts[newer_i].created_at;
    }

    $scope.getNewer = function(scroll_to) {
      scroll_to = typeof scroll_to !== 'undefined' ? scroll_to : true;

      if(!$scope.resolving.newer) {
        $scope.resolving.newer = true;
        var pending = $scope.status.pending;

        Feed.get({
          limit: pending,
          before: $scope.status.newer_post_date,
          category: $scope.category.id
        }, function success(data) {
          if(data.feed.length > 0) {
            // append and mark as unread
            $scope.appendCategories(data.feed, true);
            // return to feed if in top posts
            $scope.viewing.top_posts = false;

            // Visual helper in posts
            $timeout(function() {
              for(p in data.feed) {
                data.feed[p].new = false;
              }
            }, 1500);

            $scope.status.newer_post_date = get_newer_date(data.feed);

            $scope.posts = data.feed.concat($scope.posts);
            $scope.offset = $scope.offset + data.feed.length;
            $scope.status.pending -= data.feed.length;
          } else {
            $scope.status.pending = 0;
          }
          $scope.resolving.newer = false;
          if(scroll_to) {
            // return to the top of the feed
            $('.discussions-list').animate({ scrollTop: 0}, 100);
          }
        }, function (error){
          console.log("Error getting new posts");
          $scope.status.pending = 0;
        });
        // Push event to Google Analytics
        dataLayer.push({
          'event': 'VirtualPageview',
          'virtualPageURL': '/feed/' + $scope.category.slug,
        });
      } else {
        console.log("FeedGet already running...");
      }
    };

  	$scope.turnCategory = function( category ) {
  		$scope.category = category;
  		$scope.startupFeed(category);

  		//ga('send', 'pageview', '/category/' + $scope.category.slug);
      dataLayer.push({
        'event': 'VirtualPageview',
        'virtualPageURL': '/category/' + $scope.category.slug,
      });
  	};

    /*
     * Toggle individual category switch, if error, invert switch
     */
    $scope.toggleSubscription = function(category) {
      if(category.selected) {
        $http.put(layer_path + 'category/subscription/' + category.id)
          .then(function success(response){
            if($scope.user.info.categories) {
              if($scope.user.info.categories.indexOf(category.id) == -1) {
                $scope.user.info.categories.push(category.id);
              }
            } else {
              $scope.user.info.categories.push(category.id);
            }
          }, function(error){
            category.selected = false;
          });
      } else {
        $http.delete(layer_path + 'category/subscription/' + category.id)
          .then(function success(response){
            if($scope.user.info.categories) {
              if($scope.user.info.categories.indexOf(category.id) > -1) {
                $scope.user.info.categories.splice($scope.user.info.categories.indexOf(category.id),1);
              }
            }
          }, function(error){
            category.selected = true;
          });
      }
    };

    /*
     * Toggle all upper switch
     */
    $scope.subscribeToAll = function() {
      for(c in $scope.categories) {
        for(s in $scope.categories[c].subcategories) {
          if(!$scope.categories[c].subcategories[s].selected) {
            $scope.categories[c].subcategories[s].selected = true;
            $scope.toggleSubscription($scope.categories[c].subcategories[s]);
          }
        }
      }
    }

  	$scope.viewPost = function( post ) {
  		$scope.activePostId = post.id;
      $scope.status.post_selected = true;
  		Bridge.changePost(post);

  		//ga('send', 'pageview', '/post/' + $scope.category.slug + '/' + post.id);
      dataLayer.push({
        'event': 'VirtualPageview',
        'virtualPageURL': '/post/' + $scope.category.slug + '/' + post.id,
      });
  	};

    $scope.viewPostID = function( postId, slug ) {
      $scope.activePostId = postId;
      $scope.status.post_selected = true;
      Bridge.changePost({id: postId, slug: slug, name: ""});

      //ga('send', 'pageview', '/post/' + slug + '/' + postId);
      dataLayer.push({
        'event': 'VirtualPageview',
        'virtualPageURL': '/post/' + slug + '/' + postId,
      });
    };

    $scope.reloadPost = function() {
      $scope.viewPostID($scope.activePostId, "");
    }

    $scope.matchCategories = function() {
      // For loged users, we match their personal feed current values
      if($scope.user.isLogged) {
        $scope.promises.self.then(function success(response) {
          if($scope.user.info.categories) {
            for(var i in $scope.categories) {
              for(var j in $scope.categories[i].subcategories) {
                if ($scope.user.info.categories.indexOf($scope.categories[i].subcategories[j].id) > -1) {
                  $scope.categories[i].subcategories[j].selected = true;
                }
              }
            }
          }
        });
      }
    };

    $scope.consolidateComments = function(post) {
      post.unread = false;
      if(!post.comments.new) {
        post.comments.new = 0;
      }
      post.comments.count += post.comments.new;
      post.comments.new = 0;
    }

    /* Watchers */
    $scope.$on('userLogged', function(e) {
      $scope.matchCategories();
    });

    $scope.$on('reloadPost', function(e) {
      $scope.reloadPost();
    });

    $scope.$on('postDeleted', function(e) {
      // Doing...
    });

    $scope.$on('comments-loaded', function(event, data) {
      for(var i = 0; i < $scope.posts.length; i++) {
        if($scope.posts[i].id == data.id) {
          $scope.consolidateComments($scope.posts[i]);
          break;
        }
      }
    });

    socket.on('feed action', function (data) {
      debug = $scope.can("debug");
      if(data.fire) {
        switch(data.fire) {
          case "new-post":
            if(debug) console.log("New event: new-post", data);
            if($scope.status.viewing == 'all' || $scope.status.viewing == data.category) {
              $scope.status.pending++;
            }
            break;
          case "new-comment":
            if(debug) console.log("New event: new-comment", data);
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                if(!$scope.posts[i].comments.new) {
                  $scope.posts[i].comments.new = 0;
                }
                if($scope.user.isLogged) {
                  $scope.promises.self.then(function() {
                    if(data.user_id != $scope.user.info.id) {
                      $scope.posts[i].comments.new++;
                      $scope.posts[i].unread = true;
                    }
                  });
                } else {
                  $scope.posts[i].comments.count++;
                }
                break;
              }
            }
            if($scope.user.isLogged) {
              $scope.promises.self.then(function(){
                if(data.user_id != $scope.user.info.id) {
                  $scope.$broadcast('new-comment', data);
                }
              });
            }
            break;
          case "delete-post":
            if(debug) console.log("New event: delete-post");
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                $scope.posts.splice(i,1);
                $scope.offset--;
                break;
              }
            }
            break;
          case "delete-comment":
            if(debug) console.log("New event: delete-comment");
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                $scope.posts[i].comments.count--;
                break;
              }
            }
            break;
          case "pinned":
            if(debug) console.log("New event: pinned");
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                $scope.posts[i].pinned = true;
                break;
              }
            }
            break;
          case "unpinned":
            if(debug) console.log("New event: unpinned");
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                //$scope.posts[i].pinned = false;
                delete $scope.posts[i].pinned;
                break;
              }
            }
            break;
          case "best-answer":
            if(debug) if(debug) console.log("New event: best-answer");
            for(var i = 0; i < $scope.posts.length; i++) {
              if($scope.posts[i].id == data.id) {
                $scope.posts[i].solved = true;
                break;
              }
            }
            break;
          default:
            if(debug) console.log("I don't know what the hell did Blacker say!")
        }
      }
    });

    $scope.$on('$destroy', function(event, data) {
      if($scope.can("debug")) console.log("Socket stop listening to 'feed action'");
      socket.removeAllListeners('feed action');
    });

    // Hack, so we don't have to reload the controller if the route uses the same controller
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
      if($location.path() !== '/') {
        if(lastRoute.$$route.controller === $route.current.$$route.controller) {
          // console.log(lastRoute.$$route.controller, $route.current.$$route.controller);
          // Will not load only if my view use the same controller
          // We recover new params
          new_params = $route.current.params;
          $route.current = lastRoute;
          $route.current.params = new_params;

          // get the current path
          var loc = $location.path();
          var params = $route.current.params;
          //console.log(loc, params);
          if (loc.indexOf("/c/") >= 0) {
            for (var i in $scope.categories) {
              for(var j in $scope.categories[i].subcategories) {
                if ($scope.categories[i].subcategories[j].slug == params.slug) {
                  $scope.category = $scope.categories[i].subcategories[j];
                  break;
                }
              }
            }
            $scope.toggleCategories();
          }
          else if (loc.indexOf("/p/") >= 0) {
            var cn = loc.split('/');
            if(cn.length == 5) {
              cn = cn[4]; // comment number
              //console.log("Watching comment:", cn);
              $scope.view_comment.position = cn;
            }
            else {
              $scope.view_comment.position = -1;
            }
            $scope.viewPostID(params.id, params.slug);
          }
        }
        else
        {
          $scope.status.post_selected = false;
        }
      }
      else
      {
        $scope.status.post_selected = false;
      }
    });

  	// Resolve categories though
  	Category.query(function(data) {
  		$scope.resolving.categories = false;
  		$scope.categories = data;
      $scope.matchCategories();

      $timeout(function() {
        $scope.$broadcast('changedContainers');
      }, 100);

  		// Once the categories has been resolved then catch the first one and try to fetch the feed for it
  		var path = $location.path();
  		var loaded = false;

  		if (path.length > 0) {
  			var segments = path.split("/");
        var section_segment = segments[1];
  			var category_segment = segments[2];

        if(section_segment === 'c') {
    			for (var i in $scope.categories) {
            for(var j in $scope.categories[i].subcategories) {
      				if ($scope.categories[i].subcategories[j].slug == category_segment) {
      					$scope.category = $scope.categories[i].subcategories[j];
      					$scope.startupFeed($scope.category);
      					$scope.$broadcast('scrollMeUpdate');
      					loaded = true;
                break;
      				}
            }
    			}
        } else if(section_segment === 'p') {
          $scope.viewPostID($routeParams.id, $routeParams.slug);
          var cn = path.split('/');
          if(cn.length == 5) {
            cn = cn[4]; // comment number
            $scope.view_comment.position = cn;
          }
          else {
            $scope.view_comment.position = -1;
          }
        }
  		}
  		if (loaded == false) {
  			$scope.startupFeed($scope.category);
  		}
  	});
  }
];

// @codekit-prepend "category_service"
// @codekit-prepend "category_list_controller"

var CategoryModule = angular.module('categoryModule', ['ngResource']);

// Service of the categories module
CategoryModule.factory('Category', CategoryService);

// Category module controllers
CategoryModule.controller('CategoryListController', CategoryListController);

var ReaderViewController = ['$scope', '$rootScope', '$http', '$timeout', 'Post', 'Upload', 'modalService', 'socket',
  function($scope, $rootScope, $http, $timeout, Post, Upload, modalService, socket) {

  $scope.post = {};
  $scope.comment = {content:''};
	$scope.waiting = true;
  $scope.waiting_comment = false;
  $scope.adding_file = false;
  $scope.comments_status = {
    'loaded': 10,
    'offset': -20,
    'limit': 10,
    'loading': false,
    'loading_new': false
  };

  $scope.setBestAnswer = function(comment) {
    $http.post(layer_path + "posts/" + $scope.post.id + "/answer/" + comment.position).then(function success(response){
      comment.chosen = true;
      $scope.post.solved = true;
    }, function(error){
      console.log(error, "No se puedo elegir como mejor respuesta.");
    })
  };

  $scope.show_composer = function() {
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
    $('#comment-content').focus();
  };

  $scope.reply_to = function(username, comment) {
    if($scope.comment.content == '') {
      $scope.comment.content = '@' + username + '#' + comment + ' ';
    } else {
      $scope.comment.content = $scope.comment.content + '\n\n@' + username + '#' + comment + ' ';
    }
    $('#comment-content').focus();
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
  }

  // Comment and Post vote
  $scope.comment_vote = function(post_id, comment, direction) {
    $http.post(layer_path + 'vote/comment/' + post_id, {
      comment: '' + comment.position,
      'direction': direction
    }).then(function success(response) {
      //comment.liked = !comment.liked;
      var d = {'up': 1, 'down': -1};
      if(comment.liked == d[direction]) {
        comment.liked = null;
      } else {
        comment.liked = d[direction];
      }
    });
  };
  $scope.post_vote = function(post, direction) {
    $http.post(layer_path + 'vote/post/' + post.id, {
      'direction': direction
    }).then(function success(response) {
      var d = {'up': 1, 'down': -1};
      if(post.liked == d[direction]) {
        post.liked = null;
      } else {
        post.liked = d[direction];
      }
    });
  };

  // Comment publishing
  $scope.publish = function() {
    if(!$scope.waiting_comment) {
      $scope.waiting_comment = true;
      // Check for the post integrity and then send the comment and return the promise
      if ('id' in $scope.post) {
        $http.post(layer_path + 'post/comment/' + $scope.post.id, {
          content: $scope.comment.content
        }).then(function success(response) {
          // Tell the UI we have a new message (our own message) and request for any pending messages...
          $scope.post.comments.new++;
          $scope.loadNewComments();

          // Allow to comment once again
          $scope.waiting_comment = false;
          $scope.comment.content = '';
        }, function(error) {
          console.log("Error publicando comentario...");
          // Allow to comment once again
          $scope.waiting_comment = false;
        });
      }
    }
  };
  $scope.uploadPicture = function(files, comment) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if(comment) {
          // Particular comment edition
          if(comment.content_edit.length > 0) {
            comment.content_edit += '\n' + data.url;
          } else {
            comment.content_edit = data.url;
          }
          comment.content_edit += '\n';
          $scope.adding_file = false;
          $('*[data-number="' + comment.position + '"] .idiot-wizzy.edit #comment-content').focus();
        } else {
          // Global comment edition
          if($scope.comment.content.length > 0) {
            $scope.comment.content += '\n' + data.url;
          } else {
            $scope.comment.content = data.url;
          }
          $scope.comment.content += '\n';
          $scope.adding_file = false;
          $('#comment-content').focus();
        }
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

  // Comment edition
  $scope.editCommentShow = function(comment) {
    var to_edit = $('<div>' + comment.content + '</div>');
    to_edit.find('a.user-mention').each(function(index) {
      var text = $(this).html()
      if($(this).data('comment')) {
        text += '#' + $(this).data('comment');
      }
      $(this).replaceWith(text);
    });
    comment.content_edit = to_edit.html();
    comment.editing = true;
  };
  $scope.editComment = function(comment) {
    // If did not change
    if(comment.content_edit === comment.content) {
      comment.editing = false;
    } else {
      // Insert promise here...
      $http.put(layer_path + 'post/comment/' + $scope.post.id + '/' + comment.position, {content: comment.content_edit})
        .then(function() {
          // On success
          comment.content = comment.content_edit;
          addMediaEmbed(comment);
          comment.editing = false;
        })
    }
  };

  // Comment deletion
  $scope.deleteComment = function(comment) {
    var modalOptions = {
      closeButtonText: 'Cancelar',
      actionButtonText: 'Eliminar comentario',
      headerText: '¿Eliminar comentario?',
      bodyText: 'Una vez que se elimine, no podrás recuperarlo.'
    };

    modalService.showModal({}, modalOptions).then(function(result) {
      $http.delete(layer_path + 'post/comment/' + $scope.post.id + '/' + comment.position)
        .then(function success(response) {
          deleteCommentObject(comment);
        });
    });
  }
  var deleteCommentObject = function(comment) {
    var position = $scope.post.comments.set.indexOf(comment);
    if(position > -1) {
      $scope.post.comments.set.splice(position, 1);
      $scope.post.comments.count--; // Total remains the same
    }
    $scope.$broadcast('scrubberRecalculate');
  }

  // Delete post
  $scope.deletePost = function() {
    var modalOptions = {
      closeButtonText: 'Cancelar',
      actionButtonText: 'Eliminar publicación',
      headerText: '¿Eliminar publicación?',
      bodyText: 'Una vez que se elimine, no podrás recuperarla.'
    };

    modalService.showModal({}, modalOptions).then(function(result) {
      $http.delete(layer_path + 'posts/' + $scope.post.id)
        .then(function() {
          //$scope.$emit('postDeleted');
          // Return to home
          window.location.href = "/";
        });
    });
  }

  // Load previous comments
  $scope.loadPreviousComments = function() {
    $scope.comments_status.loading = true;
    //console.log("Loading", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
    if($scope.post.comments.total - $scope.comments_status.loaded < 10) {
      $scope.comments_status.limit = $scope.post.comments.total - $scope.comments_status.loaded;
    }
    $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
      'offset': $scope.comments_status.offset,
      'limit': $scope.comments_status.limit
    } } ).then(function success(response){
      console.log(response.data.comments.set);
      new_comments = response.data.comments.set;
      for(var c in new_comments) {
        addMediaEmbed(new_comments[c]);
      }
      new_comments = new_comments.concat($scope.post.comments.set);
      $scope.post.comments.set = new_comments;
      $scope.comments_status.loaded += $scope.comments_status.limit;
      $scope.comments_status.offset -= $scope.comments_status.limit;
      $scope.comments_status.loading = false;

      console.log("Loaded", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
    }, function(error){
      console.log("Error while loading...");
      $scope.comments_status.loading = false;
    });
  }
  $scope.loadAllPreviousComments = function() {
    $scope.comments_status.loading = true;
    if($scope.post.comments.total - $scope.comments_status.loaded > 0) {
      $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
        'offset': 0,
        'limit': $scope.post.comments.total - $scope.comments_status.loaded
      } } ).then(function success(response){
        //console.log(response.data.comments.set);
        $scope.comments_status.loaded += response.data.comments.set.length;
        new_comments = response.data.comments.set;
        for(var c in new_comments) {
          addMediaEmbed(new_comments[c]);
        }
        new_comments = new_comments.concat($scope.post.comments.set);
        $scope.post.comments.set = new_comments;
        $scope.comments_status.offset = 0;
        $scope.comments_status.loading = false;
      }, function(error){
        console.log("Error while loading...");
        $scope.comments_status.loading = false;
      });
    }
  }

  // Load new comments
  $scope.loadNewComments = function() {
    $scope.comments_status.loading_new = true;
    $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
      'offset': $scope.post.comments.total,
      'limit': $scope.post.comments.new
    } } ).then(function success(response) {
      if($scope.can("debug")) console.log(response.data.comments.set);
      new_comments = response.data.comments.set;
      for(var c in new_comments) {
        addMediaEmbed(new_comments[c]);
      }
      $scope.post.comments.set = $scope.post.comments.set.concat(new_comments);
      var added = new_comments.length;
      $scope.post.comments.new = 0;
      $scope.post.comments.total += added;
      $scope.post.comments.count += added;
      $scope.comments_status.loading_new = false;

      $scope.$emit('comments-loaded', {id: $scope.post.id});
    }, function(error){
      console.log("Error while loading new comments...");
      $scope.comments_status.loading_new = false;
    });
  }

  // Update post content
  var updatePostContent = function() {
    Post.get({id: $scope.post.id}, function success(data) {
      if($scope.can("debug")) console.log(data);
      $scope.post.content = data.content;
      addMediaEmbed($scope.post);
    }, function (error) {
      console.log("Error loading post", error);
    });
  }

  // For user profile preview
  // Todo: add a request for obtaining more info...
  $scope.toggleUserCard = function (comment){
    var time = comment.showAuthor ? 0:800;
    comment.showAuthor = !comment.showAuthor;
    if(comment.showAuthor) {
      var fbRef = new Firebase(firebase_url);
      var userRef = fbRef.child("users").child(comment.author.id);
      var presenceRef = userRef.child("presence");
      presenceRef.once('value', function(ss) {
        //$scope.$apply(function() {
          if(ss.val() !== null) {
            comment.author.status = true;
          } else {
            comment.author.status = false;
          }
        //});
      });
    }
    $timeout(function(){
      comment.showAuthorAnimation = !comment.showAuthorAnimation;
    }, time);
  };

  // Socket.io logic
  $scope.$watch('post.id', function(newValue, oldValue){
    if(oldValue !== undefined) {
      if($scope.can("debug")) console.log("Socket stop listening to 'post " + $scope.post.id + "'");
      socket.removeAllListeners("post " + oldValue);
    }
    if(newValue !== undefined) {
      /* Add socket listener */
      if($scope.can("debug")) console.log("Socket listening to 'post " + $scope.post.id + "'");
      socket.on('post ' + $scope.post.id, function (data) {
        debug = $scope.can("debug");
        if(data.fire) {
          switch(data.fire) {
            case "upvote":
              if(debug) console.log("New event: upvote", data);
              $scope.post.votes.up++;
              break;
            case "upvote-remove":
              if(debug) console.log("New event: upvote-remove", data);
              $scope.post.votes.up--;
              break;
            case "downvote":
              if(debug) console.log("New event: downvote", data);
              $scope.post.votes.down++;
              break;
            case "downvote-remove":
              if(debug) console.log("New event: downvote-remove", data);
              $scope.post.votes.down--;
              break;
            case "comment-upvote":
              if(debug) console.log("New event: comment-upvote", data);
              if($scope.post.comments) {
                for(var i in $scope.post.comments.set) {
                  if($scope.post.comments.set[i].position == data.index) {
                    $scope.post.comments.set[i].votes.up++;
                    break;
                  }
                }
              }
              break;
            case "comment-upvote-remove":
              if(debug) console.log("New event: comment-upvote-remove", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.up--;
                  break;
                }
              }
              break;
            case "comment-downvote":
              if(debug) console.log("New event: comment-downvote", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.down++;
                  break;
                }
              }
              break;
            case "comment-downvote-remove":
              if(debug) console.log("New event: comment-downvote-remove", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.down--;
                  break;
                }
              }
              break;
            case "updated":
              if(debug) console.log("New event: updated", data);
              updatePostContent();
              break;
            case "comment-updated":
              if(debug) console.log("New event: comment-updated", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
                    'offset': data.index,
                    'limit': 1
                  }}).then(function success(response) {
                    if(response.data.comments.set.length == 1) {
                      new_comment = response.data.comments.set[0];
                      addMediaEmbed(new_comment);
                      $scope.post.comments.set[i] = new_comment;
                    }
                  }, function (error){
                    console.log("Error updating comment");
                  });
                  break;
                }
              }
              break;
            case "delete-comment":
              if(debug) console.log("New event: delete-comment", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  deleteCommentObject($scope.post.comments.set[i]);
                  break;
                }
              }
              break;
            case "locked":
              if(debug) console.log("New event: locked", data);
              $scope.post.lock = true;
              break;
            case "unlocked":
              if(debug) console.log("New event: unlocked", data);
              $scope.post.lock = false;
              break;
            default:
              if(debug) console.log("I don't know what the hell did Blacker say!")
          }
        }
      });
    }
  }, false);

  $scope.$on('new-comment', function(event, data) {
    if(data.id == $scope.post.id) {
      if($scope.post.comments) {
        $scope.post.comments.new++;
      }
    }
  });

	$scope.$on('resolvePost', function(event, post) {
		$scope.waiting = false;
		$scope.resolving = true;
    $scope.error_loading = false;
		$scope.post = post;
		$scope.force_comment = false;

		Post.get({id: post.id}, function success(data) {
      if($scope.can("debug")) console.log(data);
			$scope.post = data;
      addMediaEmbed($scope.post);

      if($scope.post.comments.answer) {
        addMediaEmbed($scope.post.comments.answer);
      }

      $scope.post.comments.new = 0;

      for (var c in $scope.categories) {
        for(var s in $scope.categories[c].subcategories) {
          if($scope.categories[c].subcategories[s].id == $scope.post.category) {
            $scope.post.category = {
              id: $scope.categories[c].subcategories[s].id,
              name: $scope.categories[c].subcategories[s].name,
              slug: $scope.categories[c].subcategories[s].slug,
              parent_slug: $scope.categories[c].slug,
              color: $scope.categories[c].color
            }
            break;
          }
        }
      }

      // Attach title and description for SEO purposes
      $scope.page.title = "SpartanGeek.com | "  + $scope.post.title + " en " + $scope.post.category.name;
      if($scope.post.content.length - 1 < 157) {
        $scope.page.description = $scope.post.content;
      } else {
        $scope.page.description = $scope.post.content.substring(0, 157) + '...';
      }

      // If searching for a comment not loaded, load it:
      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        if($scope.post.comments.total - $scope.comments_status.loaded > $scope.view_comment.position) {
          $scope.comments_status.loading = true;

          var comments_offset = $scope.view_comment.position;
          var comments_to_load = $scope.post.comments.total - comments_offset - $scope.comments_status.loaded;

          $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
            'offset': comments_offset,
            'limit': comments_to_load
          } } ).then(function success(response){
            //console.log(response.data.comments.set);
            new_comments = response.data.comments.set;
            for(var c in new_comments) {
              addMediaEmbed(new_comments[c]);
            }
            new_comments = new_comments.concat($scope.post.comments.set);
            $scope.post.comments.set = new_comments;
            $scope.comments_status.loaded += comments_to_load;
            $scope.comments_status.offset = comments_offset;
            $scope.comments_status.loading = false;

            $timeout(function() {
              var elem = $('.comment[data-number='+$scope.view_comment.position+']');
              if(elem.val() === "") {
                elem.addClass('active');
                $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
              }
            }, 500);

            //console.log("Loaded", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
          }, function(error){
            console.log("Error while loading...");
            $scope.comments_status.loading = false;
          });
        } else {
          $timeout(function() {
            var elem = $('.comment[data-number='+$scope.view_comment.position+']');
            if(elem.val() === "") {
              elem.addClass('active');
              $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
            }
          }, 500);
        }
      }

      // Postproccess every comment
      for(var c in $scope.post.comments.set) {
        addMediaEmbed($scope.post.comments.set[c]);
      }
      $scope.resolving = false;

      // If searching for a comment, move to that comment
      /*if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 1500);
      }*/

      /* TEMPORAL - TODO: MOVE TO A DIRECTIVE */
      $scope.total_h = $scope.viewport_h = 0;
      /*$timeout(function() {
        $scope.total_h = $('.current-article')[0].scrollHeight;
        $scope.viewport_h = $('.current-article').height();

        $scope.ratio = $scope.viewport_h/$scope.total_h*100;
        $scope.scrollable = 0;
        $scope.scrollable_h = $scope.total_h - $scope.viewport_h;
        if($scope.ratio < 35) {
          $scope.ratio = 35;
          $scope.scrollable = 65;
        } else {
          $scope.scrollable = 100 - $scope.ratio;
        }
        $scope.surplus = $scope.scrollable;
        //console.log($scope.viewport_h, $scope.total_h, $scope.scrollable_h, $scope.ratio, $scope.surplus);

        $('.scrubber-before').css('height', (100 - $scope.ratio - $scope.surplus) + '%');
        $('.scrubber-slider').css('height', $scope.ratio + '%');
        $('.scrubber-after').css('height', $scope.surplus + '%');

        $scope.comments_positions = [{
          top: 0,
          bottom: $('div.discussion-posts div.content').height()
        }];
        //console.log(0, $scope.comments_positions[0]);
        $('div.comment').each(function(index) {
          var t = $(this);
          $scope.comments_positions[index + 1] = {
            top: t.position().top,
            bottom: t.position().top + t.height()
          };
          //console.log(index + 1, $scope.comments_positions[index+1]);
        });
      }, 350);*/

      var from_top, surplus, lastScrollTop = 0;
      $scope.scrubber = {
        current_c: 0
      };
      // Scrolling responses
      /*$('.current-article').scroll( function() {
        from_top = $(this).scrollTop();

        if (from_top > lastScrollTop){
          // downscroll code
          if($scope.scrubber.current_c < $scope.comments_positions.length - 1) {
            while( (from_top + 210) > $scope.comments_positions[$scope.scrubber.current_c].bottom ) {
              $scope.scrubber.current_c++;
            }
            $scope.$apply(function () {
              $scope.scrubber.current_c;
            });
          }
        } else {
          // upscroll code
          if($scope.scrubber.current_c > 0) {
            while ( (from_top + 210) < $scope.comments_positions[$scope.scrubber.current_c].top ) {
              $scope.scrubber.current_c--;
            }
            $scope.$apply(function () {
              $scope.scrubber.current_c;
            });
          }
        }
        lastScrollTop = from_top;

        surplus = from_top / $scope.scrollable_h;
        surplus = 100 - surplus * 100;
        if(surplus < 0) { surplus = 0; }
        $scope.surplus = surplus * $scope.scrollable / 100;

        $('.scrubber-before').css('height', (100 - $scope.ratio - $scope.surplus) + '%');
        $('.scrubber-slider').css('height', $scope.ratio + '%');
        $('.scrubber-after').css('height', $scope.surplus + '%');
      });*/
      /* End TODO */
		}, function(response) {
      $scope.resolving = false;
      $scope.error_loading = true;
    });
	});

  $scope.$on('scrubberRecalculate', function(event) {
    $timeout(function() {
      $scope.total_h = $('.current-article')[0].scrollHeight;
      $scope.viewport_h = $('.current-article').height();

      $scope.ratio = $scope.viewport_h/$scope.total_h*100;
      $scope.scrollable = 0;
      $scope.scrollable_h = $scope.total_h - $scope.viewport_h;
      if($scope.ratio < 15) {
        $scope.ratio = 15;
        $scope.scrollable = 85;
      } else {
        $scope.scrollable = 100 - $scope.ratio;
      }

      $scope.comments_positions = [{
        top: 0,
        bottom: $('div.discussion-posts div.content').height()
      }];
      $('div.comment').each(function(index) {
        var t = $(this);
        $scope.comments_positions[index + 1] = {
          top: t.position().top,
          bottom: t.position().top + t.height()
        };
      });
    }, 500);
  });

  var addMediaEmbed = function(comment) {
    // Replace any image
    var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "gi");
    var to_replace = "<div class=\"img-preview\"><a href=\"$1\" target=\"_blank\"><img src=\"$1\"></a></div>";
    comment.content_final = comment.content.replace(regex, to_replace);

    // Replace Youtube videos
    var yt_re = /(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/)(?:v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]{11})\S*/g;
    var to_replace = "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/$4\" frameborder=\"0\" allowfullscreen></iframe>";

    // Replace emoji
    var emojis = [
      "bowtie", "smile", "laughing", "blush", "smiley", "relaxed",
      "smirk", "heart_eyes", "kissing_heart", "kissing_closed_eyes", "flushed",
      "relieved", "satisfied", "grin", "wink", "stuck_out_tongue_winking_eye",
      "stuck_out_tongue_closed_eyes", "grinning", "kissing",
      "kissing_smiling_eyes", "stuck_out_tongue", "sleeping", "worried",
      "frowning", "anguished", "open_mouth", "grimacing", "confused", "hushed",
      "expressionless", "unamused", "sweat_smile", "sweat",
      "disappointed_relieved", "weary", "pensive", "disappointed", "confounded",
      "fearful", "cold_sweat", "persevere", "cry", "sob", "joy", "astonished",
      "scream", "neckbeard", "tired_face", "angry", "rage", "triumph", "sleepy",
      "yum", "mask", "sunglasses", "dizzy_face", "imp", "smiling_imp",
      "neutral_face", "no_mouth", "innocent", "alien", "yellow_heart",
      "blue_heart", "purple_heart", "heart", "green_heart", "broken_heart",
      "heartbeat", "heartpulse", "two_hearts", "revolving_hearts", "cupid",
      "sparkling_heart", "sparkles", "star", "star2", "dizzy", "boom",
      "collision", "anger", "exclamation", "question", "grey_exclamation",
      "grey_question", "zzz", "dash", "sweat_drops", "notes", "musical_note",
      "fire", "hankey", "poop", "shit", "\\+1", "thumbsup", "-1", "thumbsdown",
      "ok_hand", "punch", "facepunch", "fist", "v", "wave", "hand", "raised_hand",
      "open_hands", "point_up", "point_down", "point_left", "point_right",
      "raised_hands", "pray", "point_up_2", "clap", "muscle", "metal", "fu",
      "walking", "runner", "running", "couple", "family", "two_men_holding_hands",
      "two_women_holding_hands", "dancer", "dancers", "ok_woman", "no_good",
      "information_desk_person", "raising_hand", "bride_with_veil",
      "person_with_pouting_face", "person_frowning", "bow", "couplekiss",
      "couple_with_heart", "massage", "haircut", "nail_care", "boy", "girl",
      "woman", "man", "baby", "older_woman", "older_man",
      "person_with_blond_hair", "man_with_gua_pi_mao", "man_with_turban",
      "construction_worker", "cop", "angel", "princess", "smiley_cat",
      "smile_cat", "heart_eyes_cat", "kissing_cat", "smirk_cat", "scream_cat",
      "crying_cat_face", "joy_cat", "pouting_cat", "japanese_ogre",
      "japanese_goblin", "see_no_evil", "hear_no_evil", "speak_no_evil",
      "guardsman", "skull", "feet", "lips", "kiss", "droplet", "ear", "eyes",
      "nose", "tongue", "love_letter", "bust_in_silhouette",
      "busts_in_silhouette", "speech_balloon", "thought_balloon", "feelsgood",
      "finnadie", "goberserk", "godmode", "hurtrealbad", "rage1", "rage2",
      "rage3", "rage4", "suspect", "trollface", "sunny", "umbrella", "cloud",
      "snowflake", "snowman", "zap", "cyclone", "foggy", "ocean", "cat", "dog",
      "mouse", "hamster", "rabbit", "wolf", "frog", "tiger", "koala", "bear",
      "pig", "pig_nose", "cow", "boar", "monkey_face", "monkey", "horse",
      "racehorse", "camel", "sheep", "elephant", "panda_face", "snake", "bird",
      "baby_chick", "hatched_chick", "hatching_chick", "chicken", "penguin",
      "turtle", "bug", "honeybee", "ant", "beetle", "snail", "octopus",
      "tropical_fish", "fish", "whale", "whale2", "dolphin", "cow2", "ram", "rat",
      "water_buffalo", "tiger2", "rabbit2", "dragon", "goat", "rooster", "dog2",
      "pig2", "mouse2", "ox", "dragon_face", "blowfish", "crocodile",
      "dromedary_camel", "leopard", "cat2", "poodle", "paw_prints", "bouquet",
      "cherry_blossom", "tulip", "four_leaf_clover", "rose", "sunflower",
      "hibiscus", "maple_leaf", "leaves", "fallen_leaf", "herb", "mushroom",
      "cactus", "palm_tree", "evergreen_tree", "deciduous_tree", "chestnut",
      "seedling", "blossom", "ear_of_rice", "shell", "globe_with_meridians",
      "sun_with_face", "full_moon_with_face", "new_moon_with_face", "new_moon",
      "waxing_crescent_moon", "first_quarter_moon", "waxing_gibbous_moon",
      "full_moon", "waning_gibbous_moon", "last_quarter_moon",
      "waning_crescent_moon", "last_quarter_moon_with_face",
      "first_quarter_moon_with_face", "moon", "earth_africa", "earth_americas",
      "earth_asia", "volcano", "milky_way", "partly_sunny", "octocat", "squirrel",
      "bamboo", "gift_heart", "dolls", "school_satchel", "mortar_board", "flags",
      "fireworks", "sparkler", "wind_chime", "rice_scene", "jack_o_lantern",
      "ghost", "santa", "christmas_tree", "gift", "bell", "no_bell",
      "tanabata_tree", "tada", "confetti_ball", "balloon", "crystal_ball", "cd",
      "dvd", "floppy_disk", "camera", "video_camera", "movie_camera", "computer",
      "tv", "iphone", "phone", "telephone", "telephone_receiver", "pager", "fax",
      "minidisc", "vhs", "sound", "speaker", "mute", "loudspeaker", "mega",
      "hourglass", "hourglass_flowing_sand", "alarm_clock", "watch", "radio",
      "satellite", "loop", "mag", "mag_right", "unlock", "lock",
      "lock_with_ink_pen", "closed_lock_with_key", "key", "bulb", "flashlight",
      "high_brightness", "low_brightness", "electric_plug", "battery", "calling",
      "email", "mailbox", "postbox", "bath", "bathtub", "shower", "toilet",
      "wrench", "nut_and_bolt", "hammer", "seat", "moneybag", "yen", "dollar",
      "pound", "euro", "credit_card", "money_with_wings", "e-mail", "inbox_tray",
      "outbox_tray", "envelope", "incoming_envelope", "postal_horn",
      "mailbox_closed", "mailbox_with_mail", "mailbox_with_no_mail", "door",
      "smoking", "bomb", "gun", "hocho", "pill", "syringe", "page_facing_up",
      "page_with_curl", "bookmark_tabs", "bar_chart", "chart_with_upwards_trend",
      "chart_with_downwards_trend", "scroll", "clipboard", "calendar", "date",
      "card_index", "file_folder", "open_file_folder", "scissors", "pushpin",
      "paperclip", "black_nib", "pencil2", "straight_ruler", "triangular_ruler",
      "closed_book", "green_book", "blue_book", "orange_book", "notebook",
      "notebook_with_decorative_cover", "ledger", "books", "bookmark",
      "name_badge", "microscope", "telescope", "newspaper", "football",
      "basketball", "soccer", "baseball", "tennis", "8ball", "rugby_football",
      "bowling", "golf", "mountain_bicyclist", "bicyclist", "horse_racing",
      "snowboarder", "swimmer", "surfer", "ski", "spades", "hearts", "clubs",
      "diamonds", "gem", "ring", "trophy", "musical_score", "musical_keyboard",
      "violin", "space_invader", "video_game", "black_joker",
      "flower_playing_cards", "game_die", "dart", "mahjong", "clapper", "memo",
      "pencil", "book", "art", "microphone", "headphones", "trumpet", "saxophone",
      "guitar", "shoe", "sandal", "high_heel", "lipstick", "boot", "shirt",
      "tshirt", "necktie", "womans_clothes", "dress", "running_shirt_with_sash",
      "jeans", "kimono", "bikini", "ribbon", "tophat", "crown", "womans_hat",
      "mans_shoe", "closed_umbrella", "briefcase", "handbag", "pouch", "purse",
      "eyeglasses", "fishing_pole_and_fish", "coffee", "tea", "sake",
      "baby_bottle", "beer", "beers", "cocktail", "tropical_drink", "wine_glass",
      "fork_and_knife", "pizza", "hamburger", "fries", "poultry_leg",
      "meat_on_bone", "spaghetti", "curry", "fried_shrimp", "bento", "sushi",
      "fish_cake", "rice_ball", "rice_cracker", "rice", "ramen", "stew", "oden",
      "dango", "egg", "bread", "doughnut", "custard", "icecream", "ice_cream",
      "shaved_ice", "birthday", "cake", "cookie", "chocolate_bar", "candy",
      "lollipop", "honey_pot", "apple", "green_apple", "tangerine", "lemon",
      "cherries", "grapes", "watermelon", "strawberry", "peach", "melon",
      "banana", "pear", "pineapple", "sweet_potato", "eggplant", "tomato", "corn",
      "house", "house_with_garden", "school", "office", "post_office", "hospital",
      "bank", "convenience_store", "love_hotel", "hotel", "wedding", "church",
      "department_store", "european_post_office", "city_sunrise", "city_sunset",
      "japanese_castle", "european_castle", "tent", "factory", "tokyo_tower",
      "japan", "mount_fuji", "sunrise_over_mountains", "sunrise", "stars",
      "statue_of_liberty", "bridge_at_night", "carousel_horse", "rainbow",
      "ferris_wheel", "fountain", "roller_coaster", "ship", "speedboat", "boat",
      "sailboat", "rowboat", "anchor", "rocket", "airplane", "helicopter",
      "steam_locomotive", "tram", "mountain_railway", "bike", "aerial_tramway",
      "suspension_railway", "mountain_cableway", "tractor", "blue_car",
      "oncoming_automobile", "car", "red_car", "taxi", "oncoming_taxi",
      "articulated_lorry", "bus", "oncoming_bus", "rotating_light", "police_car",
      "oncoming_police_car", "fire_engine", "ambulance", "minibus", "truck",
      "train", "station", "train2", "bullettrain_front", "bullettrain_side",
      "light_rail", "monorail", "railway_car", "trolleybus", "ticket", "fuelpump",
      "vertical_traffic_light", "traffic_light", "warning", "construction",
      "beginner", "atm", "slot_machine", "busstop", "barber", "hotsprings",
      "checkered_flag", "crossed_flags", "izakaya_lantern", "moyai",
      "circus_tent", "performing_arts", "round_pushpin",
      "triangular_flag_on_post", "jp", "kr", "cn", "us", "fr", "es", "it", "ru",
      "gb", "uk", "de", "one", "two", "three", "four", "five", "six", "seven",
      "eight", "nine", "keycap_ten", "1234", "zero", "hash", "symbols",
      "arrow_backward", "arrow_down", "arrow_forward", "arrow_left",
      "capital_abcd", "abcd", "abc", "arrow_lower_left", "arrow_lower_right",
      "arrow_right", "arrow_up", "arrow_upper_left", "arrow_upper_right",
      "arrow_double_down", "arrow_double_up", "arrow_down_small",
      "arrow_heading_down", "arrow_heading_up", "leftwards_arrow_with_hook",
      "arrow_right_hook", "left_right_arrow", "arrow_up_down", "arrow_up_small",
      "arrows_clockwise", "arrows_counterclockwise", "rewind", "fast_forward",
      "information_source", "ok", "twisted_rightwards_arrows", "repeat",
      "repeat_one", "new", "top", "up", "cool", "free", "ng", "cinema", "koko",
      "signal_strength", "u5272", "u5408", "u55b6", "u6307", "u6708", "u6709",
      "u6e80", "u7121", "u7533", "u7a7a", "u7981", "sa", "restroom", "mens",
      "womens", "baby_symbol", "no_smoking", "parking", "wheelchair", "metro",
      "baggage_claim", "accept", "wc", "potable_water", "put_litter_in_its_place",
      "secret", "congratulations", "m", "passport_control", "left_luggage",
      "customs", "ideograph_advantage", "cl", "sos", "id", "no_entry_sign",
      "underage", "no_mobile_phones", "do_not_litter", "non-potable_water",
      "no_bicycles", "no_pedestrians", "children_crossing", "no_entry",
      "eight_spoked_asterisk", "eight_pointed_black_star", "heart_decoration",
      "vs", "vibration_mode", "mobile_phone_off", "chart", "currency_exchange",
      "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpius",
      "sagittarius", "capricorn", "aquarius", "pisces", "ophiuchus",
      "six_pointed_star", "negative_squared_cross_mark", "a", "b", "ab", "o2",
      "diamond_shape_with_a_dot_inside", "recycle", "end", "on", "soon", "clock1",
      "clock130", "clock10", "clock1030", "clock11", "clock1130", "clock12",
      "clock1230", "clock2", "clock230", "clock3", "clock330", "clock4",
      "clock430", "clock5", "clock530", "clock6", "clock630", "clock7",
      "clock730", "clock8", "clock830", "clock9", "clock930", "heavy_dollar_sign",
      "copyright", "registered", "tm", "x", "heavy_exclamation_mark", "bangbang",
      "interrobang", "o", "heavy_multiplication_x", "heavy_plus_sign",
      "heavy_minus_sign", "heavy_division_sign", "white_flower", "100",
      "heavy_check_mark", "ballot_box_with_check", "radio_button", "link",
      "curly_loop", "wavy_dash", "part_alternation_mark", "trident",
      "black_square", "white_square", "white_check_mark", "black_square_button",
      "white_square_button", "black_circle", "white_circle", "red_circle",
      "large_blue_circle", "large_blue_diamond", "large_orange_diamond",
      "small_blue_diamond", "small_orange_diamond", "small_red_triangle",
      "small_red_triangle_down", "shipit"
    ],
    rEmojis = new RegExp(":(" + emojis.join("|") + "):", "g");
    comment.content_final = comment.content_final.replace(rEmojis, function (match, text) {
      return "<i class='emoji emoji_" + text + "' title=':" + text + ":'>" + text + "</i>";
    });

    comment.content_final = comment.content_final.replace(yt_re, to_replace);
  }
}];

var PostService = ['$resource', function($resource) {
  return $resource(layer_path + 'posts/:id',
    {
      postId: '@id'
    },
    {
      'update': {
        method:'PUT'
      },
      'light': {
        method: 'GET',
        url: layer_path + 'posts/:id/light'
      }
    }
  );
}];

// @codekit-prepend "reader_view_controller"
// @codekit-prepend "post_service"

var ReaderModule = angular.module('readerModule', ['ngResource']);

// Service of the feed module
ReaderModule.factory('Post', PostService);

// Reader module controllers
ReaderModule.controller('ReaderViewController', ReaderViewController);

var PublishController = ['$scope', '$routeParams', '$http', 'Category', 'Part', 'Upload',
  function($scope, $routeParams, $http, Category, Part, Upload) {

  $scope.publishing = true;
  $scope.message = "";

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

	$scope.categories = [];

  $scope.post = {
    title: '',
    content: '',
    category: '',
    components: false,
    is_question: false,
    pinned: false
  };

	$scope.budgetFlexibility = [
		{
			label: 'Fijo',
			type:  'Fijo',
			flexibility: '0'
		},
		{
			label: '10% Más',
			type:  'Flexible',
			flexibility: '10'
		},
		{
			label: '20% Más',
			type:  'Flexible',
			flexibility: '20'
		},
		{
			label: '30% Más',
			type:  'Flexible',
			flexibility: '30'
		},
		{
			label: 'Muy Flexible',
			type:  'Muy flexible',
			flexibility: '0'
		}
	];

	$scope.computerPost = {
		budget: $scope.budgetFlexibility[0],
		components: {
      cpu: {
        value: '',
        owned: false,
        poll: false
      },
      motherboard: {
        value: '',
        owned: false,
        poll: false
      },
      ram: {
        value: '',
        owned: false,
        poll: false
      },
      storage: {
        value: '',
        owned: false,
        poll: false
      },
      cooler: {
        value: '',
        owned: false,
        poll: false
      },
      power: {
        value: '',
        owned: false,
        poll: false
      },
      cabinet: {
        value: '',
        owned: false,
        poll: false
      },
      screen: {
        value: '',
        owned: false,
        poll: false
      },
      videocard: {
        value: '',
        owned: false,
        poll: false
      },
      software: '',
      budget: '0',
      budget_currency: 'MXN'
    }
	};

  $scope.partForm = {
    motherboard: {
      model: '',
      brand_list: null,
      model_list: null
    },
    cpu: {
      model: '',
      brand_list: null,
      model_list: null
    },
    'cpu-cooler': {
      model: '',
      brand_list: null,
      model_list: null
    },
    memory: {
      model: '',
      brand_list: null,
      model_list: null
    },
    storage: {
      model: '',
      brand_list: null,
      model_list: null
    }
  };

  $scope.changeModels = function(component_name, component_name_post) {
    if(!component_name_post){
      component_name_post = component_name;
    }
    Part.get({
      type: component_name,
      action:'models',
      manufacturer: $scope.partForm[component_name].model
    }, function(data) {
      if(component_name === 'memory') {
        for(var i = 0; i<data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].size + ' ' + data.parts[i].speed + ' ' + data.parts[i].memory_type;
        }
      }
      else if(component_name === 'cpu') {
        for(var i = 0; i < data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].partnumber;
        }
      }
      else if(component_name === 'storage') {
        for(var i = 0; i < data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].capacity + ' ' + data.parts[i].form_factor + '"';
        }
      }
      $scope.partForm[component_name].model_list = data.parts;
      $scope.computerPost.components[component_name_post].value = '';
    })
  }

  $scope.adding_file = false;
  $scope.uploadPicture = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if($scope.post.content.length > 0) {
          $scope.post.content += '\n' + data.url;
        } else {
          $scope.post.content = data.url;
        }
        $scope.post.content += '\n';
        $scope.adding_file = false;
        $('.publish-content textarea').focus();
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

	$scope.activateComponents = function() {
    // Show the components selection form
		$scope.post.components = true;
    // If we haven't load Pc Parts Brands List, get them from API
    if(!$scope.partForm.motherboard.brand_list) {
      Part.get({type:'motherboard', action:'manufacturers'}, function(data){
        $scope.partForm.motherboard.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.cpu.brand_list) {
      Part.get({type:'cpu', action:'manufacturers'}, function(data){
        $scope.partForm.cpu.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm['cpu-cooler'].brand_list) {
      Part.get({type:'cpu-cooler', action:'manufacturers'}, function(data){
        $scope.partForm['cpu-cooler'].brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.memory.brand_list) {
      Part.get({type:'memory', action:'manufacturers'}, function(data){
        $scope.partForm.memory.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.storage.brand_list) {
      Part.get({type:'storage', action:'manufacturers'}, function(data){
        $scope.partForm.storage.brand_list = data.manufacturers;
      })
    }
	};
  $scope.deactivateComponents = function() {
    $scope.post.components = false;
  };

	$scope.computerPostPublish = function() {
		if($scope.post.title === '') {
      $scope.message = "Te falta el nombre de tu PC";
    } else if($scope.post.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post.category, $scope.post.category.length < 1);
    } else {
      $scope.publishing = true;
  		var components = $scope.computerPost.components;
  		components.budget_type = $scope.computerPost.budget.type;
  		components.budget_flexibility = $scope.computerPost.budget.flexibility;

  		for (var i in components) {
  			if (typeof components[i] === 'object' && 'owned' in components[i]) {
  				if (components[i].owned == 'true') { components[i].owned = true; }
  				if (components[i].owned == 'false') { components[i].owned = false; }
  			}
  		}

  		var post = {
  			kind: "recommendations",
        name: $scope.post.title,
        category: $scope.post.category,
        content: $scope.post.content,
        components: components
  		};

  		$http.post(layer_path + 'post', post).then(function(data) {
  			// Return to home
        window.location.href = "/";
  		}, function(err) {});
    }
	};
	$scope.normalPostPublish = function() {
    if($scope.post.title === '') {
      $scope.message = "Te falta el título de tu publicación";
    } else if($scope.post.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post.category, $scope.post.category.length < 1);
    } else {
      $scope.publishing = true;
  		var post = {
  			content: $scope.post.content,
  			name: $scope.post.title,
  			category: $scope.post.category,
  			kind: 'category-post',
        is_question: $scope.post.is_question,
        pinned: $scope.post.pinned,
        lock: $scope.post.lock
  		};

  		$http.post(layer_path + 'post', post).then(function success(response) {
  			// Return to home
        //console.log(response);
        window.location.href = "/p/"+response.data.post.slug+"/"+response.data.post.id;
  		}, function(err) {
        console.log(err);
      });
    }
	};

  // Load categories
  Category.writable(function(data) {
    $scope.categories = data;
    if($routeParams.cat_slug != undefined) {
      for (var i = 0; i < $scope.categories.length; i++) {
        for(var j in $scope.categories[i].subcategories) {
          if ($scope.categories[i].subcategories[j].slug === $routeParams.cat_slug) {
            $scope.post.category = $scope.categories[i].subcategories[j].id;
            break;
          }
        }
      }
    }
    $scope.publishing = false;
  });
}];

var EditPostController = ['$scope', '$routeParams', '$http', 'Category', 'Part', 'Upload', 'Post', '$routeParams',
  function($scope, $routeParams, $http, Category, Part, Upload, Post, $routeParams) {

  $scope.publishing = true;
  $scope.message = "";
	$scope.categories = [];

  $scope.post_edit = {
    title: '',
    content: '',
    category: '',
    is_question: false,
    pinned: false
  };

  $scope.adding_file = false;
  $scope.uploadPicture = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if($scope.post_edit.content.length > 0) {
          $scope.post_edit.content += '\n' + data.url;
        } else {
          $scope.post_edit.content = data.url;
        }
        $scope.post_edit.content += '\n';
        $scope.adding_file = false;
        $('.publish-content textarea').focus();
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

	$scope.editPost = function() {
    if($scope.post_edit.title === '') {
      $scope.message = "Te falta el título de tu publicación";
    } else if($scope.post_edit.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post_edit.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post_edit.category, $scope.post_edit.category.length < 1);
    } else {
      $scope.publishing = true;
      $scope.post_edit.name = $scope.post_edit.title;

  		$http.put(layer_path + 'posts/' + $scope.post.id, $scope.post_edit)
        .then(function success(response) {
    			// Return to home
          //console.log(response);
          window.location.href = "/p/" + response.data.slug + "/" + response.data.id;
    		}, function(error) {
          console.log(error);
        });
    }
	};

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

  // Load categories
  Category.writable(function(data) {
    $scope.categories = data;

    Post.light({id: $routeParams.id}, function(data) {
      //console.log(data);
      $scope.post = data;
      $scope.post_edit = {
        title: data.title,
        content: data.content,
        category: data.category,
        kind: 'category-post',
        is_question: data.is_question,
        pinned: data.pinned,
        lock: data.lock
      };
      $scope.publishing = false;
    });
  });
}];

// @codekit-prepend "publish_controller"
// @codekit-prepend "edit_controller"

var PublisherModule = angular.module('publisherModule', ['ngResource']);
// Publisher module controllers
PublisherModule.controller('PublishController', PublishController);
PublisherModule.controller('EditPostController', EditPostController);

var PartService = ['$resource', function($resource) {
  return $resource(layer_path + 'part/:type/:action',
    {
      type: '@type',
      action: '@action'
    }
  );
}];

// @codekit-prepend "part_service"

var PartModule = angular.module('partModule', ['ngResource']);

// Service of the feed module
PartModule.factory('Part', PartService);

var UserModule = angular.module('userModule',[]);

// Service of the user module
UserModule.factory('User', ['$resource', function($resource) {
  return $resource(layer_path + 'users/:user_id', {user_id: '@user_id'});
}]);

// User Profile controller
UserModule.controller('UserController', ['$scope', 'User', '$routeParams', 'Feed', 'Upload', '$http', '$timeout', '$firebaseObject',
  function($scope, User, $routeParams, Feed, Upload, $http, $timeout, $firebaseObject) {

  $scope.profile = null;
  $scope.resolving_posts = false;
  $scope.update = {
    updating: false,
    editing_desc: false,
    editing_username: false
  };
  $scope.current_page = 'info';
  $scope.new_data = {
    username: null,
    username_saving: false,
    username_error: false,
    username_error_message: 'El nombre de usuario sólo puede llevar letras, números y guiones. Debe empezar con letra y terminar con número o letra y tener entre 3 y 32 caracteres.'
  }
  $scope.posts = {
    data: [],
    resolving: true,
    offset: 0,
    more_to_load: true,
    first_load: false
  }
  $scope.status = null;

  $scope.password_update = {
    'password': '',
    'password_repeat': '',
    'in_progress': false,
    'show_message': false,
    'which_message': null
  };

  $scope.updatePassword = function() {
    $scope.password_update.in_progress = true;
    $scope.password_update.show_message = false;
    if($scope.password_update.password.length < 8 || $scope.password_update.password.length > 20) {
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'length';
      $scope.password_update.in_progress = false;
      return;
    }
    if($scope.password_update.password != $scope.password_update.password_repeat) {
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'not_equal';
      $scope.password_update.in_progress = false;
      return;
    }
    $http.put(layer_path + "user/my", {password: $scope.password_update.password}).then(function success(response){
      console.log(response);
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'success';
      $scope.password_update.in_progress = false;
      $scope.password_update.password = '';
      $scope.password_update.password_repeat = '';
    }, function(error){
      $scope.password_update.show_message = true;
      $scope.password_update.which_message = 'error';
      $scope.password_update.in_progress = false;
    });
  };

  $scope.editUsername = function() {
    $scope.update.editing_username = true;
  };
  $scope.saveUsername = function() {
    if($scope.user.info.name_changes < 1) {
      $scope.new_data.username_saving = true;
      $http.put(layer_path + "user/my", {username: $scope.new_data.username}).
      success(function(data) {
        $scope.profile.username = $scope.new_data.username;
        $scope.user.info.username = $scope.new_data.username;
        $scope.user.info.name_changes = 1;

        $scope.update.editing_username = false;
      }).
      error(function(data) {
        $scope.update.editing_username = false;
        $scope.new_data.username_saving = false;
      });
    }
  };
  $scope.check_username = function() {
    if( /^[a-zA-Z][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]$/.test($scope.new_data.username) ) {
      $scope.new_data.username_error = false;
    } else {
      $scope.new_data.username_error = true;
    }
  };

  $scope.editDescription = function() {
    $scope.update.editing_desc = true;
    $scope.profile.description_old = $scope.profile.description;
    $timeout(function(){
      $('#description').focus();
    }, 100);
  }
  $scope.makeDescriptionUpdate = function() {
    $http.put(layer_path + "user/my", {
      description: $scope.profile.description
    }).then(function success(response) {
      $scope.update.editing_desc = false;
    }, function(error) {
      $scope.profile.description = $scope.profile.description_old;
      $scope.update.editing_desc = false;
    });
  }
  $scope.cancelDescriptionUpdate = function() {
    //console.log("Canceling edit...", $scope.profile.description, $scope.profile.description_old);
    $scope.profile.description = $scope.profile.description_old;
    $scope.update.editing_desc = false;
  }

  $scope.upload = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.update.updating = true;
      Upload.upload({
        url: layer_path + "user/my/avatar",
        file: file
      }).success(function (data) {
        $scope.user.info.image = data.url;
        $scope.profile.image = data.url;
        $scope.update.updating = false;
      }).error(function(data) {
        $scope.update.updating = false;
      });
    }
  };
  $scope.use_fb_pic = function() {
    $scope.user.info.image = 'https://graph.facebook.com/'+$scope.user.info.facebook.id+'/picture?width=128';
    $scope.profile.image = 'https://graph.facebook.com/'+$scope.user.info.facebook.id+'/picture?width=128';
  }
  $scope.remove_pic = function() {
    $scope.user.info.image = null;
    $scope.profile.image = null;
  }

  $scope.startFeed = function() {
    $scope.posts.resolving = true;

    Feed.get({ limit: 10, offset: $scope.posts.offset, user_id: $scope.profile.id }, function(data) {
      //console.log(data);
      $scope.posts.data = data.feed;
      $scope.posts.count = data.count;
      $scope.posts.resolving = false;
      $scope.posts.offset = $scope.posts.offset + data.feed.length;
      $scope.posts.first_load = true;
    });
  };
  $scope.loadMorePosts = function() {
    $scope.posts.resolving = true;

    Feed.get({ limit: 10, offset: $scope.posts.offset, user_id: $scope.profile.id }, function(data) {
      //console.log(data);
      if(data.feed.length > 0) {
        $scope.posts.data = $scope.posts.data.concat(data.feed);
        $scope.posts.offset = $scope.posts.offset + data.feed.length;
      } else {
        $scope.posts.more_to_load = false;
      }
      $scope.posts.resolving = false;
    });
  }
  $scope.loadUserComments = function() {
    $http.get(layer_path + "users/" + $routeParams.id +"/comments")
      .then(function(response) {
        for(var i in response.data.activity) {
          var to_edit = $('<div>' + response.data.activity[i].content + '</div>');
          to_edit.find('a.user-mention').each(function(index) {
            var text = $(this).html();
            $(this).replaceWith(text);
          });
          response.data.activity[i].content = to_edit.html();
        }

        $scope.comments = response.data;
      }, function(response) {});
  }

  User.get({user_id: $routeParams.id}, function success(data) {
    if($scope.can('debug')) console.log(data);
    $scope.profile = data;
    $scope.startFeed();
    $scope.new_data.username = $scope.profile.username;

    var fbRef = new Firebase(firebase_url);
    var userRef = fbRef.child("users").child(data.id);
    var presenceRef = userRef.child("presence");
    presenceRef.on('value', function(ss) {
      //$scope.$apply(function() {
        if(ss.val() !== null) {
          $scope.status = true;
        } else {
          $scope.status = false;
        }
      //});
    });

    //$scope.profile.status = $firebaseObject(presenceRef);

    $scope.promises.gaming.then(function() {
      $timeout(function() {
        for(var i in data.gaming.badges) {
          for(var j in $scope.misc.gaming.badges) {
            if(data.gaming.badges[i].id === $scope.misc.gaming.badges[j].id) {
              data.gaming.badges[i].name = $scope.misc.gaming.badges[j].name;
              data.gaming.badges[i].type = $scope.misc.gaming.badges[j].type;
              data.gaming.badges[i].slug = $scope.misc.gaming.badges[j].slug;
              break;
            }
          }
        }

        // We calculate remaining swords for next level and ratio
        var rules = $scope.misc.gaming.rules;
        var remaining = rules[data.gaming.level].swords_end - $scope.profile.gaming.swords;
        $scope.profile.gaming.remaining = Math.max(1, remaining);
        //$scope.profile.gaming.swords = Math.max(0, $scope.profile.gaming.swords);
        var ratio = 100 - 100 * (remaining / (rules[data.gaming.level].swords_end - rules[data.gaming.level].swords_start));
        $scope.profile.gaming.ratio = ratio;
      }, 100);
    });

    //console.log(rules[data.gaming.level].swords_start, rules[data.gaming.level].swords_end, ratio);
    $scope.loadUserComments();
  }, function(error) {
    window.location = '/';
  });
}]);

UserModule.directive('sgEditDesc', function() {
  return {
    restrict: 'EA',
    scope: false,
    link: function(scope, element, attrs) {
      element.bind("keydown keypress", function(event) {
        if(event.which === 13) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEditDesc, {'event': event});
          });
          event.preventDefault();
        } else if(event.which === 27) {
          // Cancel edit
          scope.$apply(function(){
            scope.$eval(attrs.sgCancel, {'event': event});
          });
          event.preventDefault();
        }
      });
    }
  };
});

UserModule.controller('UserValidationController', ['$scope', '$http', '$routeParams',
  function($scope, $http, $routeParams) {

    $scope.validation_in_progress = true;
    $scope.validated = false;

    $http.get(layer_path + "user/confirm/" + $routeParams.code).
      then(function() {
        $scope.validation_in_progress = false;
        $scope.validated = true;
        if($scope.user.isLogged) {
          $scope.user.info.validated = true;
        }
      }, function() {
        $scope.validation_in_progress = false;
        //Redirect to home if error
        window.location = '/';
      });
  }
]);

UserModule.controller('UserRecoveryController', ['$scope', '$http', '$routeParams',
  function($scope, $http, $routeParams) {

    $scope.validation_in_progress = true;
    $scope.validated = false;

    $scope.password_update = {
      'password': '',
      'password_repeat': '',
      'in_progress': false,
      'show_message': false,
      'which_message': null
    };

    $scope.updatePassword = function() {
      $scope.password_update.in_progress = true;
      $scope.password_update.show_message = false;
      if($scope.password_update.password.length < 8 || $scope.password_update.password.length > 20) {
        $scope.password_update.show_message = true;
        $scope.password_update.which_message = 'length';
        $scope.password_update.in_progress = false;
        return;
      }
      if($scope.password_update.password != $scope.password_update.password_repeat) {
        $scope.password_update.show_message = true;
        $scope.password_update.which_message = 'not_equal';
        $scope.password_update.in_progress = false;
        return;
      }
      $http.put(layer_path + "auth/recovery-token/" + $routeParams.token, {password: $scope.password_update.password}).then(function success(response){
        console.log(response);
        $scope.password_update.show_message = true;
        $scope.password_update.which_message = 'success';
        $scope.password_update.in_progress = false;
        $scope.password_update.password = '';
        $scope.password_update.password_repeat = '';
      }, function(error){
        $scope.password_update.show_message = true;
        $scope.password_update.which_message = 'error';
        $scope.password_update.in_progress = false;
      });
    };

    $http.get(layer_path + "auth/recovery-token/" + $routeParams.token).
      then(function(response) {
        //console.log(response);
        if(!response.data.valid) {
          //Redirect to home if error
          window.location = '/';
        }

        $scope.validation_in_progress = false;
        $scope.validated = true;
        if($scope.user.isLogged) {
          $scope.user.info.validated = true;
        }
      }, function() {
        $scope.validation_in_progress = false;
        //Redirect to home if error
        window.location = '/';
      });
  }
]);

var RankModule = angular.module('rankModule', []);

// Rank module controllers
RankModule.controller('RanksController', [function() {

}]);

var BadgeModule = angular.module('sg.module.badges', []);

// Badge module controllers
BadgeModule.controller('BadgeController', ['$scope', '$timeout', '$http', function($scope, $timeout, $http) {

  $scope.buy_badge = function(badge) {
    $http.post(layer_path + "badges/buy/" + badge.id)
      .then(function success(response){
        badge.owned = true;

        for(var i in $scope.misc.gaming.badges) {
          if($scope.misc.gaming.badges[i].required_badge) {
            if($scope.misc.gaming.badges[i].required_badge.id === badge.id) {
              $scope.misc.gaming.badges[i].badge_needed = false;
            }
          }
        }
      }, function(error){
        console.log("Can't buy me loOove! ... talk to AcidRod");
      });
  }

}]);

var TopModule = angular.module('sg.module.top', []);


// Rank module controllers
TopModule.controller('TopController', ['$scope', '$http', function($scope, $http) {
  $scope.example = {
    username: 'AcidKid',
    image: 'http://s3-us-west-1.amazonaws.com/spartan-board/users/55dce3c893e89a20eb000001-120x120.jpg',
    id: '54e238652397381217000001',
    position: 2
  }
  $scope.order_by = 'swords';
  $scope.options = ['swords', 'badges', 'wealth'];
  $scope.data = [];

  $scope.change_order = function(order) {

    if($scope.options.indexOf(order) < 0) {
      $scope.order_by = 'swords';
    } else {
      $scope.order_by = order;
    }

    $http.get(layer_path + 'stats/ranking', {params: {sort: $scope.order_by}}).
      then(function(response){
        $scope.data = response.data;
        //console.log($scope.data )
      });
  }

  $scope.change_order();

}]);

var ChatController = [
  '$scope',
  '$firebaseArray',
  '$firebaseObject',
  '$timeout',
  '$location',
  '$route',
  '$routeParams',
  function($scope, $firebaseArray, $firebaseObject, $timeout, $location, $route, $routeParams) {

    $scope.people = [];

    $scope.emojiMessage = {};

    var firebaseRef = new Firebase(firebase_url);

    // Instantiate a new connection to Firebase.
    $scope._firebase = firebaseRef;

    // A unique id generated for each session.
    $scope._sessionId = null;

    // A mapping of event IDs to an array of callbacks.
    $scope._events = {};

    // A mapping of room IDs to a boolean indicating presence.
    $scope._rooms = {};

    // A mapping of operations to re-queue on disconnect.
    $scope._presenceBits = {};

    // Commonly-used Firebase references.
    $scope._userRef        = null;
    $scope._statusRef      = null;
    $scope._messageRef     = $scope._firebase.child('messages');
    $scope._channelRef     = $scope._firebase.child('channels');
    //$scope._privateRoomRef = $scope._firebase.child('room-private-metadata');
    //$scope._moderatorsRef  = $scope._firebase.child('moderators');
    $scope._suspensionsRef = $scope._firebase.child('suspensions');
    //$scope._usersOnlineRef = $scope._firebase.child('user-names-online');

    // Setup and establish default options.
    $scope._options = {};

    // The number of historical messages to load per room.
    $scope._options.numMaxMessages = $scope._options.numMaxMessages || 50;
    $scope._options.messagesLength = $scope._options.messagesLength || 200;

    $scope.channels = [];
    $scope.channel = {
      selected: null
    };
    $scope.messages = [];
    $scope.old_messages = [];
    $scope.message = {
      content: '',
      send_on_enter: true,
      previous: 'Acid Rulz!'
    };
    $scope.show_details = false;

    $scope.members = [];
    $scope.searchText = {
      content: ''
    };

    $scope.helpers = {
      writing: false,
      writing_timeout: null,
      spam_count: 0,
      validated: false,
      loaded: false,
      blocked: false
    };

    $scope.getMentionable = function() {
      var new_people = [];

      angular.forEach($scope.members, function(member) {
        new_people.push({'label': member.username});
      })
      $scope.people = new_people;
    }

    $scope.goToBottom = function() {
      var mh_window = $('.message-history');
      if(mh_window[0]) {
        mh_window.scrollTop(mh_window[0].scrollHeight);
      }
      $scope.old_messages = [];
      $scope.scroll_help.scrolledUp = false;
    }

    $scope.changeChannel = function(channel) {
      if($scope.channel.selected == channel) return;

      if($scope.channel.selected != null) {
        $scope.exitChannel();
      }
      $scope.channel.selected = channel;
      $location.path('/chat/' + channel.slug);

      var messagesRef = $scope._messageRef.child(channel.$id).orderByChild('created_at').limitToLast(50);

      if($scope.channel.selected.fullscreen) {
        $scope.channel.selected.new_yt_code = $scope.channel.selected.fullscreen.video;
      } else {
        $scope.channel.selected.new_yt_code = "";
      }
      $scope.messages = $firebaseArray( messagesRef );

      // When messages are loaded on UI and also when a new message arrives
      $scope.messages.$loaded().then(function(x) {
        $timeout(function() {
          var mh_window = $('.message-history');
          if(mh_window[0]) {
            mh_window.scrollTop(mh_window[0].scrollHeight);
          }
        }, 200);

        x.$watch(function(event) {
          if(event.event === "child_added") {
            if(!$scope.scroll_help.scrolledUp) {
              $timeout(function() {
                var mh_window = $('.message-history');
                if(mh_window[0]) {
                  mh_window.scrollTop(mh_window[0].scrollHeight);
                }
              }, 200);
            }
          }
        });
      });

      messagesRef.on('child_removed', function(dataSnapshot) {
        if($scope.scroll_help.scrolledUp) {
          $scope.old_messages = $scope.old_messages.concat( dataSnapshot.val() );
        } else {
          $scope.old_messages = [];
        }
      });

      var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
      $scope.members = $firebaseArray(membersRef);

      membersRef.on('value', function(snapshot) {
        var new_people = [];
        snapshot.forEach(function(childSnapshot) {
          new_people.push({'label': childSnapshot.val().username});
        });
        $scope.people = new_people;
      });

      // Some status validation if user is logged in
      if($scope.user.isLogged) {
        $scope.promises.self.then(function() {
          var amOnline = new Firebase(firebase_url + '.info/connected');
          $scope._statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

          amOnline.on('value', function(snapshot) {
            if(snapshot.val()) {
              var image = $scope.user.info.image || "";
              $scope._statusRef.onDisconnect().remove();
              $scope._statusRef.on('value', function(ss) {
                if( ss.val() == null ) {
                  // another window went offline, so mark me still online
                  $scope._statusRef.set({
                    id: $scope.user.info.id,
                    username: $scope.user.info.username,
                    image: image,
                    writing: false
                  });
                }
              });
            }
          });
        });
      }
    };

    $scope.exitChannel = function() {
      if($scope.channel.selected) {
        channel = $scope.channel.selected;
        if($scope.user.isLogged) {
          if($scope._statusRef) {
            $scope._statusRef.off();
            $scope._statusRef.set(null);
          }
        }
      }
    };

    $scope.updateChannelMeta = function(){
      if($scope.channel.selected.new_yt_code == "") {
        $scope.channel.selected.fullscreen = null;
      } else {
        if(!$scope.channel.selected.fullscreen) {
          $scope.channel.selected.fullscreen = {
            video: null
          };
        }
        $scope.channel.selected.fullscreen.video = $scope.channel.selected.new_yt_code;
      }
      $scope.channels.$save($scope.channel.selected);
    }

    $scope.addMessage = function() {
      if($scope.message.content && ($scope.message.content.length <= $scope._options.messagesLength && $scope.message.content.length > 0)) {
        // If message is contained in previous message, or viceversa, or they're the same...
        if($scope.message.content === $scope.message.previous || ($scope.message.previous.indexOf($scope.message.content) > -1) || ($scope.message.content.indexOf($scope.message.previous) > -1)) {

          $scope.helpers.spam_count++;
        } else {
          if($scope.helpers.spam_count > 0) {
            $scope.helpers.spam_count--;
          }
        }

        if($scope.helpers.spam_count > 2) {
          $('.input-box_text').blur();
          if($scope._userRef) {
            $scope._userRef.child('chat/blocked').set(true);
          }
          $scope.helpers.spam_count = 0;
          $scope.message.content = '';
        } else {
          $scope.message.previous = $scope.message.content;

          if($scope.message.content !== '') {
            var image = $scope.user.info.image || "";
            var new_message = {
              author: {
                id: $scope.user.info.id,
                username: $scope.user.info.username,
                image: image
              },
              content: $scope.message.content,
              created_at: Firebase.ServerValue.TIMESTAMP
            };
            if($scope.message.highlight) {
              new_message.highlight = true;
            }
            //console.log(new_message);
            $scope.messages.$add(new_message).then(function(ref) {
              $scope.message.content = '';
              $scope.emojiMessage = {};
            });
          }
        }
      }
    }

    $scope.addMessageNew = function($event) {
      if($event.which === 13 && $scope.message.send_on_enter) {
        $timeout(function(){
          $scope.addMessage();
          $timeout.cancel($scope.helpers.writing_timeout);
          $scope._statusRef.child('writing').set(false);
          $scope.helpers.writing = false;
          $event.preventDefault();
        }, 0);
      } else {
        if(!$scope.helpers.writing) {
          $scope._statusRef.child('writing').set(true);
          $scope.helpers.writing = true;
        }
        if($scope.helpers.writing_timeout) $timeout.cancel($scope.helpers.writing_timeout);
        $scope.helpers.writing_timeout = $timeout(function() {
          $scope._statusRef.child('writing').set(false);
          $scope.helpers.writing = false;
        }, 1000); // delay in ms
      }
    }

    $scope.removeMessage = function(message) {
      $scope.messages.$remove(message).then(function(ref) {
        console.log(ref.key() === message.$id); // true
      });
    }

    $scope.toggle_details = function() {
      $scope.show_details = !$scope.show_details;
    }

    $scope.suspendUser = function(userId, timeLengthSeconds) {
      //var suspendedUntil = new Date().getTime() + 1000*timeLengthSeconds;

      $scope._suspensionsRef.child(userId).set(true, function(error) {
        if (error) {
          console.log("error in user ban")
        } else {
          console.log("user was banned")
        }
      });
    };

    $scope.channels = $firebaseArray($scope._channelRef);
    $scope.channels.$loaded().then(function() {
      if($routeParams.slug != undefined) {
        var found = false;
        for(i in $scope.channels) {
          if($scope.channels[i].slug == $routeParams.slug) {
            $scope.changeChannel($scope.channels[i]);
            found = true;
            break;
          }
        }
        if(!found) {
          $scope.changeChannel($scope.channels[0]);
        }
      } else {
        $scope.changeChannel($scope.channels[0]);
      }
    });

    $scope.checkValidation = function() {
      if($scope.user.isLogged) {
        $scope.promises.self.then(function(){

          $scope._userRef = $scope._firebase.child("users").child($scope.user.info.id);

          $scope._userRef.child('validated').once('value', function(ss) {
            if(ss.val() == true) {
              $scope.helpers.validated = true;
            }
          });

          $scope._userRef.child('chat/blocked').on('value', function(ss) {
            if(ss.val() == true) {
              $scope.helpers.blocked = true;
              $timeout(function(){
                $scope._userRef.child('chat/blocked').set(null);
                $scope.helpers.blocked = false;
              }, 60000);
            }
          });

        });
      }
    };
    $scope.checkValidation();

    $scope.$on("userLogged", function() {
      $scope.checkValidation();
    });

    $scope.$on("$destroy", function() {
      if($scope.can('debug')) console.log("Closing chat");
      $scope.exitChannel();
    });

    // Scrolling responses
    $scope.scroll_help = {
      lastScrollTop: 0,
      from_top: 0,
      max_height: 0,
      last_height: 0,
      scrolledUp: false
    }

    jQuery('.message-history').scroll(function() {
      $scope.scroll_help.from_top = $(this).scrollTop();
      $scope.scroll_help.max_height = $(this)[0].scrollHeight - $(this).height();

      // If scrolling further than possible... (happens because of some OS effects)
      if($scope.scroll_help.from_top > $scope.scroll_help.max_height) {
        $scope.scroll_help.from_top = $scope.scroll_help.max_height; // we "saturate" from_top distance
      }

      if ($scope.scroll_help.from_top >= $scope.scroll_help.lastScrollTop) {
        // downscroll code
        //if($scope.can('debug')) console.log("Scrolling downward");
        if($scope.scroll_help.from_top == $scope.scroll_help.max_height) {
          $scope.scroll_help.scrolledUp = false;
          $scope.old_messages = [];
        }
      } else {
        //if($scope.can('debug')) console.log("Scrolling upward");
        if($scope.scroll_help.last_height <= $scope.scroll_help.max_height) {
          // upscroll code
          $scope.scroll_help.scrolledUp = true;
        }
      }
      $scope.scroll_help.lastScrollTop = $scope.scroll_help.from_top;
      $scope.scroll_help.last_height = $scope.scroll_help.max_height;
    });

    // Hack, so we don't have to reload the controller if the route uses the same controller
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
      if(lastRoute.$$route.controller === $route.current.$$route.controller) {
        // Will not load only if my view use the same controller
        // We recover new params
        new_params = $route.current.params;
        $route.current = lastRoute;
        $route.current.params = new_params;
      }
    });
  }
];

var chatModule = angular.module('chatModule', ['firebase', 'ngSanitize']);

chatModule.controller('ChatController', ChatController);

chatModule.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      //console.log(scope.message.send_on_enter);
      element.bind("keydown keypress", function(event) {
        if(event.which === 13 && scope.message.send_on_enter) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          event.preventDefault();
        }
      });
    }
  };
});

chatModule.directive('youtube', function($sce) {
  return {
    restrict: 'EA',
    scope: {
      code: '='
    },
    replace: true,
    template: '<div class="yt-video"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
      scope.$watch('code', function (newVal) {
        if (newVal) {
          scope.url = $sce.trustAsResourceUrl("https://www.youtube.com/embed/" + newVal);
        }
      });
    }
  };
});

chatModule.directive('showImages', [function() {
  var urlPattern = /(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
  /*var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|gif)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "gi");
  var to_replace = "<div class=\"img-preview\"><div class=\"url-text\">$1 <i class=\"fa fa-chevron-down\"></i><i class=\"fa fa-chevron-up\"></i></div><a href=\"$1\" target=\"_blank\" ng-show=\"show_image\"><img src=\"$1\"></a></div>";*/

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, function (s) {
      return entityMap[s];
    });
  }

  var emojis = [
    "bowtie", "smile", "laughing", "blush", "smiley", "relaxed",
    "smirk", "heart_eyes", "kissing_heart", "kissing_closed_eyes", "flushed",
    "relieved", "satisfied", "grin", "wink", "stuck_out_tongue_winking_eye",
    "stuck_out_tongue_closed_eyes", "grinning", "kissing",
    "kissing_smiling_eyes", "stuck_out_tongue", "sleeping", "worried",
    "frowning", "anguished", "open_mouth", "grimacing", "confused", "hushed",
    "expressionless", "unamused", "sweat_smile", "sweat",
    "disappointed_relieved", "weary", "pensive", "disappointed", "confounded",
    "fearful", "cold_sweat", "persevere", "cry", "sob", "joy", "astonished",
    "scream", "neckbeard", "tired_face", "angry", "rage", "triumph", "sleepy",
    "yum", "mask", "sunglasses", "dizzy_face", "imp", "smiling_imp",
    "neutral_face", "no_mouth", "innocent", "alien", "yellow_heart",
    "blue_heart", "purple_heart", "heart", "green_heart", "broken_heart",
    "heartbeat", "heartpulse", "two_hearts", "revolving_hearts", "cupid",
    "sparkling_heart", "sparkles", "star", "star2", "dizzy", "boom",
    "collision", "anger", "exclamation", "question", "grey_exclamation",
    "grey_question", "zzz", "dash", "sweat_drops", "notes", "musical_note",
    "fire", "hankey", "poop", "shit", "\\+1", "thumbsup", "-1", "thumbsdown",
    "ok_hand", "punch", "facepunch", "fist", "v", "wave", "hand", "raised_hand",
    "open_hands", "point_up", "point_down", "point_left", "point_right",
    "raised_hands", "pray", "point_up_2", "clap", "muscle", "metal", "fu",
    "walking", "runner", "running", "couple", "family", "two_men_holding_hands",
    "two_women_holding_hands", "dancer", "dancers", "ok_woman", "no_good",
    "information_desk_person", "raising_hand", "bride_with_veil",
    "person_with_pouting_face", "person_frowning", "bow", "couplekiss",
    "couple_with_heart", "massage", "haircut", "nail_care", "boy", "girl",
    "woman", "man", "baby", "older_woman", "older_man",
    "person_with_blond_hair", "man_with_gua_pi_mao", "man_with_turban",
    "construction_worker", "cop", "angel", "princess", "smiley_cat",
    "smile_cat", "heart_eyes_cat", "kissing_cat", "smirk_cat", "scream_cat",
    "crying_cat_face", "joy_cat", "pouting_cat", "japanese_ogre",
    "japanese_goblin", "see_no_evil", "hear_no_evil", "speak_no_evil",
    "guardsman", "skull", "feet", "lips", "kiss", "droplet", "ear", "eyes",
    "nose", "tongue", "love_letter", "bust_in_silhouette",
    "busts_in_silhouette", "speech_balloon", "thought_balloon", "feelsgood",
    "finnadie", "goberserk", "godmode", "hurtrealbad", "rage1", "rage2",
    "rage3", "rage4", "suspect", "trollface", "sunny", "umbrella", "cloud",
    "snowflake", "snowman", "zap", "cyclone", "foggy", "ocean", "cat", "dog",
    "mouse", "hamster", "rabbit", "wolf", "frog", "tiger", "koala", "bear",
    "pig", "pig_nose", "cow", "boar", "monkey_face", "monkey", "horse",
    "racehorse", "camel", "sheep", "elephant", "panda_face", "snake", "bird",
    "baby_chick", "hatched_chick", "hatching_chick", "chicken", "penguin",
    "turtle", "bug", "honeybee", "ant", "beetle", "snail", "octopus",
    "tropical_fish", "fish", "whale", "whale2", "dolphin", "cow2", "ram", "rat",
    "water_buffalo", "tiger2", "rabbit2", "dragon", "goat", "rooster", "dog2",
    "pig2", "mouse2", "ox", "dragon_face", "blowfish", "crocodile",
    "dromedary_camel", "leopard", "cat2", "poodle", "paw_prints", "bouquet",
    "cherry_blossom", "tulip", "four_leaf_clover", "rose", "sunflower",
    "hibiscus", "maple_leaf", "leaves", "fallen_leaf", "herb", "mushroom",
    "cactus", "palm_tree", "evergreen_tree", "deciduous_tree", "chestnut",
    "seedling", "blossom", "ear_of_rice", "shell", "globe_with_meridians",
    "sun_with_face", "full_moon_with_face", "new_moon_with_face", "new_moon",
    "waxing_crescent_moon", "first_quarter_moon", "waxing_gibbous_moon",
    "full_moon", "waning_gibbous_moon", "last_quarter_moon",
    "waning_crescent_moon", "last_quarter_moon_with_face",
    "first_quarter_moon_with_face", "moon", "earth_africa", "earth_americas",
    "earth_asia", "volcano", "milky_way", "partly_sunny", "octocat", "squirrel",
    "bamboo", "gift_heart", "dolls", "school_satchel", "mortar_board", "flags",
    "fireworks", "sparkler", "wind_chime", "rice_scene", "jack_o_lantern",
    "ghost", "santa", "christmas_tree", "gift", "bell", "no_bell",
    "tanabata_tree", "tada", "confetti_ball", "balloon", "crystal_ball", "cd",
    "dvd", "floppy_disk", "camera", "video_camera", "movie_camera", "computer",
    "tv", "iphone", "phone", "telephone", "telephone_receiver", "pager", "fax",
    "minidisc", "vhs", "sound", "speaker", "mute", "loudspeaker", "mega",
    "hourglass", "hourglass_flowing_sand", "alarm_clock", "watch", "radio",
    "satellite", "loop", "mag", "mag_right", "unlock", "lock",
    "lock_with_ink_pen", "closed_lock_with_key", "key", "bulb", "flashlight",
    "high_brightness", "low_brightness", "electric_plug", "battery", "calling",
    "email", "mailbox", "postbox", "bath", "bathtub", "shower", "toilet",
    "wrench", "nut_and_bolt", "hammer", "seat", "moneybag", "yen", "dollar",
    "pound", "euro", "credit_card", "money_with_wings", "e-mail", "inbox_tray",
    "outbox_tray", "envelope", "incoming_envelope", "postal_horn",
    "mailbox_closed", "mailbox_with_mail", "mailbox_with_no_mail", "door",
    "smoking", "bomb", "gun", "hocho", "pill", "syringe", "page_facing_up",
    "page_with_curl", "bookmark_tabs", "bar_chart", "chart_with_upwards_trend",
    "chart_with_downwards_trend", "scroll", "clipboard", "calendar", "date",
    "card_index", "file_folder", "open_file_folder", "scissors", "pushpin",
    "paperclip", "black_nib", "pencil2", "straight_ruler", "triangular_ruler",
    "closed_book", "green_book", "blue_book", "orange_book", "notebook",
    "notebook_with_decorative_cover", "ledger", "books", "bookmark",
    "name_badge", "microscope", "telescope", "newspaper", "football",
    "basketball", "soccer", "baseball", "tennis", "8ball", "rugby_football",
    "bowling", "golf", "mountain_bicyclist", "bicyclist", "horse_racing",
    "snowboarder", "swimmer", "surfer", "ski", "spades", "hearts", "clubs",
    "diamonds", "gem", "ring", "trophy", "musical_score", "musical_keyboard",
    "violin", "space_invader", "video_game", "black_joker",
    "flower_playing_cards", "game_die", "dart", "mahjong", "clapper", "memo",
    "pencil", "book", "art", "microphone", "headphones", "trumpet", "saxophone",
    "guitar", "shoe", "sandal", "high_heel", "lipstick", "boot", "shirt",
    "tshirt", "necktie", "womans_clothes", "dress", "running_shirt_with_sash",
    "jeans", "kimono", "bikini", "ribbon", "tophat", "crown", "womans_hat",
    "mans_shoe", "closed_umbrella", "briefcase", "handbag", "pouch", "purse",
    "eyeglasses", "fishing_pole_and_fish", "coffee", "tea", "sake",
    "baby_bottle", "beer", "beers", "cocktail", "tropical_drink", "wine_glass",
    "fork_and_knife", "pizza", "hamburger", "fries", "poultry_leg",
    "meat_on_bone", "spaghetti", "curry", "fried_shrimp", "bento", "sushi",
    "fish_cake", "rice_ball", "rice_cracker", "rice", "ramen", "stew", "oden",
    "dango", "egg", "bread", "doughnut", "custard", "icecream", "ice_cream",
    "shaved_ice", "birthday", "cake", "cookie", "chocolate_bar", "candy",
    "lollipop", "honey_pot", "apple", "green_apple", "tangerine", "lemon",
    "cherries", "grapes", "watermelon", "strawberry", "peach", "melon",
    "banana", "pear", "pineapple", "sweet_potato", "eggplant", "tomato", "corn",
    "house", "house_with_garden", "school", "office", "post_office", "hospital",
    "bank", "convenience_store", "love_hotel", "hotel", "wedding", "church",
    "department_store", "european_post_office", "city_sunrise", "city_sunset",
    "japanese_castle", "european_castle", "tent", "factory", "tokyo_tower",
    "japan", "mount_fuji", "sunrise_over_mountains", "sunrise", "stars",
    "statue_of_liberty", "bridge_at_night", "carousel_horse", "rainbow",
    "ferris_wheel", "fountain", "roller_coaster", "ship", "speedboat", "boat",
    "sailboat", "rowboat", "anchor", "rocket", "airplane", "helicopter",
    "steam_locomotive", "tram", "mountain_railway", "bike", "aerial_tramway",
    "suspension_railway", "mountain_cableway", "tractor", "blue_car",
    "oncoming_automobile", "car", "red_car", "taxi", "oncoming_taxi",
    "articulated_lorry", "bus", "oncoming_bus", "rotating_light", "police_car",
    "oncoming_police_car", "fire_engine", "ambulance", "minibus", "truck",
    "train", "station", "train2", "bullettrain_front", "bullettrain_side",
    "light_rail", "monorail", "railway_car", "trolleybus", "ticket", "fuelpump",
    "vertical_traffic_light", "traffic_light", "warning", "construction",
    "beginner", "atm", "slot_machine", "busstop", "barber", "hotsprings",
    "checkered_flag", "crossed_flags", "izakaya_lantern", "moyai",
    "circus_tent", "performing_arts", "round_pushpin",
    "triangular_flag_on_post", "jp", "kr", "cn", "us", "fr", "es", "it", "ru",
    "gb", "uk", "de", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "keycap_ten", "1234", "zero", "hash", "symbols",
    "arrow_backward", "arrow_down", "arrow_forward", "arrow_left",
    "capital_abcd", "abcd", "abc", "arrow_lower_left", "arrow_lower_right",
    "arrow_right", "arrow_up", "arrow_upper_left", "arrow_upper_right",
    "arrow_double_down", "arrow_double_up", "arrow_down_small",
    "arrow_heading_down", "arrow_heading_up", "leftwards_arrow_with_hook",
    "arrow_right_hook", "left_right_arrow", "arrow_up_down", "arrow_up_small",
    "arrows_clockwise", "arrows_counterclockwise", "rewind", "fast_forward",
    "information_source", "ok", "twisted_rightwards_arrows", "repeat",
    "repeat_one", "new", "top", "up", "cool", "free", "ng", "cinema", "koko",
    "signal_strength", "u5272", "u5408", "u55b6", "u6307", "u6708", "u6709",
    "u6e80", "u7121", "u7533", "u7a7a", "u7981", "sa", "restroom", "mens",
    "womens", "baby_symbol", "no_smoking", "parking", "wheelchair", "metro",
    "baggage_claim", "accept", "wc", "potable_water", "put_litter_in_its_place",
    "secret", "congratulations", "m", "passport_control", "left_luggage",
    "customs", "ideograph_advantage", "cl", "sos", "id", "no_entry_sign",
    "underage", "no_mobile_phones", "do_not_litter", "non-potable_water",
    "no_bicycles", "no_pedestrians", "children_crossing", "no_entry",
    "eight_spoked_asterisk", "eight_pointed_black_star", "heart_decoration",
    "vs", "vibration_mode", "mobile_phone_off", "chart", "currency_exchange",
    "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpius",
    "sagittarius", "capricorn", "aquarius", "pisces", "ophiuchus",
    "six_pointed_star", "negative_squared_cross_mark", "a", "b", "ab", "o2",
    "diamond_shape_with_a_dot_inside", "recycle", "end", "on", "soon", "clock1",
    "clock130", "clock10", "clock1030", "clock11", "clock1130", "clock12",
    "clock1230", "clock2", "clock230", "clock3", "clock330", "clock4",
    "clock430", "clock5", "clock530", "clock6", "clock630", "clock7",
    "clock730", "clock8", "clock830", "clock9", "clock930", "heavy_dollar_sign",
    "copyright", "registered", "tm", "x", "heavy_exclamation_mark", "bangbang",
    "interrobang", "o", "heavy_multiplication_x", "heavy_plus_sign",
    "heavy_minus_sign", "heavy_division_sign", "white_flower", "100",
    "heavy_check_mark", "ballot_box_with_check", "radio_button", "link",
    "curly_loop", "wavy_dash", "part_alternation_mark", "trident",
    "black_square", "white_square", "white_check_mark", "black_square_button",
    "white_square_button", "black_circle", "white_circle", "red_circle",
    "large_blue_circle", "large_blue_diamond", "large_orange_diamond",
    "small_blue_diamond", "small_orange_diamond", "small_red_triangle",
    "small_red_triangle_down", "shipit"
  ],
  rEmojis = new RegExp(":(" + emojis.join("|") + "):", "g");

  return {
    restrict: 'A',
    scope: {
      'content' : '@',
      'username' : '@'
    },
    replace: true,
    link: function (scope, element, attrs, controller) {
      var usernamePattern = new RegExp("(\@" + scope.username + ")", "gi");
      var unReplace = "<span class=\"mention\">$1</span>"

      //scope.$watch('content', function (value) {
        var text = escapeHtml(scope.content);
        /*scope.show_image = false;
        var images = text.replace(regex, to_replace);*/
        var new_text = text.replace(urlPattern, '<a target="_blank" href="$&">$&</a>');
        new_text = new_text.replace(rEmojis, function (match, text) {
                return "<i class='emoji emoji_" + text + "' title=':" + text + ":'>" + text + "</i>";
            });
        if(scope.username) {
          new_text = new_text.replace(usernamePattern, unReplace);
        }
        element.html(new_text);
      //});
    }
  };
}]);

'use strict';

angular.module('searchBar', [
  'ngSanitize',
  'algoliasearch'
])
.directive('searchBar', function() {
  return {
    templateUrl: '/js/partials/search.html'
  };
})
.controller('SearchController', ['$scope', '$timeout', '$http', function ($scope, $timeout, $http) {
  $scope.open = false;
  $scope.hits = {
    'posts': [],
    'components': []
  };
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.statistics = {
    'posts': {
      total: 0,
      time: 0
    },
    'components': {
      total: 0,
      time: 0
    }
  };

  $scope.toggle = function() {
    $scope.open = !$scope.open;
    jQuery("#search-layout input").trigger( "focus" );
  }

  $scope.$on('open_search', function(event, data) {
    $scope.toggle();
  });

  $scope.do = function(event) {

    var previous = $scope.query
    if(event.keyCode == 27) {
      //console.log('el query fue' + previous)
      if(previous === '')
        $scope.open = false;
      else
        $scope.query = '';
    }

    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        $http.get(layer_path + 'search/components', {
          params:{
            q: $scope.query,
            offset: 0,
            limit: 12
          }
        }).then(function success(response) {
          console.log("Components", response.data);
          $scope.hits.components = response.data.results;
          $scope.statistics.components.total = response.data.total;
          $scope.statistics.components.time = response.data.elapsed;
        }, function(error) {
          console.log(error);
        });

        $http.get(layer_path + 'search/posts', {
          params:{
            q: $scope.query,
            offset: 0,
            limit: 10
          }
        }).then(function success(response) {
          console.log("Posts", response.data);
          $scope.hits.posts = response.data.results;
          $scope.statistics.posts.total = response.data.total;
          $scope.statistics.posts.time = response.data.elapsed;
        }, function(error) {
          console.log(error);
        });
        /*client.search(queries)
          .then(function searchSuccess(content) {
            //console.log(content);
            $scope.hits.components = content.results[0].hits;
            $scope.statistics.components.total = content.results[0].nbHits;
            $scope.statistics.components.time = content.results[0].processingTimeMS;
            $scope.hits.posts = content.results[1].hits;
            $scope.statistics.posts.total = content.results[1].nbHits;
            $scope.statistics.posts.time = content.results[1].processingTimeMS;
          }, function searchFailure(err) {
            console.log(err);
          });*/
        $scope.fetching = false;
      }, 250); // delay in ms
    }
    else
    {
      $scope.hits.posts = [];
    }
  };

}]);


var ComponentsModule = angular.module("sg.module.components", ["algoliasearch", "ui.bootstrap"]);

ComponentsModule.factory('$localstorage', ['$window', function($window) {
  return {
    set: function(key, value) {
      $window.localStorage[key] = value;
    },
    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    setObject: function(key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function(key) {
      return JSON.parse($window.localStorage[key] || '[]');
    }
  }
}]);

ComponentsModule.factory('cart', ['$localstorage', '$http', 'AclService', function($localstorage, $http, AclService) {

  //var cart_keys = {}
  var cart = {};

  cart.items = $localstorage.getObject('cart');
  cart.isopen = false;

  cart.addItem = function(item, in_store) {
    var id = item.id;
    if(in_store) {
      id = item.product_id;
    }
    //console.log(item);
    if(AclService.can('debug')) console.log("Adding item...");
    $http.post(layer_path + 'store/cart', {
      "id": id,
      //"vendor": "spartangeek"
    }, {
      withCredentials: true
    }).then(function success(response) {
      if(AclService.can('debug')) console.log(response);
      cart.isopen = true;
      var added = false;
      for(var i = 0; i < cart.items.length; i++) {
        if(item._id == cart.items[i]._id) {
          added = true;
          cart.items[i].quantity++;
          cart.persist();
          break;
        }
      }
      if(!added) {
        var new_item = {
          _id: item._id,
          name: item.name,
          full_name: item.full_name,
          slug: item.slug,
          price: item.store.vendors.spartangeek.price,
          quantity: 1,
          image: item.image,
          type: item.type,
          product_id: item.product_id
        };
        cart.items.push(new_item);
        cart.persist();
      }
      //console.log(cart);
    }, function(error) {
      if(AclService.can('debug')) console.log(error);
    })
  };

  cart.removeItem = function(item) {
    $http.delete(layer_path + 'store/cart/' + item.id, {
      withCredentials: true
    }).then(function success(response) {
      for(var i = 0; i < cart.items.length; i++) {
        if(item._id == cart.items[i]._id) {
          if(cart.items[i].quantity > 1) {
            cart.items[i].quantity--;
          } else {
            cart.items.splice(i, 1);
          }
          cart.persist();
          break;
        }
      }
    }, function(error) {
      console.log(error);
    });
  };

  cart.empty = function() {
    cart.items = [];
    cart.persist();
  }

  cart.getIndividualShippingFee = function(item) {
    if(item.category == 'case') {
      return 320;
    } else {
      for(var i = 0; i < cart.items.length; i++) {
        if(cart.items[i].category != 'case') {
          return 60;
        }
      }
      return 139;
    }
  }

  cart.replaceItems = function(new_items) {
    cart.items = new_items;
    cart.persist();
  }

  cart.getShippingFee = function(ship_method) {
    if(cart.items.length > 0) {
      if(ship_method == 'pickup') {
        return 0;
      } else {
        var non_case_count = 0;
        var case_count = 0;
        for(var i = 0; i < cart.items.length; i++) {
          if(cart.items[i].category == 'case') {
            case_count += cart.items[i].quantity;
          } else {
            non_case_count += cart.items[i].quantity;
          }
        }
        if(non_case_count > 0) {
          return 139 + (non_case_count - 1) * 60 + 320 * case_count;
        } else {
          return 320 * case_count;
        }
      }
    } else {
      return 0;
    }
  }

  cart.getCount = function() {
    if(cart.items.length > 0) {
      var total = 0;
      for(var i = 0; i < cart.items.length; i++) {
        total += cart.items[i].quantity;
      }
      return total;
    } else {
      return 0;
    }
  }

  cart.hasMassdrop = function() {
    if(cart.items.length > 0) {
      for(var i = 0; i < cart.items.length; i++) {
        if(cart.items[i].attrs && cart.items[i].attrs.massdrop) {
          return true;
        }
      }
      return false;
    } else {
      return false;
    }
  }

  cart.getTotal = function() {
    if(cart.items.length > 0) {
      var total = 0;
      for(var i = 0; i < cart.items.length; i++) {
        total += cart.items[i].quantity * cart.items[i].price;
      }
      return total;
    } else {
      return 0;
    }
  }

  cart.persist = function() {
    // Use local storage to persist data
    $localstorage.setObject('cart', cart.items);
  };

  return cart;
}]);

ComponentsModule.controller('ComponentsController', ['$scope', '$timeout', '$http', '$route', '$location', '$routeParams', function($scope, $timeout, $http, $route, $location, $routeParams) {

  $scope.onlyStore = false;
  if($scope.location.path().indexOf('tienda') > -1) {
    $scope.onlyStore = true;
  }

  $scope.results = [];
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.totalItems = 10;
  $scope.currentPage = 1;
  $scope.itemsPerPage = 36;

  $scope.facets = {};

  $scope.type_labels = {
    'cpu': 'Procesadores',
    'motherboard': 'Tarjetas Madre',
    'case': 'Gabinetes',
    'video-card': 'Tarjetas de Video',
    'storage': 'Almacenamiento',
    'memory': 'Memorias RAM',
    'cpu-cooler': 'Enfriamiento para CPU',
    'monitor': 'Monitores',
    'power-supply': 'Fuentes de Poder',
    'mouse': 'Mouse',
    'keyboard': 'Teclados',
    'headphones': 'Audífonos/Headsets'
  }

  $scope.current_facet = '';
  if($routeParams.type) {
    $scope.current_facet = $routeParams.type;
  }

  var searchObject = $location.search();
  if(searchObject.search) {
    $scope.query = searchObject.search;
  }

  $scope.change_facet = function(new_facet) {
    //console.log(new_facet);
    $scope.current_facet = new_facet;
    $scope.currentPage = 1;
    $scope.changePage();

    // Change path
    var new_path = '/componentes/';
    if($scope.onlyStore) {
      new_path += 'tienda/'
    }
    new_path += new_facet;
    $location.path(new_path);
    dataLayer.push({
      'event': 'VirtualPageview',
      'virtualPageURL': new_path,
    });
    //console.log('Track', new_path);
  }

  $scope.getPayload = function() {
    var payload = {
      offset: ($scope.currentPage-1)*$scope.itemsPerPage,
      limit: $scope.itemsPerPage
    };
    // Add query to payload
    if($scope.query != '') {
      payload.q = $scope.query;
    }
    // Add the type if applies
    if($scope.onlyStore) {
      payload.type = 'component';
    }
    // Add the facet filter
    if($scope.current_facet != '') {
      payload.category = $scope.current_facet;
    }
    return payload;
  };

  $scope.getPromise = function() {
    if($scope.onlyStore) {
      return $http.get(layer_path + 'search/products', {
        params: $scope.getPayload()
      });
    } else {
      return $http.get(layer_path + 'search/components', {
        params: $scope.getPayload()
      });
    }
  }

  $scope.reset = function() {
    if($scope.can('debug')) console.log("Reset running...");
    $scope.getPromise()
    .then(function(response) {
      //console.log(response);
      $scope.results = response.data.results;
      $scope.totalItems = response.data.total;
      $scope.facets = response.data.facets;
    }, function(error) {console.log(error);});
  }

  $scope.changePage = function() {
    $scope.getPromise()
    .then(function(response) {
      //console.log(response);
      $scope.results = response.data.results;
      $scope.totalItems = response.data.total;
      $scope.facets = response.data.facets;
    }, function(error) {console.log(error);});
  };

  $scope.$watch("onlyStore", function(newVal, oldVal) {
    if($scope.onlyStore) {
      $scope.location.path('/componentes/tienda/' + $scope.current_facet);
    } else {
      $scope.location.path('/componentes/' + $scope.current_facet);
    }
    dataLayer.push({
      'event': 'VirtualPageview',
      'virtualPageURL': $location.path()
    });
    $scope.changePage();
  });

  $scope.do = function(event) {
    if(event.keyCode == 27) {
      $scope.query = '';
    }
    $location.search('search', $scope.query);
    if($scope.query != '')
    {
      if($scope.loading) $timeout.cancel($scope.loading);

      $scope.fetching = true;
      $scope.loading = $timeout(function() {
        $scope.getPromise()
        .then(function searchSuccess(response) {
          //console.log(response);
          $scope.results = response.data.results;
          $scope.totalItems = response.data.total;
          $scope.facets = response.data.facets;
        }, function (error) {
          console.log(error);
        });
        $scope.fetching = false;
      }, 500); // delay in ms
    }
    else
    {
      $scope.reset();
    }
  };

  // Hack, so we don't have to reload the controller if the route uses the same controller
  var lastRoute = $route.current;
  $scope.$on('$locationChangeSuccess', function(event) {
    if(lastRoute.$$route.controller === $route.current.$$route.controller) {
      // Will not load only if my view use the same controller
      // We recover new params
      new_params = $route.current.params;
      $route.current = lastRoute;
      $route.current.params = new_params;
      if($scope.location.path().indexOf('tienda') > -1) {
        $scope.onlyStore = true;
      } else {
        $scope.onlyStore = false;
      }
    }
  });
}]);

ComponentsModule.controller('ComponentController', ['$scope', '$routeParams', '$http', 'cart', '$timeout', function($scope, $routeParams, $http, cart, $timeout) {

  $scope.component = {};

  $scope.type_labels = {
    'cpu': 'Procesador',
    'motherboard': 'Tarjeta Madre',
    'case': 'Gabinete',
    'video-card': 'Tarjeta de Video',
    'storage': 'Almacenamiento',
    'memory': 'Memoria RAM',
    'cpu-cooler': 'Enfriamiento para CPU',
    'monitor': 'Monitor',
    'power-supply': 'Fuente de Poder'
  };

  // We use this to post to board when question is asked
  $scope.categories_map = {
    'cpu': '55d3e4f868a631006400000b',
    'motherboard': '55d3e56e68a631006000000b',
    'case': '55dc13e03f6ba10067000000',
    'video-card': '55d3e55768a631006400000c',
    'storage': '55dc13ab3f6ba1005d000003',
    'memory': '55d3e58168a631005c000017',
    'cpu-cooler': '55dc13ca3f6ba1005d000004',
    'monitor': '55dc13f93f6ba1005d000005',
    'power-supply': '55dca5893f6ba10067000013'
  };

  $scope.questions = [];

  $scope.question = {
    content: '',
    publishing: false,
    content_error: false,
    show_editor: false
  }

  $scope.post = {
    title: '',
    content: '',
    category: ''
  };

  $scope.add_question = function() {
    $scope.question.publishing = true;

    // Check that the user wrote a question
    $scope.question.content_error = false;
    if($scope.question.content == "") {
      $scope.question.content_error = true;
      $scope.question.publishing = false;
      return;
    }

    // if the user wrote his/her question... just publish it
    $scope.post.title = "Duda sobre " + ($scope.component.full_name || $scope.component.name);
    $scope.post.content = $scope.question.content;
    $scope.post.category = $scope.categories_map[$scope.component.type];

    var post = {
      content: $scope.post.content,
      name: $scope.post.title,
      category: $scope.post.category,
      kind: 'category-post',
      is_question: true,
      pinned: false
    };

    $http.post(layer_path + 'post', post).then(function(response) {
      //console.log(response);
      $scope.new_post = response.data.post;
      // relate post to component
      //POST  /v1/posts/:id/relate/:related_id
      $http.post(layer_path + 'posts/' + response.data.post.id + '/relate/' + $scope.component._id).then(function success() {
        var new_question = {
          slug: $scope.new_post.slug,
          content: $scope.post.content,
          id: $scope.new_post.id
        };
        $scope.questions.push(new_question);

        $scope.question.publishing = false;
        $scope.question.content = '';
        $scope.question.show_editor = false;
      }, function(error){

      });
    }, function(err) {
      console.log(err);
    });
  }
  $scope.popularLabel = function() {
    if($scope.populometro == 0 && $scope.component.stats['component-buy'].total == 0)
      return "Sé el primero en opinar";
    else if($scope.populometro < 40)
      return "No es atractivo";
    else if($scope.populometro < 70)
      return "Poco atractivo";
    else if($scope.populometro < 90)
      return "Atractivo";
    else
      return "Muy atractivo";
  }
  var getCurrentRating = function(){
    if($scope.component.stats['component-buy'].total) {
      var t = $scope.component.stats['component-buy'].maybe * 1 + $scope.component.stats['component-buy'].yes * 2 + $scope.component.stats['component-buy'].wow * 3;
      var tt = $scope.component.stats['component-buy'].total * 2.5;
      if(t > tt) return 100;
      return t*100/tt;
    } else {
      return 0;
    }
  }
  $scope.setWouldBuy = function(value) {
    if(!$scope.user.isLogged) {
      $scope.signIn();
    } else {
      //console.log($scope.component.stats['component-buy']);
      switch($scope.component.votes['component-buy']) {
        case 'no':
            $scope.component.stats['component-buy'].no -= 1;
            break;
        case 'maybe':
            $scope.component.stats['component-buy'].maybe -= 1;
            break;
        case 'yes':
            $scope.component.stats['component-buy'].yes -= 1;
            break;
        case 'wow':
            $scope.component.stats['component-buy'].wow -= 1;
            break;
        default:
          $scope.component.stats['component-buy'].total++;
            break;
      }
      $scope.component.votes['component-buy'] = value;
      $http.post(layer_path + 'user/own/component-buy/' + $scope.component._id, {
        "status": $scope.component.votes['component-buy']
      }).then(function success(response){
        console.log(response.data);
      });
      switch(value) {
        case 'no':
            $scope.component.stats['component-buy'].no += 1;
            break;
        case 'maybe':
            $scope.component.stats['component-buy'].maybe += 1;
            break;
        case 'yes':
            $scope.component.stats['component-buy'].yes += 1;
            break;
        case 'wow':
            $scope.component.stats['component-buy'].wow += 1;
            break;
        default:
            break;
      }
      $scope.populometro = getCurrentRating();
      //console.log($scope.component.stats['component-buy']);
    }
  }

  /* Owning methods */
  $scope.setOwning = function() {
    if(!$scope.user.isLogged) {
      $scope.signIn();
    } else {
      $http.post(layer_path + 'user/own/component/' + $scope.component._id, {
        "status": $scope.component.votes.component
      }).then(function success(response){
        if($scope.component.votes['component-buy'] == null){
          $scope.setWouldBuy('yes');
        }
      }, function(error) {
        $scope.component.votes.component = null;
        console.log("Error", error);
      });
    }
  }

  // Initialize component viewing
  $http.get(layer_path + "component/" + $routeParams.slug).then(function success(response){
    if($scope.can('debug')) console.log(response.data);
    $scope.component = response.data;

    if($scope.component.store && $scope.component.store.vendors.spartangeek.price_before) {
      $scope.component.store.vendors.spartangeek.price_save = 100 - ($scope.component.store.vendors.spartangeek.price * 100 / $scope.component.store.vendors.spartangeek.price_before);
    }

    $scope.populometro = getCurrentRating();
    $http.get(layer_path + "component/" + $scope.component._id + "/posts").then(function success(response){
      //console.log(response.data);
      if(response.data) {
        $scope.questions = response.data;
      }
    }, function(error){});
  }, function error(response){
    if(response.status == 404) {
      window.location.href = "/";
    }
  });
}]);

ComponentsModule.controller('PcBuilderController', ['$scope', function($scope) {
}]);

ComponentsModule.controller('CheckoutController', ['$scope', 'cart', '$http', '$timeout', function($scope, cart, $http, $timeout) {
  $scope.currentStep = "cart";

  // Flags
  $scope.f = {
    verify_cart: false,
    error_messages: {
      totals: false
    },
    trying_to_pay: false,
    ship_method: 'generic',
    rfc: "",
    razon_social: ""
  };

  $scope.payer = {
    name: '',
    surname: ''
  };

  $scope.shipping_form = {
    alias: '',
    name: '',
    phone_number: '',
    address: '',
    zip_code: '',
    state: "Distrito Federal",
    city: '',
    neighborhood: '',
    extra: {
      between_street_1: '',
      between_street_2: '',
      reference: ''
    }
  };

  $scope.current_addresses = {
    count: 0,
    addresses: []
  };

  $scope.selected_address = null;

  $scope.status = ''

  $scope.addresses_loaded = false;

  $scope.pay_method = {
    value: 'withdrawal'
  }

  $scope.current_token_error = '';
  $scope.token_errors = {
    "invalid_expiry_month": "El mes de expiración de tu tarjeta es inválido",
    "invalid_expiry_year": "El año de expiración de tu tarjeta es inválido",
    "invalid_cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "incorrect_number": "El número de tarjeta es inválido"
  };
  $scope.current_charge_error = '';
  $scope.charge_errors = {
    "gateway-incorrect-num": "El número de tarjeta es incorrecto",
    "gateway-invalid-num": "El número de tarjeta es inválido",
    "gateway-invalid-exp-m": "El mes de expiración de tu tarjeta es inválido",
    "gateway-invalid-exp-y": "El año de expiración de tu tarjeta es inválido",
    "gateway-invalid-cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "gateway-expired-card": "La tarjeta que estás usando está expirada.",
    "gateway-incorrect-cvc": "El código de seguridad (CVC) es incorrecto",
    "gateway-incorrect-zip": "No se pudo realizar el cobro a tu tarjeta",
    "gateway-card-declined": "La tarjeta fue declinada por el banco",
    "gateway-stripe-missing": "No se puedo realizar el cobro a tu tarjeta",
    "gateway-processing-err": "Error al procesar tu tarjeta"
  }

  $scope.validateCart = function() {
    $scope.f.verify_cart = true;
    $http.get(layer_path + 'store/cart', {
      withCredentials: true
    }).then(function success(response){
      if($scope.can('debug')) console.log(response);
      /*for(var i = 0; i < response.data.length; i++) {
        response.data[i]._id = response.data[i].id;
      }*/
      cart.replaceItems(response.data);
      //console.log(cart);
      $scope.f.verify_cart = false;
    }, function(error){
      console.log(error);
    });
  };
  $scope.validateCart();

  // After getting Stripe token, we make our API call
  // to try to make the charge
  $scope.createToken = function(status, response) {
    $scope.current_token_error = '';
    $scope.current_charge_error = '';
    if(status == 402) {
      console.log(status, response);
      $scope.current_token_error = response.error.code;
    } else {
      //console.log(response.id);
      $scope.makeOrder(response.id);
    }
  };

  // General purpose order processor
  $scope.makeOrder = function(token) {
    token = (typeof token === 'undefined') ? false : token;

    var meta = {};
    if(token) {
      meta = { token: token }
    }

    if($scope.f.facturar) {
      if($scope.f.rfc == '' || $scope.f.razon_social == '') {
        $scope.f.rfc_error = true;
        return false;
      }
      if($scope.f.rfc != '') {
        meta.rfc = $scope.f.rfc;
      }
      if($scope.f.razon_social != '') {
        meta.razon_social = $scope.f.razon_social;
      }
    }

    var gateways = {
      'withdrawal': 'offline',
      'credit_card': 'stripe'
    }

    $scope.f.error_messages.totals = false;
    $scope.f.trying_to_pay = true;

    var payload = {
      "gateway": gateways[$scope.pay_method.value],
      "meta": meta,
      "ship_method": $scope.f.ship_method,
      "total": cart.getTotal() + cart.getShippingFee($scope.f.ship_method) + $scope.getPaymentFee()
    };
    if($scope.f.ship_method == 'generic') {
      payload.ship_to = $scope.selected_address.id;
    }

    $http.post(layer_path + 'store/checkout', payload, {
      withCredentials: true
    }).then(function success(response) {
      cart.empty();
      $scope.currentStep = "completed";
    }, function(error){
      console.log(error);
      if(error.data.key == "bad-total") {
        $scope.f.error_messages.totals = true;
        $scope.currentStep = "cart";
        $scope.validateCart();
      } else {
        $scope.current_charge_error = error.data.key;
      }
      $scope.f.trying_to_pay = false;
    });
  }

  $scope.getPaymentFee = function() {
    if($scope.pay_method.value == 'withdrawal') {
      return 0;
    } else {
      if($scope.pay_method.value == 'credit_card') {
        return Math.ceil( (cart.getTotal() + cart.getShippingFee($scope.f.ship_method)) * 0.042 + 4 );
      } else {
        return Math.ceil( (cart.getTotal() + cart.getShippingFee($scope.f.ship_method)) * 0.04 + 4 );
      }
    }
  }

  $scope.createAddress = function() {
    $scope.status = ''

    if($scope.shipping_form.name == '' || $scope.shipping_form.phone_number == '' || $scope.shipping_form.address == '' || $scope.shipping_form.zip_code == ''
    || $scope.shipping_form.state == '' || $scope.shipping_form.city == '' || $scope.shipping_form.neighborhood == '' || $scope.shipping_form.alias == '') {
      $scope.status = 'incomplete';
      return;
    }

    var extra = ''
    if($scope.shipping_form.extra.between_street_1 != '' && $scope.shipping_form.extra.between_street_2 != '') {
      extra += 'Entre calle ' + $scope.shipping_form.extra.between_street_1 + ' y calle ' + $scope.shipping_form.extra.between_street_2 + '. ';
    }
    extra += $scope.shipping_form.extra.reference;

    var new_address = {
      name: $scope.shipping_form.alias,
      state: $scope.shipping_form.state,
      city: $scope.shipping_form.city,
      postal_code: $scope.shipping_form.zip_code,
      line1: $scope.shipping_form.address,
      line2: '',
      extra: extra,
      phone: $scope.shipping_form.phone_number,
      neighborhood: $scope.shipping_form.neighborhood,
      recipient: $scope.shipping_form.name
    };

    $http.post(layer_path + 'store/customer/address', new_address).then(function success(response){
      console.log(response);

      $scope.selected_address = $scope.shipping_form;
      $scope.selected_address.id = response.data.address_id;

      $scope.shipping_form = {
        alias: '',
        name: '',
        phone_number: '',
        address: '',
        zip_code: '',
        state: "Distrito Federal",
        city: '',
        neighborhood: '',
        extra: {
          between_street_1: '',
          between_street_2: '',
          reference: ''
        }
      };

      $scope.current_addresses.addresses.push($scope.selected_address);
      $scope.current_addresses.count++;

      $scope.status = 'paying';
      $scope.currentStep = "payment";
      $scope.f.ship_method = 'generic';
    }, function(error) {
      console.log(error);
    });
  };

  $scope.deleteAddress = function(address) {
    var index = $scope.current_addresses.addresses.indexOf(address);

    if(index > -1) {
      $http.delete(layer_path + 'store/customer/address/' + address.id).then(function success(response){
        $scope.current_addresses.addresses.splice(index, 1);
        $scope.current_addresses.count--;
      }, function(error) {
        console.log(error);
      });
    }
  }

  $scope.goToCart = function() {
    $scope.currentStep = "cart";
  }

  $scope.goToShipping = function() {
    if(!$scope.addresses_loaded) {
      $http.get(layer_path + 'store/customer').then(function success(response){
        //console.log(response);
        var addresses = response.data.addresses;
        $scope.current_addresses.addresses = [];

        if(addresses) {
          $scope.current_addresses.count = addresses.length;

          for(var i = 0; i < addresses.length; i++) {
            var a = {
              alias: addresses[i].alias,
              name: addresses[i].recipient,
              id: addresses[i].id,
              phone_number: addresses[i].phone,
              address: addresses[i].address.line1,
              zip_code: addresses[i].address.postal_code,
              state: addresses[i].address.state,
              city: addresses[i].address.city,
              neighborhood: addresses[i].address.line3,
              extra: {
                between_street_1: '',
                between_street_2: '',
                reference: addresses[i].address.extra
              }
            };
            $scope.current_addresses.addresses.push(a);
          }
        }
      }, function(error){
        console.log(error);
      });
      $scope.addresses_loaded = true;
    }
    $scope.currentStep = "address";
  }

  $scope.goToPay = function(address) {
    $scope.selected_address = address;
    $scope.f.ship_method = 'generic';
    $scope.currentStep = "payment";
  }

  $scope.goToPayPickup = function() {
    $scope.f.ship_method = 'pickup';
    $scope.currentStep = "payment";
  }
}]);

ComponentsModule.controller('MassdropIndexController', ['$scope', '$http', function($scope, $http){

  $scope.massdrops = [];/*[
    {
      id: "570aadb31a01370d742284f7",
      product_id: "570aaceb1a01370d742284f5",
      name: "Corsair K30",
      cover: "/images/massdrop/cover-2.jpg",
      cover_small: "/images/massdrop/cover-small-2.jpg",
      deadline: "2016-04-30T23:59:00-05:00",
      price: 680,
      reserve_price: 600,
      active: true,
      checkpoints: [
        {
          step: 1,
          starts: 5,
          price: 720,
          done: true
        },
        {
          step: 2,
          starts: 20,
          price: 680,
          done: true
        },
      ],
      count_reservations: 21,
      count_interested: 30
    },
    {
      id: "570aadb31a01370d742284f7",
      product_id: "570aaceb1a01370d742284f5",
      name: "Corsair Katar",
      cover: "/images/massdrop/cover.jpg",
      cover_small: "/images/massdrop/cover-small.jpg",
      deadline: "2016-04-30T23:59:00-05:00",
      price: 680,
      reserve_price: 600,
      active: true,
      checkpoints: [
        {
          step: 1,
          starts: 5,
          ends: 0,
          price: 650,
          done: false
        },
        {
          step: 2,
          starts: 20,
          ends: 0,
          price: 620,
          done: false
        },
      ],
      count_reservations: 3,
      count_interested: 10
    }
  ];*/

  $scope.calculate = function() {
    for(var i in $scope.massdrops) {
      //console.log(i);
      var massdrop = $scope.massdrops[i];
      //console.log("first", massdrop);
      var max = 0;
      var min_price = massdrop.price;
      for(var j in massdrop.checkpoints) {
        if(massdrop.checkpoints[j].starts > max) {
          max = massdrop.checkpoints[j].starts;
        }
        if(massdrop.checkpoints[j].price < min_price) {
          min_price = massdrop.checkpoints[j].price;
        }
      }
      massdrop.min_price = min_price;
      //console.log("max", max)
      for(var j in massdrop.checkpoints) {
        massdrop.checkpoints[j].from_right = (max - massdrop.checkpoints[j].starts) / max * 100;
      }

      massdrop.reservations_width = massdrop.count_reservations / max * 100;
      if(massdrop.reservations_width > 100) {
        massdrop.reservations_width = 100;
      }
      massdrop.interested_width = massdrop.count_interested / max * 100;
      if(100 - massdrop.reservations_width < massdrop.interested_width) {
        massdrop.interested_width = 100 - massdrop.reservations_width;
      }
      massdrop.interested = (massdrop.current == "interested") || (massdrop.current == "reservation");

      var a = Date.now();
      var b = new Date(massdrop.deadline);
      console.log(b-a, (b-a)/1000, (b-a)/1000/60);
      var difference = Math.round( Math.round((b - a) / 1000) / 60);

      $scope.massdrops[i].counter = {
        days: Math.floor(difference / 60 / 24),
        hours: Math.floor(difference / 60 % 24),
        minutes: difference % 60
      };

      //console.log("last", $scope.massdrops[i]);
    };
  }

  $http.get(layer_path + 'massdrop').then(function success(response){
    console.log(response.data);
    $scope.massdrops = response.data.results;
    $scope.calculate();
  }, function(error) {});

}])

ComponentsModule.controller('MassdropController', ['$scope', '$http', '$timeout', '$uibModal', '$routeParams', function($scope, $http, $timeout, $uibModal, $routeParams) {

  $scope.interested = function() {
    $http.put(layer_path + 'store/product/' + $scope.product_id + '/massdrop').then(function success(response){
      //console.log(response.data);
      $scope.massdrop.interested = response.data.interested;
      if(response.data.interested) {
        $scope.massdrop.count_interested++;
      } else {
        $scope.massdrop.count_interested--;
      }
    }, function(error){
      console.log(error);
    });
  }

  $scope.usersInfo = function() {
    var text = "";
    if($scope.massdrop) {
      for(i in $scope.massdrop.users) {
        user = $scope.massdrop.users[i];
        text += user.username + ", " + user.email + ", " + (user.contact_input || "no conctact info") + "\n---\n";
      }
    }
    return text;
  }

  $scope.interestedDialog = function() {
    var modalInstance = $uibModal.open({
      templateUrl: '/js/partials/massdrop/interested-modal.html',
      controller: 'InterestedController',
      size: 'sm',
      resolve: {
        product_id: function () {
          return $scope.product_id;
        },
        massdrop: function () {
          return $scope.massdrop;
        }
      }
    });

    modalInstance.result.then(function(massdrop) {
      $scope.massdrop = massdrop;
    }, function() {
      //$log.info('Modal dismissed at: ' + new Date());
    });
  };

  // Initialize component viewing
  $http.get(layer_path + "store/product/" + $routeParams.slug).then(function success(response){
    console.log(response.data);
    $scope.product_id = response.data.id;
    $scope.slug = response.data.slug;
    var massdrop = response.data.massdrop;
    var max = timespan = 0;
    for(var i in massdrop.checkpoints) {
      if(massdrop.checkpoints[i].starts > max) {
        max = massdrop.checkpoints[i].starts;
      }
      if(!massdrop.checkpoints[i].done && timespan == 0) {
        timespan = massdrop.checkpoints[i].timespan;
      }
    }
    massdrop.timespan = timespan;
    for(var i in massdrop.checkpoints) {
      massdrop.checkpoints[i].from_right = (max - massdrop.checkpoints[i].starts) / max * 100;
    }

    massdrop.reservations_width = massdrop.count_reservations / max * 100;
    if(massdrop.reservations_width > 100) {
      massdrop.reservations_width = 100;
    }
    massdrop.interested_width = massdrop.count_interested / max * 100;
    if(100 - massdrop.reservations_width < massdrop.interested_width) {
      massdrop.interested_width = 100 - massdrop.reservations_width;
    }
    massdrop.interested = (massdrop.current == "interested") || (massdrop.current == "reservation");
    $scope.massdrop = massdrop;
    //console.log($scope.massdrop);
    $scope.product = response.data.attributes;

    var a = Date.now();
    var b = new Date(massdrop.deadline);
    var difference = Math.round( Math.round((b - a) / 1000) / 60);

    var meses = new Array ("Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre");
    var f = new Date(massdrop.shipping_date);
    massdrop.shipping_date_label = f.getDate() + " de " + meses[f.getMonth()] + " de " + f.getFullYear();

    $scope.counter = {
      days: Math.floor(difference / 60 / 24),
      hours: Math.floor(difference / 60 % 24),
      minutes: difference % 60
    };

    if ($scope.counter.hours < 1 && $scope.counter.minutes < 1) {
      massdrop.active = false;
    }

    $scope.countdown = function() {
      stopped = $timeout(function() {
        console.log($scope.counter);
        if($scope.counter.minutes == 0) {
          if($scope.counter.hours > 0){
            $scope.counter.hours--;
            $scope.counter.minutes = 59;
          }
        } else {
          $scope.counter.minutes--;
        }
        $scope.countdown();
      }, 60*1000);
    };
    $scope.countdown();

    $('.btn-twitter').click(function(event) {
      var width  = 575,
          height = 280,
          left   = ($(window).width()  - width)  / 2,
          top    = ($(window).height() - height) / 2,
          url    = this.href,
          opts   = 'status=1' +
                   ',width='  + width  +
                   ',height=' + height +
                   ',top='    + top    +
                   ',left='   + left;
      window.open(url, 'twitter', opts);
      return false;
    });

    $scope.share_fb = function() {
      url = 'https://spartangeek.com/compra-en-legion/' + $scope.product.slug + '?ref="spartangeek.com"';
      window.open('https://www.facebook.com/sharer/sharer.php?u='+url,'facebook-share-dialog',"width=626,height=436")
    }
  }, function(error){});
}]);

ComponentsModule.controller('MassdropPayController', ['$scope', '$http', '$routeParams', function($scope, $http, $routeParams) {
  // Flags
  $scope.f = {
    verify_cart: false,
    error_messages: {
      totals: false
    },
    trying_to_pay: false,
    understand: false,
    quantity: 1
  };

  $scope.payer = {
    name: '',
    surname: ''
  };

  $scope.pay_method = {
    value: 'withdrawal'
  }

  $scope.current_token_error = '';
  $scope.token_errors = {
    "invalid_expiry_month": "El mes de expiración de tu tarjeta es inválido",
    "invalid_expiry_year": "El año de expiración de tu tarjeta es inválido",
    "invalid_cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "incorrect_number": "El número de tarjeta es inválido"
  };
  $scope.current_charge_error = '';
  $scope.charge_errors = {
    "gateway-incorrect-num": "El número de tarjeta es incorrecto",
    "gateway-invalid-num": "El número de tarjeta es inválido",
    "gateway-invalid-exp-m": "El mes de expiración de tu tarjeta es inválido",
    "gateway-invalid-exp-y": "El año de expiración de tu tarjeta es inválido",
    "gateway-invalid-cvc": "El código de seguridad (CVC) de tu tarjeta es inválido",
    "gateway-expired-card": "La tarjeta que estás usando está expirada.",
    "gateway-incorrect-cvc": "El código de seguridad (CVC) es incorrecto",
    "gateway-incorrect-zip": "No se pudo realizar el cobro a tu tarjeta",
    "gateway-card-declined": "La tarjeta fue declinada por el banco",
    "gateway-stripe-missing": "No se puedo realizar el cobro a tu tarjeta",
    "gateway-processing-err": "Error al procesar tu tarjeta"
  }

  $scope.currentStep = 'pay';
  $scope.price_per_unit = null;

  $scope.getPaymentFee = function() {
    if($scope.pay_method.value == 'withdrawal') {
      return 0;
    } else {
      if($scope.pay_method.value == 'credit_card') {
        return Math.ceil( ($scope.f.quantity * $scope.price_per_unit) * 0.042 + 4 );
      } else {
        return Math.ceil( ($scope.f.quantity * $scope.price_per_unit) * 0.04 + 4 );
      }
    }
  }

  $scope.doPay = function() {
    document.getElementById("stripe-form").submit();
  }

  // After getting Stripe token, we make our API call
  // to try to make the charge
  $scope.createToken = function(status, response) {
    $scope.current_token_error = '';
    $scope.current_charge_error = '';
    if(status == 402) {
      console.log(status, response);
      $scope.current_token_error = response.error.code;
    } else {
      //console.log(response.id);
      $scope.makeOrder(response.id);
    }
  };

  // General purpose order processor
  $scope.makeOrder = function(token) {
    token = (typeof token === 'undefined') ? false : token;

    var meta = {};
    if(token) {
      meta = { token: token }
    }

    var gateways = {
      'withdrawal': 'offline',
      'credit_card': 'stripe'
    }

    $scope.f.error_messages.totals = false;
    $scope.f.trying_to_pay = true;

    $http.post(layer_path + 'store/checkout/massdrop', {
      "gateway": gateways[$scope.pay_method.value],
      "meta": meta,
      "quantity": parseInt($scope.f.quantity),
      "product_id": $scope.product_id
      //"ship_to": $scope.selected_address.id,
      //"total": cart.getTotal() + cart.getShippingFee() + $scope.getPaymentFee()
    }, {
      withCredentials: true
    }).then(function success(response) {
      //cart.empty();
      $scope.currentStep = "completed";
    }, function(error){
      console.log(error);
      if(error.data.key == "bad-total") {
        $scope.f.error_messages.totals = true;
        $scope.currentStep = "pay";
        //$scope.validateCart();
      } else {
        $scope.current_charge_error = error.data.key;
      }
      $scope.f.trying_to_pay = false;
    });
  }

  $http.get(layer_path + "store/product/" + $routeParams.slug).then(function success(response){
    console.log(response.data);
    $scope.product_id = response.data.id;
    $scope.price_per_unit = response.data.massdrop.reserve_price;
    $scope.name =  response.data.name;
  }, function(error){
    console.log(error);
  })
}]);

ComponentsModule.controller('InterestedController', ['$scope', '$http', '$uibModalInstance', 'product_id', 'massdrop',
  function($scope, $http, $uibModalInstance, product_id, massdrop) {
    $scope.form = {
      reference: ''
    };

    $scope.product_id = product_id;
    $scope.massdrop = massdrop;

    $scope.interested = function() {
      $http.put(layer_path + 'store/product/' + $scope.product_id + '/massdrop', {
        'reference': $scope.form.reference
      }).then(function success(response){
        //console.log(response.data);
        $scope.massdrop.interested = response.data.interested;
        if(response.data.interested) {
          $scope.massdrop.count_interested++;
        } else {
          $scope.massdrop.count_interested--;
        }
        $uibModalInstance.close($scope.massdrop);
      }, function(error){
        console.log(error);
      });
    }

}]);

var TournamentModule = angular.module('sg.module.tournament', []);


// Rank module controllers
TournamentModule.controller('TournamentController', ['$scope', '$timeout', function($scope, $timeout) {

  var firebaseRef = new Firebase(firebase_url);
  // Instantiate a new connection to Firebase.
  $scope._firebase = firebaseRef;
  $scope._matchesRef = $scope._firebase.child('matches');


  $scope.section = 'groups';

  $scope.groups = [
    {'name': 'A', 'members': [
      {username:'RealWhistle8',steam_id:'RealWhistle8',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Leon',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Dxmnttx',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Meneses',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'B', 'members': [
      {username:'shanks-bosco',steam_id:'Shanks_Bosco',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'hjean17',steam_id:'hjean16',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'jose-santillan-batani',steam_id:'drsantillanbatani',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'eurovancrazy',steam_id:'eurovancrazy',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'C', 'members': [
      {username:'WarHell',steam_id:'WarHell',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'KeinterCabezas',steam_id:'iKeinter',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Antonio-v',steam_id:'Antonio-V',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Drak',steam_id:'Drak Spartan',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'D', 'members': [
      {username:'nobody',steam_id:'nobody',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'FBNKB',steam_id:'fbnkb',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Cesar-tiza',steam_id:'CesarTiza',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Miguemex64',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'E', 'members': [
      {username:'TogeXD',steam_id:'TogexD',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Furybomber-Mancilla',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sadak-gr',steam_id:'Sadak',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Diego-armando-jordan-gonzalez',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'F', 'members': [
      {username:'AcidRod',steam_id:'Rocky Raccoon',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'GTBrother',steam_id:'GTBrother',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Jimp',steam_id:'Jimp',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Jharet-rulz',steam_id:'jharet89',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'G', 'members': [
      {username:'IdealistaMx',steam_id:'iDeaLiSTaMx',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sheik000',steam_id:'Sheik000',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'MauSV',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'DiegoWinchester',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'H', 'members': [
      {username:'BolilloSpartano',steam_id:'BolilloSpartano',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Calvi',steam_id:'Calvi',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sheko',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Dannielnino',steam_id:'Dannielnino',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
  ];

  $scope.final_matches = []


  // Load matches
  var fb_info = [];
  $scope._matchesRef.once('value', function(ss) {
    fb_info = ss.val();
    //console.log("Loaded", fb_info)

    // Calculate matches
    for(var i in $scope.groups) {
      $scope.groups[i].matches = [];
      var members = $scope.groups[i].members
      for(var j in members) {
        for(var k in members) {
          if(members[j].username != members[k].username) {
            var slug = members[j].username + '-' + members[k].username;
            //console.log('Reading from ', slug)
            var match = null;
            if(fb_info && slug in fb_info) {
              match = fb_info[slug];
              if(match.winner != "") {
                //console.log("winner!", match.winner);
                for(m in members) {
                  if(members[m].username == match.winner) {
                    members[m].pj++;
                    members[m].pg++;
                    members[m].points += 3;
                    if(match.player1_score > match.player2_score) {
                      members[m].gf += match.player1_score;
                      members[m].gc += match.player2_score;
                    } else {
                      members[m].gf += match.player2_score;
                      members[m].gc += match.player1_score;
                    }
                    members[m].dg = members[m].gf - members[m].gc;
                  }
                  if(members[m].username == match.loser) {
                    members[m].pj++;
                    members[m].pp++;
                    if(match.player1_score > match.player2_score) {
                      members[m].gf += match.player2_score;
                      members[m].gc += match.player1_score;
                    } else {
                      members[m].gf += match.player1_score;
                      members[m].gc += match.player2_score;
                    }
                    members[m].dg = members[m].gf - members[m].gc;
                  }
                }
              }
            } else {
              match = {
                player1: members[j].username,
                player2: members[k].username,
                player1_score: "",
                player2_score: "",
                winner: "",
                loser: "",
                date: "29/04/2016 20:45"
              }
              $scope._matchesRef.child(slug).set(match);
            }
            //console.log(match);
            $scope.groups[i].matches.push(match);
          }
        }
      }
      //console.log($scope.groups[i].matches);
    }
    for(var m = 1; m < 16; m++) {
      var slug = "G" + m;
      if(fb_info && slug in fb_info) {
        match = fb_info[slug];
        /*if(match.winner != "") {
          //console.log("winner!", match.winner);
          for(m in members) {
            if(members[m].username == match.winner) {
              members[m].pj++;
              members[m].pg++;
              members[m].points += 3;
              if(match.player1_score > match.player2_score) {
                members[m].gf += match.player1_score;
                members[m].gc += match.player2_score;
              } else {
                members[m].gf += match.player2_score;
                members[m].gc += match.player1_score;
              }
              members[m].dg = members[m].gf - members[m].gc;
            }
            if(members[m].username == match.loser) {
              members[m].pj++;
              members[m].pp++;
              if(match.player1_score > match.player2_score) {
                members[m].gf += match.player2_score;
                members[m].gc += match.player1_score;
              } else {
                members[m].gf += match.player1_score;
                members[m].gc += match.player2_score;
              }
              members[m].dg = members[m].gf - members[m].gc;
            }
          }
        }*/
      } else {
        match = {
          player1: "",
          player2: "",
          player1_score: "",
          player2_score: "",
          winner: "",
          loser: "",
          date: "07/05/2016 20:00",
          slug: slug
        }
        $scope._matchesRef.child(slug).set(match);
      }
      $scope.final_matches.push(match);
    }
  });

  $scope.updateScore = function(match, group) {
    var slug = match.player1 + '-' + match.player2;
    //console.log('saving...', slug, match);
    console.log(match);
    var new_match = {
      player1: match.player1,
      player2: match.player2,
      player1_score: match.player1_score !== "" ? match.player1_score : "",
      player2_score: match.player2_score !== "" ? match.player2_score : "",
      winner: "",
      loser: "",
      date: match.date
    }
    if(match.player1_score !== "" && match.player2_score !== "") {
      if(match.player1_score > match.player2_score) {
        new_match.winner = match.player1;
        new_match.loser = match.player2;
      } else {
        new_match.winner = match.player2;
        new_match.loser = match.player1;
      }
    }
    console.log(new_match);
    $scope._matchesRef.child(slug).set(new_match);

    group.matches[slug] = new_match;

    for(m in group.members) {
      group.members[m].pj=0;
      group.members[m].pg=0;
      group.members[m].pp=0;
      group.members[m].gf=0;
      group.members[m].gc=0;
      group.members[m].dg=0;
      group.members[m].points=0;
    }
    for(ma in group.matches) {
      for(m in group.members) {
        if(group.members[m].username == group.matches[ma].winner) {
          group.members[m].pj++;
          group.members[m].pg++;
          group.members[m].points += 3;
          if(group.matches[ma].player1_score > group.matches[ma].player2_score) {
            group.members[m].gf += group.matches[ma].player1_score;
            group.members[m].gc += group.matches[ma].player2_score;
          } else {
            group.members[m].gf += group.matches[ma].player2_score;
            group.members[m].gc += group.matches[ma].player1_score;
          }
          group.members[m].dg = group.members[m].gf - group.members[m].gc;
        }
        if(group.members[m].username == group.matches[ma].loser) {
          group.members[m].pj++;
          group.members[m].pp++;
          if(group.matches[ma].player1_score > group.matches[ma].player2_score) {
            group.members[m].gf += group.matches[ma].player2_score;
            group.members[m].gc += group.matches[ma].player1_score;
          } else {
            group.members[m].gf += group.matches[ma].player1_score;
            group.members[m].gc += group.matches[ma].player2_score;
          }
          group.members[m].dg = group.members[m].gf - group.members[m].gc;
        }
      }
    }
    match.editing = false;
  };
}]);

// @codekit-prepend "vendor/angular-marked"
// @codekit-prepend "vendor/wizzy"
// @codekit-prepend "vendor/infinite-scroll"
// @codekit-prepend "vendor/ui-bootstrap-tpls-0.14.3.min"
// @codekit-prepend "vendor/angular-facebook"
// @codekit-prepend "vendor/angular-jwt.min"
// @codekit-prepend "vendor/ng-file-upload-all.min.js"
// @codekit-prepend "vendor/elastic.js"
// @codekit-prepend "vendor/mentio.min.js"
// @codekit-prepend "vendor/angular-ui-switch.min.js"
// @codekit-prepend "vendor/angular-acl.min.js"
// @codekit-prepend "vendor/angular-timeago.js"
// @codekit-prepend "vendor/algoliasearch.angular.min.js"
// @codekit-prepend "vendor/stripe-angular.js"
// @codekit-prepend "vendor/emoji.config.js"
// @codekit-prepend "vendor/emoji.min.js"
// @codekit-prepend "vendor/jquery.knob.min.js"
// @codekit-prepend "vendor/socket.min.js"

// @codekit-prepend "common/directives"
// @codekit-prepend "common/filters"
// @codekit-prepend "common/active_reader"
// @codekit-prepend "common/services"

// @codekit-prepend "modules/feed/init"
// @codekit-prepend "modules/categories/init"
// @codekit-prepend "modules/reader/init"
// @codekit-prepend "modules/publisher/init"
// @codekit-prepend "modules/part/init"
// @codekit-prepend "modules/user/init"
// @codekit-prepend "modules/rank/init"
// @codekit-prepend "modules/badges/init"
// @codekit-prepend "modules/top/init"
// @codekit-prepend "modules/chat/chat"
// @codekit-prepend "modules/search/search"
// @codekit-prepend "modules/components/components"
// @codekit-prepend "modules/tournament/init"

var boardApplication = angular.module('board', [
  'ngOpbeat',
  'ngRoute',
  'ui.bootstrap',
  'directivesModule',
  'filtersModule',
  'sg.services',
  'activeReader',
  'hc.marked',
  //'idiotWizzy',
  'infinite-scroll',
  'facebook',
  'feedModule',
  'categoryModule',
  'readerModule',
  'publisherModule',
  'partModule',
  'userModule',
  'rankModule',
  'sg.module.components',
  'sg.module.badges',
  'sg.module.top',
  'sg.module.tournament',
  'chatModule',
  'angular-jwt',
  'firebase',
  'ngFileUpload',
  'monospaced.elastic',
  'mentio',
  'uiSwitch',
  'mm.acl',
  'yaru22.angular-timeago',
  'searchBar',
  'stripe',
  'btford.socket-io'
]);

var version = '062';

boardApplication.config(['$httpProvider', 'jwtInterceptorProvider', '$routeProvider', '$locationProvider', 'FacebookProvider', 'markedProvider', 'AclServiceProvider', '$opbeatProvider',
  function($httpProvider, jwtInterceptorProvider, $routeProvider, $locationProvider, FacebookProvider, markedProvider, AclServiceProvider, $opbeatProvider) {

  $routeProvider.when('/home', {
    templateUrl: '/js/partials/home.html?v=' + version
  });
  $routeProvider.when('/terminos-y-condiciones', {
    templateUrl: '/js/partials/terms.html?v=' + version
  });
  $routeProvider.when('/aviso-de-privacidad', {
    templateUrl: '/js/partials/privacy.html?v=' + version
  });
  $routeProvider.when('/reglamento', {
    templateUrl: '/js/partials/rules.html?v=' + version
  });
  $routeProvider.when('/about', {
    templateUrl: '/js/partials/about.html?v=' + version
  });
  $routeProvider.when('/rangos', {
    templateUrl: '/js/partials/ranks.html?v=' + version,
    controller: 'RanksController'
  });
  $routeProvider.when('/medallas', {
    templateUrl: '/js/partials/badges.html?v=' + version,
    controller: 'BadgeController'
  });
  $routeProvider.when('/top-ranking', {
    templateUrl: '/js/partials/tops.html?v=' + version,
    controller: 'TopController'
  });
  $routeProvider.when('/signup/confirm/:code', {
    templateUrl: '/js/partials/validate.html?v=' + version,
    controller: 'UserValidationController'
  });
  $routeProvider.when('/componentes/tienda/:type?', {
    templateUrl: '/js/partials/components.html?v=' + version,
    controller: 'ComponentsController'
  });
  $routeProvider.when('/componentes/armar-pc', {
    templateUrl: '/js/partials/pc_builder.html?v=' + version,
    controller: 'PcBuilderController'
  });
  $routeProvider.when('/componentes/checkout', {
    templateUrl: '/js/partials/checkout.html?v=' + version,
    controller: 'CheckoutController'
  });
  $routeProvider.when('/componentes/:type?', {
    templateUrl: '/js/partials/components.html?v=' + version,
    controller: 'ComponentsController'
  });
  $routeProvider.when('/componentes/:type/:slug', {
    templateUrl: '/js/partials/component.html?v=' + version,
    controller: 'ComponentController'
  });
  $routeProvider.when('/compra-en-legion/faq', {
    templateUrl: '/js/partials/massdrop/faq.html?v=' + version,
    //controller: 'ComponentController'
  });
  $routeProvider.when('/compra-en-legion/:slug', {
    templateUrl: '/js/partials/massdrop/show.html?v=' + version,
    controller: 'MassdropController'
  });
  $routeProvider.when('/compra-en-legion/:slug/unirme', {
    templateUrl: '/js/partials/massdrop/pay.html?v=' + version,
    controller: 'MassdropPayController'
  });
  $routeProvider.when('/compra-en-legion', {
    templateUrl: '/js/partials/massdrop/index.html?v=' + version,
    controller: 'MassdropIndexController'
  });
  $routeProvider.when('/c/:slug', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.when('/p/:slug/:id/edit', {
    templateUrl: '/js/partials/edit.html?v=' + version,
    controller: 'EditPostController'
  });
  $routeProvider.when('/p/:slug/:id/:comment_position?', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.when('/u/:username/:id', {
    templateUrl: '/js/partials/profile.html?v=' + version,
    controller: 'UserController'
  });
  $routeProvider.when('/user/lost_password/:token', {
    templateUrl: '/js/partials/recovery.html?v=' + version,
    controller: 'UserRecoveryController'
  });
  $routeProvider.when('/chat/:slug?', {
    templateUrl: '/js/partials/chat.html?v=' + version,
    controller: 'ChatController'
  });
  $routeProvider.when('/torneo', {
    templateUrl: '/js/partials/tournament.html?v=' + version,
    controller: 'TournamentController'
  });
  $routeProvider.when('/post/create/:cat_slug?', {
    templateUrl: '/js/partials/publish.html?v=' + version,
    controller: 'PublishController',
    onEnter: function() {
      if(!$scope.user.isLogged) {
        window.location = '/';
      }
    }
  });
  $routeProvider.when('/', {
    templateUrl: '/js/partials/main.html?v=' + version,
    controller: 'CategoryListController'
  });
  $routeProvider.otherwise({ redirectTo: '/' });

  // use the HTML5 History API
  $locationProvider.html5Mode(true);

  // Stripe
  Stripe.setPublishableKey(stripe_public_key);

  // Marked
  markedProvider.setRenderer({
    link: function(href, title, text) {
      return "<a href='" + href + "' title='" + title + "' target='_blank'>" + text + "</a>";
    }
  });

  // Please note we're annotating the function so that the $injector works when the file is minified
  jwtInterceptorProvider.tokenGetter = ['config', 'jwtHelper', function(config, jwtHelper) {
    // Skip authentication for any requests ending in .html
    if (config.url.substr(config.url.length - 5) == '.html') {
      return null;
    }

    if(localStorage.signed_in == 'false')
      return null;

    var idToken = localStorage.getItem('id_token');
    if(idToken === null) {
      return null;
    }

    if (jwtHelper.isTokenExpired(idToken)) {
      localStorage.signed_in = false
    } else {
      return idToken;
    }
  }];
  $httpProvider.interceptors.push('jwtInterceptor');

  FacebookProvider.init(fb_api_key);

  $opbeatProvider.config({
    orgId: '4718fb1324fc4d3897ee39d393f9b734',
    appId: '0fecd2a8d9'
  })

  // ACL Configuration
  AclServiceProvider.config({storage: false});
}]);

boardApplication.controller('SignInController', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'Facebook',
  function($scope, $rootScope, $http, $uibModalInstance, Facebook) {
    $scope.form = {
      email: '',
      password: '',
      error: false
    };

    $scope.fb_loading = false;

    $scope.pass_recovery = {
      show: false,
      form: {
        email: '',
        message: false
      }
    };

    $scope.sendEmail = function() {
      console.log("enviar correo...")
      $http.get(layer_path + 'auth/lost-password', {params:{
        'email': $scope.pass_recovery.form.email
      }}).then(function success(response) {
        $scope.pass_recovery.form.message = {
          content: 'Se te ha envíado un correo con instrucciones.'
        };
      });
    };

    $scope.signIn = function() {
      if ($scope.form.email === '' || $scope.form.password === '') {
        $scope.form.error = {message: 'Ambos campos son necesarios'};
        return;
      }

      // Post credentials to the auth rest point
      $http.get(layer_path + 'auth/get-token', {
        params: {
          email: $scope.form.email,
          password: $scope.form.password
        },
        skipAuthorization: true
      })
      .then(function success(response){
        var data = response.data;
        localStorage.setItem('id_token', data.token);
        localStorage.setItem('firebase_token', data.firebase);
        localStorage.setItem('signed_in', true);

        $uibModalInstance.dismiss('logged');
        $rootScope.$broadcast('login');
      }, function(error){
        $scope.form.error = { message: 'Usuario o contraseña incorrecta.' };
      });
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };

    var checkPermissions = function(response) {
      if(response.status === 'connected') {
        return $http.get("https://graph.facebook.com/me/permissions?access_token=" + response.authResponse.accessToken).
          then(function success(response) {
            var permissions = response.data.data;
            var found = false;
            for(p in permissions) {
              if(permissions[p].permission == "email") {
                return permissions[p].status == "granted";
              }
            }
            return false;
          }, function(error){
            return false;
          });
      } else {
        return false;
      }
    }

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      Facebook.login(function(response) {
        if(response.authResponse != null) {
          checkPermissions(response).then(function (result) {
            if(result) {
              $scope.fb_try(response);
            } else {
              $scope.form.error = {message:'Debes aceptar todos los permisos en FB para poder iniciar sesión.'};
              $scope.fb_loading = false;
            }
          });
        } else {
          $scope.form.error = {message:'Debes aceptar los permisos en FB para poder iniciar sesión.'};
          $scope.fb_loading = false;
        }
      }, {
        scope: 'public_profile,email',
        auth_type: 'rerequest'
      });
    };

    $scope.fb_try = function(response) {
      $http.get("https://graph.facebook.com/me?access_token=" + response.authResponse.accessToken).
        success(function(data, status, headers, config) {
          //var info = data;
          var ref = localStorage.getItem('ref');
          if(ref) {
            data.ref = ref;
          }
          $http.post(layer_path + 'user/get-token/facebook', data).
            error(function(data, status, headers, config) {
              if(data.message == "Not trusted.") {
                $scope.form.error = {message:'Tu cuenta ha sido bloqueada.'};
              } else {
                $scope.form.error = {message:'No se pudo iniciar sesión.'};
              }
            })
            .success(function(data) {
              localStorage.setItem('id_token', data.token);
              localStorage.setItem('firebase_token', data.firebase);
              localStorage.setItem('signed_in', true);

              $uibModalInstance.dismiss('logged');
              $rootScope.$broadcast('login');
            });
        }).
        error(function(data, status, headers, config) {
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
  }
]);

boardApplication.controller('SignUpController', ['$scope', '$rootScope', '$http', '$uibModalInstance', 'Facebook',
  function($scope, $rootScope, $http, $uibModalInstance, Facebook) {
    $scope.form = {
      email: '',
      password: '',
      username: '',
      username_error: false,
      error: false
    };
    $scope.fb_loading = false;

    $scope.check_username = function() {
      if( /^[a-zA-Z][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]$/.test($scope.form.username) ) {
        $scope.form.username_error = false;
      } else {
        $scope.form.username_error = true;
      }
    };

    $scope.signUp = function() {
      if ($scope.form.email === '' || $scope.form.password === '' || $scope.form.username === '') {
        $scope.form.error = {message:'Todos los campos son necesarios.'};
        return;
      }

      // Post credentials to the UserRegisterAction endpoint
      var payload = {
        email: $scope.form.email,
        password: $scope.form.password,
        username: $scope.form.username
      };
      var ref = localStorage.getItem('ref');
      if(ref) {
        payload.ref = ref;
      }

      $http.post(layer_path + 'user', payload, { skipAuthorization: true })
        .then(function success(response){
          var data = response.data;
          localStorage.setItem('id_token', data.token);
          localStorage.setItem('firebase_token', data.firebase);
          localStorage.setItem('signed_in', true);
          $uibModalInstance.dismiss('signed');
          $rootScope.$broadcast('login');
        }, function (error){
          $scope.form.error = { message: 'El usuario o correo elegido ya existe.' };
        });
    };

    $scope.ok = function () {
      $uibModalInstance.close($scope.selected.item);
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    var checkPermissions = function(response) {
      if(response.status === 'connected') {
        return $http.get("https://graph.facebook.com/me/permissions?access_token=" + response.authResponse.accessToken).
          then(function success(response) {
            var permissions = response.data.data;
            var found = false;
            for(p in permissions) {
              if(permissions[p].permission == "email") {
                return permissions[p].status == "granted";
              }
            }
            return false;
          }, function(error){
            return false;
          });
      } else {
        return false;
      }
    }
    $scope.loginFb = function() {
      $scope.fb_loading = true;
      Facebook.login(function(response) {
        if(response.authResponse != null) {
          checkPermissions(response).then(function (result) {
            if(result) {
              $scope.fb_try(response);
            } else {
              $scope.form.error = {message:'Debes aceptar todos los permisos en FB para poder iniciar sesión.'};
              $scope.fb_loading = false;
            }
          });
        } else {
          $scope.form.error = {message:'Debes aceptar los permisos en FB para poder iniciar sesión.'};
          $scope.fb_loading = false;
        }
      }, {
        scope: 'public_profile,email',
        auth_type: 'rerequest'
      });
    };

    $scope.fb_try = function(response) {
      $http.get("https://graph.facebook.com/me?access_token=" + response.authResponse.accessToken)
        .then(function success(response){
          var data = response.data;
          var ref = localStorage.getItem('ref');
          if(ref) {
            data.ref = ref;
          }
          $http.post(layer_path + 'user/get-token/facebook', data).
            then(function success(response){
              var data = response.data;
              localStorage.setItem('id_token', data.token);
              localStorage.setItem('firebase_token', data.firebase);
              localStorage.setItem('signed_in', true);
              $uibModalInstance.dismiss('logged');
              $rootScope.$broadcast('login');
            }, function error(response){
              var data = response.data;
              if(data.message == "Not trusted.") {
                $scope.form.error = {message:'Tu cuenta ha sido bloqueada.'};
              } else {
                $scope.form.error = {message:'No se pudo iniciar sesión.'};
              }
            });
        }, function(error){
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
}]);

boardApplication.controller('MainController', [
  '$scope',
  '$rootScope',
  '$http',
  '$uibModal',
  '$timeout',
  '$firebaseObject',
  '$firebaseArray',
  'Facebook',
  'AclService',
  '$location',
  '$q',
  function($scope, $rootScope, $http, $uibModal, $timeout, $firebaseObject, $firebaseArray, Facebook, AclService, $location, $q) {
    $scope.user = {
      isLogged: false,
      info: null,
      notifications: {count:0, list:null},
      gaming: {
        coins: 0,
        shit: 0,
        tribute: 0
      }
    }
    $scope.status = {
      post_selected: false,
      selected_post: null,
      last_action: null,
      viewing: 'all',
      pending: 0,
      newer_post_date: null,
      show_categories: false,
      menuCollapsed: true
    }
    $scope.user.isLogged = localStorage.getItem('signed_in')==='true'?true:false;
    $scope.misc = {
      gaming: null,
      badges: null,
      role_labels: {
        'developer': 'Software Developer',
        'spartan-girl': 'Spartan Girl',
        'editor': 'Editor',
        'child-moderator': 'Moderador Jr',
        'category-moderator': 'Moderador',
        'super-moderator': 'Super Moderador',
        'administrator': 'Admin'
      }
    };
    $scope.promises = {
      'gaming': null,
      'board_stats': null
    }
    $scope.update = {
      available: false,
      show: false
    };

    $rootScope.$on('$routeChangeStart', function () {
      // This runs on every controller change
      var _sift = window._sift = window._sift || [];
      _sift.push(['_setAccount', ss_key]);
      if($scope.user.isLogged === true && $scope.user.info) {
        //console.log($scope.user.info.id, $scope.user.info.session_id);
        _sift.push(['_setUserId', $scope.user.info.id]);
        _sift.push(['_setSessionId', $scope.user.info.session_id]);
      } else {
        _sift.push(['_setUserId', ""]);
      }
      _sift.push(['_trackPageview']);
    });

    $scope.show_search = function() {
      $rootScope.$broadcast('open_search');
    }

    $scope.logUser = function() {
      $scope.promises.self = $q(function(resolve, reject) {
        $http.get(layer_path + 'user/my', {
          withCredentials: true
        }).then(function success(response) {
            var data = response.data;
            //console.log(data);
            $scope.user.info = data;
            $scope.user.isLogged = true;

            // Attach the member roles to the current user
            for(var i in data.roles) {
              AclService.attachRole(data.roles[i].name);
            }

            // Match badges
            $scope.promises.gaming.then(function() {
              $timeout(function() {
                // Match owned badges with current badge info
                for(var i in data.gaming.badges) {
                  for(var j in $scope.misc.gaming.badges) {
                    if(data.gaming.badges[i].id === $scope.misc.gaming.badges[j].id) {
                      $scope.misc.gaming.badges[j].owned = true;
                      break;
                    }
                  }
                }

                // We check if a required badge is still needed
                for(var i in $scope.misc.gaming.badges) {
                  if($scope.misc.gaming.badges[i].required_badge) {
                    for(var j in $scope.misc.gaming.badges) {
                      if($scope.misc.gaming.badges[i].required_badge.id === $scope.misc.gaming.badges[j].id) {
                        if(!$scope.misc.gaming.badges[j].owned) {
                          $scope.misc.gaming.badges[i].badge_needed = true;
                        }
                      }
                    }
                  }
                }
              }, 0);
            });

            // FIREBASE PREPARATION
            var fbRef = new Firebase(firebase_url);
            fbRef.onAuth(function onComplete(authData) {
              if (authData) {
                //if($scope.can('debug')) console.log("Authenticated to Firebase", authData);
              } else {
                console.log("Client unauthenticated.");
                //$scope.signOut();
              }
            });
            fbRef.authWithCustomToken(localStorage.firebase_token, function(error, authData) {
              if (error) {
                console.log("Login to Firebase failed!", error);
              } else {
                var amOnline = fbRef.child(".info/connected");
                var userRef = fbRef.child("users").child(data.id);
                var presenceRef = userRef.child("presence");

                // We generate a random string to use as a client id
                var client_id = (0|Math.random()*9e6).toString(36);
                amOnline.on('value', function(snapshot) {
                  if(snapshot.val()) {
                    presenceRef.child(client_id).onDisconnect().remove();
                    presenceRef.child(client_id).set(true);
                  }
                });

                // Personal info
                var image = $scope.user.info.image || "";
                userRef.child("info").set({
                  username: $scope.user.info.username,
                  image: image
                });

                // Gamification attributes
                var gamingRef = userRef.child("gaming");
                $scope.user.gaming = $firebaseObject(gamingRef);
                //$scope.user.gaming.$loaded(function() {});

                // download the data into a local object
                var notificationsCountRef = userRef.child("notifications/count");
                var count = $firebaseObject(notificationsCountRef)
                // synchronize the object with a three-way data binding
                count.$bindTo($scope, "user.notifications.count");
                count.$loaded( function() {
                  var to_show = 15;
                  if(count.$value > 15){
                    to_show = count.$value;
                  }
                  var list_ref = userRef.child("notifications/list");
                  $scope.user.notifications.list = $firebaseArray(list_ref.limitToLast(to_show));

                  // We wait till notifications list is loaded
                  $scope.user.notifications.list.$loaded()
                  .then(function(x) {
                    x.$watch(function(event) {
                      // Notification sound
                      if(event.event === "child_added") {
                        var audio = new Audio('/sounds/notification.mp3');
                        audio.play();
                      }
                    });
                  });
                });
              }
            });

            if($location.path() == '/home') {
              window.location.href = "/";
            }

            // Warn everyone
            $timeout(function() {
              $scope.$broadcast('userLogged');
              $scope.$broadcast('changedContainers');
              resolve();
            }, 100);
        }, function(response) {
          // If error while getting personal info, just log him out
          $scope.signOut();
          reject();
        });
      });
    }

    $scope.signIn = function() {
      var modalInstance = $uibModal.open({
        templateUrl: '/js/partials/sign-in.html',
        controller: 'SignInController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signUp = function() {
      var modalInstance = $uibModal.open({
        templateUrl: '/js/partials/sign-up.html',
        controller: 'SignUpController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signOut = function() {
      $http.get(layer_path + 'auth/logout').then(function success(response) {
        localStorage.signed_in = false;
        $scope.user.isLogged = false;
        localStorage.removeItem('id_token');
        localStorage.removeItem('firebase_token');
        window.location = '/';
      });
    };

    $scope.toggle_notifications = function() {
      $scope.user.notifications.count.$value = 0;
      $timeout(function() {
        var arrayLength = $scope.user.notifications.list.length;
        for (var i = 0; i < arrayLength; i++) {
          if(!$scope.user.notifications.list[i].seen) {
            $scope.user.notifications.list[i].seen = true;
            $scope.user.notifications.list.$save(i);
          }
        }
      }, 50);
    };

    $scope.toggle_notification = function( elem ) {
      if(!elem.seen) {
        $scope.user.notifications.count.$value = $scope.user.notifications.count.$value - 1;
        if($scope.user.notifications.count.$value < 0) {
          $scope.user.notifications.count.$value = 0;
        }
        elem.seen = true;
        $scope.user.notifications.list.$save(elem);
      }
    };

    $scope.total_notifications = function() {
      var sp = 0;
      return sp + $scope.user.notifications.count.$value;
    };

    $scope.reloadPost = function() {
      $scope.$broadcast('reloadPost');
    };

    // Used for updating platform
    $scope.reloadPage = function() {
      window.location.reload(true);
    };

    // If login action sucessfull anywhere, sign in the user
    $scope.$on('login', function(e) {
      $scope.logUser();
    });

    // Check for FB Login Status, this is necessary so later calls doesn't make
    // the pop up to be blocked by the browser
    Facebook.getLoginStatus(function(r) {
      //console.log(r);
      $rootScope.fb_response = r;
    });

    // Board updates notification
    var fbRef = new Firebase(firebase_url);
    var updatesRef = fbRef.child('version');
    updatesRef.on('value', function(ss) {
      //console.log('Local version', parseInt(version));
      //console.log('Remote version', parseInt(ss.val()));
      $scope.$apply(function(){
        if( parseInt(ss.val()) > parseInt(version) ) {
          $scope.update.available = true;
          $timeout(function(){
            $scope.update.show = true;
          }, 100);
          $timeout(function(){
            $scope.reloadPage();
          }, 30*1000);
        } else {
          $scope.update.show = false;
          $scope.update.available = false;
        }
      });
    });

    // If already signed in, sign in the user
    if(localStorage.signed_in === 'true') {
      $scope.logUser();
    }

    // Load platform stats
    $scope.promises.board_stats = $http.get(layer_path + 'stats/board').
      then(function success(response){
        $scope.status.stats = response.data;
      });

    // Load gamification data
    $scope.promises.gaming = $http.get(layer_path + 'gamification').
      then(function success(response){
        var data = response.data;
        for(var i in data.badges) {
          if(data.badges[i].required_badge !== null) {
            for(var j in data.badges) {
              if(data.badges[j].id == data.badges[i].required_badge) {
                data.badges[i].required_badge = data.badges[j];
                break;
              }
            }
          }
        }
        $scope.misc.gaming = data;
      });

    // Friends invitations
    var ref = $location.search().ref;
    if(ref != undefined) {
      localStorage.setItem('ref', ref);
    }
  }
]);

boardApplication.run(['$rootScope', '$http', 'AclService', 'AdvancedAcl', 'cart', '$location', function($rootScope, $http, AclService, AdvancedAcl, cart, $location) {
  // TEST PURPOSES
  if(false) {
    localStorage.removeItem('signed_in');
    localStorage.removeItem('id_token');
    localStorage.removeItem('firebase_token');
    localStorage.removeItem('redirect_to_home');
  }

  $rootScope.location = $location;

  // Initialize the local storage
  if(!localStorage.signed_in)
    localStorage.signed_in = false;

  var location = $location.path();
  //console.log(location);

  if(localStorage.signed_in === 'false' && localStorage.redirect_to_home !== 'true' && location == '/') {
    localStorage.setItem('redirect_to_home', 'true');
    window.location.href = "/home";
  }

  $rootScope.cart = cart;

  $rootScope.page = {
    title: "SpartanGeek.com | Comunidad de tecnología, geeks y más",
    description: "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos."
  };

  // Initialize cart
  $http.get(layer_path + 'store/cart', {
    withCredentials: true
  }).then(function success(response){
    cart.replaceItems(response.data);
  }, function(error){
    console.log(error);
  });

  // Set the ACL data.
  // The data should have the roles as the property names,
  // with arrays listing their permissions as their value.
  var aclData = {}
  $http.get(layer_path + 'permissions')
    .then(function success(response){
      data = response.data;
      // Proccess de roles and permissions iteratively
      for(var r in data.rules) {
        aclData[r] = data.rules[r].permissions;
        var current = data.rules[r];
        while(current.parents.length > 0) {
          aclData[r] = aclData[r].concat(data.rules[current.parents[0]].permissions);
          current = data.rules[current.parents[0]];
        }
      }
      AclService.setAbilities(aclData);
    }, function (error){
      // How should we proceed if no data?
    });
  $rootScope.can = AclService.can;
  $rootScope.aacl = AdvancedAcl;
}]);

