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
        console.log(top, height, footer, neededHeight);

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

services.service('modalService', ['$modal', function ($modal) {
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
      tempModalDefaults.controller = function ($scope, $modalInstance) {
        $scope.modalOptions = tempModalOptions;
        $scope.modalOptions.ok = function (result) {
          $modalInstance.close(result);
        };
        $scope.modalOptions.close = function (result) {
          $modalInstance.dismiss('cancel');
        };
      }
    }

    return $modal.open(tempModalDefaults).result;
  };
}]);

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

 * Version: 0.13.0 - 2015-05-02
 * License: MIT
 */
angular.module("ui.bootstrap",["ui.bootstrap.tpls","ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.bindHtml","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.dateparser","ui.bootstrap.position","ui.bootstrap.datepicker","ui.bootstrap.dropdown","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.timepicker","ui.bootstrap.transition","ui.bootstrap.typeahead"]),angular.module("ui.bootstrap.tpls",["template/accordion/accordion-group.html","template/accordion/accordion.html","template/alert/alert.html","template/carousel/carousel.html","template/carousel/slide.html","template/datepicker/datepicker.html","template/datepicker/day.html","template/datepicker/month.html","template/datepicker/popup.html","template/datepicker/year.html","template/modal/backdrop.html","template/modal/window.html","template/pagination/pager.html","template/pagination/pagination.html","template/tooltip/tooltip-html-popup.html","template/tooltip/tooltip-html-unsafe-popup.html","template/tooltip/tooltip-popup.html","template/tooltip/tooltip-template-popup.html","template/popover/popover-template.html","template/popover/popover.html","template/progressbar/bar.html","template/progressbar/progress.html","template/progressbar/progressbar.html","template/rating/rating.html","template/tabs/tab.html","template/tabs/tabset.html","template/timepicker/timepicker.html","template/typeahead/typeahead-match.html","template/typeahead/typeahead-popup.html"]),angular.module("ui.bootstrap.collapse",[]).directive("collapse",["$animate",function(a){return{link:function(b,c,d){function e(){c.removeClass("collapse").addClass("collapsing"),a.addClass(c,"in",{to:{height:c[0].scrollHeight+"px"}}).then(f)}function f(){c.removeClass("collapsing"),c.css({height:"auto"})}function g(){c.css({height:c[0].scrollHeight+"px"}).removeClass("collapse").addClass("collapsing"),a.removeClass(c,"in",{to:{height:"0"}}).then(h)}function h(){c.css({height:"0"}),c.removeClass("collapsing"),c.addClass("collapse")}b.$watch(d.collapse,function(a){a?g():e()})}}}]),angular.module("ui.bootstrap.accordion",["ui.bootstrap.collapse"]).constant("accordionConfig",{closeOthers:!0}).controller("AccordionController",["$scope","$attrs","accordionConfig",function(a,b,c){this.groups=[],this.closeOthers=function(d){var e=angular.isDefined(b.closeOthers)?a.$eval(b.closeOthers):c.closeOthers;e&&angular.forEach(this.groups,function(a){a!==d&&(a.isOpen=!1)})},this.addGroup=function(a){var b=this;this.groups.push(a),a.$on("$destroy",function(){b.removeGroup(a)})},this.removeGroup=function(a){var b=this.groups.indexOf(a);-1!==b&&this.groups.splice(b,1)}}]).directive("accordion",function(){return{restrict:"EA",controller:"AccordionController",transclude:!0,replace:!1,templateUrl:"template/accordion/accordion.html"}}).directive("accordionGroup",function(){return{require:"^accordion",restrict:"EA",transclude:!0,replace:!0,templateUrl:"template/accordion/accordion-group.html",scope:{heading:"@",isOpen:"=?",isDisabled:"=?"},controller:function(){this.setHeading=function(a){this.heading=a}},link:function(a,b,c,d){d.addGroup(a),a.$watch("isOpen",function(b){b&&d.closeOthers(a)}),a.toggleOpen=function(){a.isDisabled||(a.isOpen=!a.isOpen)}}}}).directive("accordionHeading",function(){return{restrict:"EA",transclude:!0,template:"",replace:!0,require:"^accordionGroup",link:function(a,b,c,d,e){d.setHeading(e(a,angular.noop))}}}).directive("accordionTransclude",function(){return{require:"^accordionGroup",link:function(a,b,c,d){a.$watch(function(){return d[c.accordionTransclude]},function(a){a&&(b.html(""),b.append(a))})}}}),angular.module("ui.bootstrap.alert",[]).controller("AlertController",["$scope","$attrs",function(a,b){a.closeable="close"in b,this.close=a.close}]).directive("alert",function(){return{restrict:"EA",controller:"AlertController",templateUrl:"template/alert/alert.html",transclude:!0,replace:!0,scope:{type:"@",close:"&"}}}).directive("dismissOnTimeout",["$timeout",function(a){return{require:"alert",link:function(b,c,d,e){a(function(){e.close()},parseInt(d.dismissOnTimeout,10))}}}]),angular.module("ui.bootstrap.bindHtml",[]).directive("bindHtmlUnsafe",function(){return function(a,b,c){b.addClass("ng-binding").data("$binding",c.bindHtmlUnsafe),a.$watch(c.bindHtmlUnsafe,function(a){b.html(a||"")})}}),angular.module("ui.bootstrap.buttons",[]).constant("buttonConfig",{activeClass:"active",toggleEvent:"click"}).controller("ButtonsController",["buttonConfig",function(a){this.activeClass=a.activeClass||"active",this.toggleEvent=a.toggleEvent||"click"}]).directive("btnRadio",function(){return{require:["btnRadio","ngModel"],controller:"ButtonsController",link:function(a,b,c,d){var e=d[0],f=d[1];f.$render=function(){b.toggleClass(e.activeClass,angular.equals(f.$modelValue,a.$eval(c.btnRadio)))},b.bind(e.toggleEvent,function(){var d=b.hasClass(e.activeClass);(!d||angular.isDefined(c.uncheckable))&&a.$apply(function(){f.$setViewValue(d?null:a.$eval(c.btnRadio)),f.$render()})})}}}).directive("btnCheckbox",function(){return{require:["btnCheckbox","ngModel"],controller:"ButtonsController",link:function(a,b,c,d){function e(){return g(c.btnCheckboxTrue,!0)}function f(){return g(c.btnCheckboxFalse,!1)}function g(b,c){var d=a.$eval(b);return angular.isDefined(d)?d:c}var h=d[0],i=d[1];i.$render=function(){b.toggleClass(h.activeClass,angular.equals(i.$modelValue,e()))},b.bind(h.toggleEvent,function(){a.$apply(function(){i.$setViewValue(b.hasClass(h.activeClass)?f():e()),i.$render()})})}}}),angular.module("ui.bootstrap.carousel",[]).controller("CarouselController",["$scope","$interval","$animate",function(a,b,c){function d(a){if(angular.isUndefined(k[a].index))return k[a];{var b;k.length}for(b=0;b<k.length;++b)if(k[b].index==a)return k[b]}function e(){f();var c=+a.interval;!isNaN(c)&&c>0&&(h=b(g,c))}function f(){h&&(b.cancel(h),h=null)}function g(){var b=+a.interval;i&&!isNaN(b)&&b>0?a.next():a.pause()}var h,i,j=this,k=j.slides=a.slides=[],l=-1;j.currentSlide=null;var m=!1;j.select=a.select=function(b,d){function f(){m||(angular.extend(b,{direction:d,active:!0}),angular.extend(j.currentSlide||{},{direction:d,active:!1}),c.enabled()&&!a.noTransition&&b.$element&&(a.$currentTransition=!0,b.$element.one("$animate:close",function(){a.$currentTransition=null})),j.currentSlide=b,l=g,e())}var g=j.indexOfSlide(b);void 0===d&&(d=g>j.getCurrentIndex()?"next":"prev"),b&&b!==j.currentSlide&&f()},a.$on("$destroy",function(){m=!0}),j.getCurrentIndex=function(){return j.currentSlide&&angular.isDefined(j.currentSlide.index)?+j.currentSlide.index:l},j.indexOfSlide=function(a){return angular.isDefined(a.index)?+a.index:k.indexOf(a)},a.next=function(){var b=(j.getCurrentIndex()+1)%k.length;return a.$currentTransition?void 0:j.select(d(b),"next")},a.prev=function(){var b=j.getCurrentIndex()-1<0?k.length-1:j.getCurrentIndex()-1;return a.$currentTransition?void 0:j.select(d(b),"prev")},a.isActive=function(a){return j.currentSlide===a},a.$watch("interval",e),a.$on("$destroy",f),a.play=function(){i||(i=!0,e())},a.pause=function(){a.noPause||(i=!1,f())},j.addSlide=function(b,c){b.$element=c,k.push(b),1===k.length||b.active?(j.select(k[k.length-1]),1==k.length&&a.play()):b.active=!1},j.removeSlide=function(a){angular.isDefined(a.index)&&k.sort(function(a,b){return+a.index>+b.index});var b=k.indexOf(a);k.splice(b,1),k.length>0&&a.active?j.select(b>=k.length?k[b-1]:k[b]):l>b&&l--}}]).directive("carousel",[function(){return{restrict:"EA",transclude:!0,replace:!0,controller:"CarouselController",require:"carousel",templateUrl:"template/carousel/carousel.html",scope:{interval:"=",noTransition:"=",noPause:"="}}}]).directive("slide",function(){return{require:"^carousel",restrict:"EA",transclude:!0,replace:!0,templateUrl:"template/carousel/slide.html",scope:{active:"=?",index:"=?"},link:function(a,b,c,d){d.addSlide(a,b),a.$on("$destroy",function(){d.removeSlide(a)}),a.$watch("active",function(b){b&&d.select(a)})}}}).animation(".item",["$animate",function(a){return{beforeAddClass:function(b,c,d){if("active"==c&&b.parent()&&!b.parent().scope().noTransition){var e=!1,f=b.isolateScope().direction,g="next"==f?"left":"right";return b.addClass(f),a.addClass(b,g).then(function(){e||b.removeClass(g+" "+f),d()}),function(){e=!0}}d()},beforeRemoveClass:function(b,c,d){if("active"==c&&b.parent()&&!b.parent().scope().noTransition){var e=!1,f=b.isolateScope().direction,g="next"==f?"left":"right";return a.addClass(b,g).then(function(){e||b.removeClass(g),d()}),function(){e=!0}}d()}}}]),angular.module("ui.bootstrap.dateparser",[]).service("dateParser",["$locale","orderByFilter",function(a,b){function c(a){var c=[],d=a.split("");return angular.forEach(f,function(b,e){var f=a.indexOf(e);if(f>-1){a=a.split(""),d[f]="("+b.regex+")",a[f]="$";for(var g=f+1,h=f+e.length;h>g;g++)d[g]="",a[g]="$";a=a.join(""),c.push({index:f,apply:b.apply})}}),{regex:new RegExp("^"+d.join("")+"$"),map:b(c,"index")}}function d(a,b,c){return 1>c?!1:1===b&&c>28?29===c&&(a%4===0&&a%100!==0||a%400===0):3===b||5===b||8===b||10===b?31>c:!0}var e=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;this.parsers={};var f={yyyy:{regex:"\\d{4}",apply:function(a){this.year=+a}},yy:{regex:"\\d{2}",apply:function(a){this.year=+a+2e3}},y:{regex:"\\d{1,4}",apply:function(a){this.year=+a}},MMMM:{regex:a.DATETIME_FORMATS.MONTH.join("|"),apply:function(b){this.month=a.DATETIME_FORMATS.MONTH.indexOf(b)}},MMM:{regex:a.DATETIME_FORMATS.SHORTMONTH.join("|"),apply:function(b){this.month=a.DATETIME_FORMATS.SHORTMONTH.indexOf(b)}},MM:{regex:"0[1-9]|1[0-2]",apply:function(a){this.month=a-1}},M:{regex:"[1-9]|1[0-2]",apply:function(a){this.month=a-1}},dd:{regex:"[0-2][0-9]{1}|3[0-1]{1}",apply:function(a){this.date=+a}},d:{regex:"[1-2]?[0-9]{1}|3[0-1]{1}",apply:function(a){this.date=+a}},EEEE:{regex:a.DATETIME_FORMATS.DAY.join("|")},EEE:{regex:a.DATETIME_FORMATS.SHORTDAY.join("|")},HH:{regex:"(?:0|1)[0-9]|2[0-3]",apply:function(a){this.hours=+a}},H:{regex:"1?[0-9]|2[0-3]",apply:function(a){this.hours=+a}},mm:{regex:"[0-5][0-9]",apply:function(a){this.minutes=+a}},m:{regex:"[0-9]|[1-5][0-9]",apply:function(a){this.minutes=+a}},sss:{regex:"[0-9][0-9][0-9]",apply:function(a){this.milliseconds=+a}},ss:{regex:"[0-5][0-9]",apply:function(a){this.seconds=+a}},s:{regex:"[0-9]|[1-5][0-9]",apply:function(a){this.seconds=+a}}};this.parse=function(b,f,g){if(!angular.isString(b)||!f)return b;f=a.DATETIME_FORMATS[f]||f,f=f.replace(e,"\\$&"),this.parsers[f]||(this.parsers[f]=c(f));var h=this.parsers[f],i=h.regex,j=h.map,k=b.match(i);if(k&&k.length){var l,m;l=g?{year:g.getFullYear(),month:g.getMonth(),date:g.getDate(),hours:g.getHours(),minutes:g.getMinutes(),seconds:g.getSeconds(),milliseconds:g.getMilliseconds()}:{year:1900,month:0,date:1,hours:0,minutes:0,seconds:0,milliseconds:0};for(var n=1,o=k.length;o>n;n++){var p=j[n-1];p.apply&&p.apply.call(l,k[n])}return d(l.year,l.month,l.date)&&(m=new Date(l.year,l.month,l.date,l.hours,l.minutes,l.seconds,l.milliseconds||0)),m}}}]),angular.module("ui.bootstrap.position",[]).factory("$position",["$document","$window",function(a,b){function c(a,c){return a.currentStyle?a.currentStyle[c]:b.getComputedStyle?b.getComputedStyle(a)[c]:a.style[c]}function d(a){return"static"===(c(a,"position")||"static")}var e=function(b){for(var c=a[0],e=b.offsetParent||c;e&&e!==c&&d(e);)e=e.offsetParent;return e||c};return{position:function(b){var c=this.offset(b),d={top:0,left:0},f=e(b[0]);f!=a[0]&&(d=this.offset(angular.element(f)),d.top+=f.clientTop-f.scrollTop,d.left+=f.clientLeft-f.scrollLeft);var g=b[0].getBoundingClientRect();return{width:g.width||b.prop("offsetWidth"),height:g.height||b.prop("offsetHeight"),top:c.top-d.top,left:c.left-d.left}},offset:function(c){var d=c[0].getBoundingClientRect();return{width:d.width||c.prop("offsetWidth"),height:d.height||c.prop("offsetHeight"),top:d.top+(b.pageYOffset||a[0].documentElement.scrollTop),left:d.left+(b.pageXOffset||a[0].documentElement.scrollLeft)}},positionElements:function(a,b,c,d){var e,f,g,h,i=c.split("-"),j=i[0],k=i[1]||"center";e=d?this.offset(a):this.position(a),f=b.prop("offsetWidth"),g=b.prop("offsetHeight");var l={center:function(){return e.left+e.width/2-f/2},left:function(){return e.left},right:function(){return e.left+e.width}},m={center:function(){return e.top+e.height/2-g/2},top:function(){return e.top},bottom:function(){return e.top+e.height}};switch(j){case"right":h={top:m[k](),left:l[j]()};break;case"left":h={top:m[k](),left:e.left-f};break;case"bottom":h={top:m[j](),left:l[k]()};break;default:h={top:e.top-g,left:l[k]()}}return h}}}]),angular.module("ui.bootstrap.datepicker",["ui.bootstrap.dateparser","ui.bootstrap.position"]).constant("datepickerConfig",{formatDay:"dd",formatMonth:"MMMM",formatYear:"yyyy",formatDayHeader:"EEE",formatDayTitle:"MMMM yyyy",formatMonthTitle:"yyyy",datepickerMode:"day",minMode:"day",maxMode:"year",showWeeks:!0,startingDay:0,yearRange:20,minDate:null,maxDate:null,shortcutPropagation:!1}).controller("DatepickerController",["$scope","$attrs","$parse","$interpolate","$timeout","$log","dateFilter","datepickerConfig",function(a,b,c,d,e,f,g,h){var i=this,j={$setViewValue:angular.noop};this.modes=["day","month","year"],angular.forEach(["formatDay","formatMonth","formatYear","formatDayHeader","formatDayTitle","formatMonthTitle","minMode","maxMode","showWeeks","startingDay","yearRange","shortcutPropagation"],function(c,e){i[c]=angular.isDefined(b[c])?8>e?d(b[c])(a.$parent):a.$parent.$eval(b[c]):h[c]}),angular.forEach(["minDate","maxDate"],function(d){b[d]?a.$parent.$watch(c(b[d]),function(a){i[d]=a?new Date(a):null,i.refreshView()}):i[d]=h[d]?new Date(h[d]):null}),a.datepickerMode=a.datepickerMode||h.datepickerMode,a.maxMode=i.maxMode,a.uniqueId="datepicker-"+a.$id+"-"+Math.floor(1e4*Math.random()),angular.isDefined(b.initDate)?(this.activeDate=a.$parent.$eval(b.initDate)||new Date,a.$parent.$watch(b.initDate,function(a){a&&(j.$isEmpty(j.$modelValue)||j.$invalid)&&(i.activeDate=a,i.refreshView())})):this.activeDate=new Date,a.isActive=function(b){return 0===i.compare(b.date,i.activeDate)?(a.activeDateId=b.uid,!0):!1},this.init=function(a){j=a,j.$render=function(){i.render()}},this.render=function(){if(j.$viewValue){var a=new Date(j.$viewValue),b=!isNaN(a);b?this.activeDate=a:f.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.'),j.$setValidity("date",b)}this.refreshView()},this.refreshView=function(){if(this.element){this._refreshView();var a=j.$viewValue?new Date(j.$viewValue):null;j.$setValidity("date-disabled",!a||this.element&&!this.isDisabled(a))}},this.createDateObject=function(a,b){var c=j.$viewValue?new Date(j.$viewValue):null;return{date:a,label:g(a,b),selected:c&&0===this.compare(a,c),disabled:this.isDisabled(a),current:0===this.compare(a,new Date),customClass:this.customClass(a)}},this.isDisabled=function(c){return this.minDate&&this.compare(c,this.minDate)<0||this.maxDate&&this.compare(c,this.maxDate)>0||b.dateDisabled&&a.dateDisabled({date:c,mode:a.datepickerMode})},this.customClass=function(b){return a.customClass({date:b,mode:a.datepickerMode})},this.split=function(a,b){for(var c=[];a.length>0;)c.push(a.splice(0,b));return c},a.select=function(b){if(a.datepickerMode===i.minMode){var c=j.$viewValue?new Date(j.$viewValue):new Date(0,0,0,0,0,0,0);c.setFullYear(b.getFullYear(),b.getMonth(),b.getDate()),j.$setViewValue(c),j.$render()}else i.activeDate=b,a.datepickerMode=i.modes[i.modes.indexOf(a.datepickerMode)-1]},a.move=function(a){var b=i.activeDate.getFullYear()+a*(i.step.years||0),c=i.activeDate.getMonth()+a*(i.step.months||0);i.activeDate.setFullYear(b,c,1),i.refreshView()},a.toggleMode=function(b){b=b||1,a.datepickerMode===i.maxMode&&1===b||a.datepickerMode===i.minMode&&-1===b||(a.datepickerMode=i.modes[i.modes.indexOf(a.datepickerMode)+b])},a.keys={13:"enter",32:"space",33:"pageup",34:"pagedown",35:"end",36:"home",37:"left",38:"up",39:"right",40:"down"};var k=function(){e(function(){i.element[0].focus()},0,!1)};a.$on("datepicker.focus",k),a.keydown=function(b){var c=a.keys[b.which];if(c&&!b.shiftKey&&!b.altKey)if(b.preventDefault(),i.shortcutPropagation||b.stopPropagation(),"enter"===c||"space"===c){if(i.isDisabled(i.activeDate))return;a.select(i.activeDate),k()}else!b.ctrlKey||"up"!==c&&"down"!==c?(i.handleKeyDown(c,b),i.refreshView()):(a.toggleMode("up"===c?1:-1),k())}}]).directive("datepicker",function(){return{restrict:"EA",replace:!0,templateUrl:"template/datepicker/datepicker.html",scope:{datepickerMode:"=?",dateDisabled:"&",customClass:"&",shortcutPropagation:"&?"},require:["datepicker","?^ngModel"],controller:"DatepickerController",link:function(a,b,c,d){var e=d[0],f=d[1];f&&e.init(f)}}}).directive("daypicker",["dateFilter",function(a){return{restrict:"EA",replace:!0,templateUrl:"template/datepicker/day.html",require:"^datepicker",link:function(b,c,d,e){function f(a,b){return 1!==b||a%4!==0||a%100===0&&a%400!==0?i[b]:29}function g(a,b){var c=new Array(b),d=new Date(a),e=0;for(d.setHours(12);b>e;)c[e++]=new Date(d),d.setDate(d.getDate()+1);return c}function h(a){var b=new Date(a);b.setDate(b.getDate()+4-(b.getDay()||7));var c=b.getTime();return b.setMonth(0),b.setDate(1),Math.floor(Math.round((c-b)/864e5)/7)+1}b.showWeeks=e.showWeeks,e.step={months:1},e.element=c;var i=[31,28,31,30,31,30,31,31,30,31,30,31];e._refreshView=function(){var c=e.activeDate.getFullYear(),d=e.activeDate.getMonth(),f=new Date(c,d,1),i=e.startingDay-f.getDay(),j=i>0?7-i:-i,k=new Date(f);j>0&&k.setDate(-j+1);for(var l=g(k,42),m=0;42>m;m++)l[m]=angular.extend(e.createDateObject(l[m],e.formatDay),{secondary:l[m].getMonth()!==d,uid:b.uniqueId+"-"+m});b.labels=new Array(7);for(var n=0;7>n;n++)b.labels[n]={abbr:a(l[n].date,e.formatDayHeader),full:a(l[n].date,"EEEE")};if(b.title=a(e.activeDate,e.formatDayTitle),b.rows=e.split(l,7),b.showWeeks){b.weekNumbers=[];for(var o=(11-e.startingDay)%7,p=b.rows.length,q=0;p>q;q++)b.weekNumbers.push(h(b.rows[q][o].date))}},e.compare=function(a,b){return new Date(a.getFullYear(),a.getMonth(),a.getDate())-new Date(b.getFullYear(),b.getMonth(),b.getDate())},e.handleKeyDown=function(a){var b=e.activeDate.getDate();if("left"===a)b-=1;else if("up"===a)b-=7;else if("right"===a)b+=1;else if("down"===a)b+=7;else if("pageup"===a||"pagedown"===a){var c=e.activeDate.getMonth()+("pageup"===a?-1:1);e.activeDate.setMonth(c,1),b=Math.min(f(e.activeDate.getFullYear(),e.activeDate.getMonth()),b)}else"home"===a?b=1:"end"===a&&(b=f(e.activeDate.getFullYear(),e.activeDate.getMonth()));e.activeDate.setDate(b)},e.refreshView()}}}]).directive("monthpicker",["dateFilter",function(a){return{restrict:"EA",replace:!0,templateUrl:"template/datepicker/month.html",require:"^datepicker",link:function(b,c,d,e){e.step={years:1},e.element=c,e._refreshView=function(){for(var c=new Array(12),d=e.activeDate.getFullYear(),f=0;12>f;f++)c[f]=angular.extend(e.createDateObject(new Date(d,f,1),e.formatMonth),{uid:b.uniqueId+"-"+f});b.title=a(e.activeDate,e.formatMonthTitle),b.rows=e.split(c,3)},e.compare=function(a,b){return new Date(a.getFullYear(),a.getMonth())-new Date(b.getFullYear(),b.getMonth())},e.handleKeyDown=function(a){var b=e.activeDate.getMonth();if("left"===a)b-=1;else if("up"===a)b-=3;else if("right"===a)b+=1;else if("down"===a)b+=3;else if("pageup"===a||"pagedown"===a){var c=e.activeDate.getFullYear()+("pageup"===a?-1:1);e.activeDate.setFullYear(c)}else"home"===a?b=0:"end"===a&&(b=11);e.activeDate.setMonth(b)},e.refreshView()}}}]).directive("yearpicker",["dateFilter",function(){return{restrict:"EA",replace:!0,templateUrl:"template/datepicker/year.html",require:"^datepicker",link:function(a,b,c,d){function e(a){return parseInt((a-1)/f,10)*f+1}var f=d.yearRange;d.step={years:f},d.element=b,d._refreshView=function(){for(var b=new Array(f),c=0,g=e(d.activeDate.getFullYear());f>c;c++)b[c]=angular.extend(d.createDateObject(new Date(g+c,0,1),d.formatYear),{uid:a.uniqueId+"-"+c});a.title=[b[0].label,b[f-1].label].join(" - "),a.rows=d.split(b,5)},d.compare=function(a,b){return a.getFullYear()-b.getFullYear()},d.handleKeyDown=function(a){var b=d.activeDate.getFullYear();"left"===a?b-=1:"up"===a?b-=5:"right"===a?b+=1:"down"===a?b+=5:"pageup"===a||"pagedown"===a?b+=("pageup"===a?-1:1)*d.step.years:"home"===a?b=e(d.activeDate.getFullYear()):"end"===a&&(b=e(d.activeDate.getFullYear())+f-1),d.activeDate.setFullYear(b)},d.refreshView()}}}]).constant("datepickerPopupConfig",{datepickerPopup:"yyyy-MM-dd",html5Types:{date:"yyyy-MM-dd","datetime-local":"yyyy-MM-ddTHH:mm:ss.sss",month:"yyyy-MM"},currentText:"Today",clearText:"Clear",closeText:"Done",closeOnDateSelection:!0,appendToBody:!1,showButtonBar:!0}).directive("datepickerPopup",["$compile","$parse","$document","$position","dateFilter","dateParser","datepickerPopupConfig",function(a,b,c,d,e,f,g){return{restrict:"EA",require:"ngModel",scope:{isOpen:"=?",currentText:"@",clearText:"@",closeText:"@",dateDisabled:"&",customClass:"&"},link:function(h,i,j,k){function l(a){return a.replace(/([A-Z])/g,function(a){return"-"+a.toLowerCase()})}function m(a){if(angular.isNumber(a)&&(a=new Date(a)),a){if(angular.isDate(a)&&!isNaN(a))return a;if(angular.isString(a)){var b=f.parse(a,o,h.date)||new Date(a);return isNaN(b)?void 0:b}return void 0}return null}function n(a,b){var c=a||b;if(angular.isNumber(c)&&(c=new Date(c)),c){if(angular.isDate(c)&&!isNaN(c))return!0;if(angular.isString(c)){var d=f.parse(c,o)||new Date(c);return!isNaN(d)}return!1}return!0}var o,p=angular.isDefined(j.closeOnDateSelection)?h.$parent.$eval(j.closeOnDateSelection):g.closeOnDateSelection,q=angular.isDefined(j.datepickerAppendToBody)?h.$parent.$eval(j.datepickerAppendToBody):g.appendToBody;h.showButtonBar=angular.isDefined(j.showButtonBar)?h.$parent.$eval(j.showButtonBar):g.showButtonBar,h.getText=function(a){return h[a+"Text"]||g[a+"Text"]};var r=!1;if(g.html5Types[j.type]?(o=g.html5Types[j.type],r=!0):(o=j.datepickerPopup||g.datepickerPopup,j.$observe("datepickerPopup",function(a){var b=a||g.datepickerPopup;if(b!==o&&(o=b,k.$modelValue=null,!o))throw new Error("datepickerPopup must have a date format specified.")})),!o)throw new Error("datepickerPopup must have a date format specified.");if(r&&j.datepickerPopup)throw new Error("HTML5 date input types do not support custom formats.");var s=angular.element("<div datepicker-popup-wrap><div datepicker></div></div>");s.attr({"ng-model":"date","ng-change":"dateSelection()"});var t=angular.element(s.children()[0]);if(r&&"month"==j.type&&(t.attr("datepicker-mode",'"month"'),t.attr("min-mode","month")),j.datepickerOptions){var u=h.$parent.$eval(j.datepickerOptions);u.initDate&&(h.initDate=u.initDate,t.attr("init-date","initDate"),delete u.initDate),angular.forEach(u,function(a,b){t.attr(l(b),a)})}h.watchData={},angular.forEach(["minDate","maxDate","datepickerMode","initDate","shortcutPropagation"],function(a){if(j[a]){var c=b(j[a]);if(h.$parent.$watch(c,function(b){h.watchData[a]=b}),t.attr(l(a),"watchData."+a),"datepickerMode"===a){var d=c.assign;h.$watch("watchData."+a,function(a,b){a!==b&&d(h.$parent,a)})}}}),j.dateDisabled&&t.attr("date-disabled","dateDisabled({ date: date, mode: mode })"),j.showWeeks&&t.attr("show-weeks",j.showWeeks),j.customClass&&t.attr("custom-class","customClass({ date: date, mode: mode })"),r?k.$formatters.push(function(a){return h.date=a,a}):(k.$$parserName="date",k.$validators.date=n,k.$parsers.unshift(m),k.$formatters.push(function(a){return h.date=a,k.$isEmpty(a)?a:e(a,o)})),h.dateSelection=function(a){angular.isDefined(a)&&(h.date=a);var b=h.date?e(h.date,o):"";i.val(b),k.$setViewValue(b),p&&(h.isOpen=!1,i[0].focus())},k.$viewChangeListeners.push(function(){h.date=f.parse(k.$viewValue,o,h.date)||new Date(k.$viewValue)});var v=function(a){h.isOpen&&a.target!==i[0]&&h.$apply(function(){h.isOpen=!1})},w=function(a){h.keydown(a)};i.bind("keydown",w),h.keydown=function(a){27===a.which?(a.preventDefault(),h.isOpen&&a.stopPropagation(),h.close()):40!==a.which||h.isOpen||(h.isOpen=!0)},h.$watch("isOpen",function(a){a?(h.$broadcast("datepicker.focus"),h.position=q?d.offset(i):d.position(i),h.position.top=h.position.top+i.prop("offsetHeight"),c.bind("click",v)):c.unbind("click",v)}),h.select=function(a){if("today"===a){var b=new Date;angular.isDate(h.date)?(a=new Date(h.date),a.setFullYear(b.getFullYear(),b.getMonth(),b.getDate())):a=new Date(b.setHours(0,0,0,0))}h.dateSelection(a)},h.close=function(){h.isOpen=!1,i[0].focus()};var x=a(s)(h);s.remove(),q?c.find("body").append(x):i.after(x),h.$on("$destroy",function(){x.remove(),i.unbind("keydown",w),c.unbind("click",v)})}}}]).directive("datepickerPopupWrap",function(){return{restrict:"EA",replace:!0,transclude:!0,templateUrl:"template/datepicker/popup.html",link:function(a,b){b.bind("click",function(a){a.preventDefault(),a.stopPropagation()})}}}),angular.module("ui.bootstrap.dropdown",["ui.bootstrap.position"]).constant("dropdownConfig",{openClass:"open"}).service("dropdownService",["$document","$rootScope",function(a,b){var c=null;this.open=function(b){c||(a.bind("click",d),a.bind("keydown",e)),c&&c!==b&&(c.isOpen=!1),c=b},this.close=function(b){c===b&&(c=null,a.unbind("click",d),a.unbind("keydown",e))};var d=function(a){if(c&&(!a||"disabled"!==c.getAutoClose())){var d=c.getToggleElement();if(!(a&&d&&d[0].contains(a.target))){var e=c.getElement();a&&"outsideClick"===c.getAutoClose()&&e&&e[0].contains(a.target)||(c.isOpen=!1,b.$$phase||c.$apply())}}},e=function(a){27===a.which&&(c.focusToggleElement(),d())}}]).controller("DropdownController",["$scope","$attrs","$parse","dropdownConfig","dropdownService","$animate","$position","$document",function(a,b,c,d,e,f,g,h){var i,j=this,k=a.$new(),l=d.openClass,m=angular.noop,n=b.onToggle?c(b.onToggle):angular.noop,o=!1;this.init=function(d){j.$element=d,b.isOpen&&(i=c(b.isOpen),m=i.assign,a.$watch(i,function(a){k.isOpen=!!a})),o=angular.isDefined(b.dropdownAppendToBody),o&&j.dropdownMenu&&(h.find("body").append(j.dropdownMenu),d.on("$destroy",function(){j.dropdownMenu.remove()}))},this.toggle=function(a){return k.isOpen=arguments.length?!!a:!k.isOpen},this.isOpen=function(){return k.isOpen},k.getToggleElement=function(){return j.toggleElement},k.getAutoClose=function(){return b.autoClose||"always"},k.getElement=function(){return j.$element},k.focusToggleElement=function(){j.toggleElement&&j.toggleElement[0].focus()},k.$watch("isOpen",function(b,c){if(o&&j.dropdownMenu){var d=g.positionElements(j.$element,j.dropdownMenu,"bottom-left",!0);j.dropdownMenu.css({top:d.top+"px",left:d.left+"px",display:b?"block":"none"})}f[b?"addClass":"removeClass"](j.$element,l),b?(k.focusToggleElement(),e.open(k)):e.close(k),m(a,b),angular.isDefined(b)&&b!==c&&n(a,{open:!!b})}),a.$on("$locationChangeSuccess",function(){k.isOpen=!1}),a.$on("$destroy",function(){k.$destroy()})}]).directive("dropdown",function(){return{controller:"DropdownController",link:function(a,b,c,d){d.init(b)}}}).directive("dropdownMenu",function(){return{restrict:"AC",require:"?^dropdown",link:function(a,b,c,d){d&&(d.dropdownMenu=b)}}}).directive("dropdownToggle",function(){return{require:"?^dropdown",link:function(a,b,c,d){if(d){d.toggleElement=b;var e=function(e){e.preventDefault(),b.hasClass("disabled")||c.disabled||a.$apply(function(){d.toggle()})};b.bind("click",e),b.attr({"aria-haspopup":!0,"aria-expanded":!1}),a.$watch(d.isOpen,function(a){b.attr("aria-expanded",!!a)}),a.$on("$destroy",function(){b.unbind("click",e)})}}}}),angular.module("ui.bootstrap.modal",[]).factory("$$stackedMap",function(){return{createNew:function(){var a=[];return{add:function(b,c){a.push({key:b,value:c})},get:function(b){for(var c=0;c<a.length;c++)if(b==a[c].key)return a[c]},keys:function(){for(var b=[],c=0;c<a.length;c++)b.push(a[c].key);return b},top:function(){return a[a.length-1]},remove:function(b){for(var c=-1,d=0;d<a.length;d++)if(b==a[d].key){c=d;break}return a.splice(c,1)[0]},removeTop:function(){return a.splice(a.length-1,1)[0]},length:function(){return a.length}}}}}).directive("modalBackdrop",["$timeout",function(a){function b(b){b.animate=!1,a(function(){b.animate=!0})}return{restrict:"EA",replace:!0,templateUrl:"template/modal/backdrop.html",compile:function(a,c){return a.addClass(c.backdropClass),b}}}]).directive("modalWindow",["$modalStack","$q",function(a,b){return{restrict:"EA",scope:{index:"@",animate:"="},replace:!0,transclude:!0,templateUrl:function(a,b){return b.templateUrl||"template/modal/window.html"},link:function(c,d,e){d.addClass(e.windowClass||""),c.size=e.size,c.close=function(b){var c=a.getTop();c&&c.value.backdrop&&"static"!=c.value.backdrop&&b.target===b.currentTarget&&(b.preventDefault(),b.stopPropagation(),a.dismiss(c.key,"backdrop click"))},c.$isRendered=!0;var f=b.defer();e.$observe("modalRender",function(a){"true"==a&&f.resolve()}),f.promise.then(function(){c.animate=!0;var b=d[0].querySelectorAll("[autofocus]");b.length?b[0].focus():d[0].focus();var e=a.getTop();e&&a.modalRendered(e.key)})}}}]).directive("modalAnimationClass",[function(){return{compile:function(a,b){b.modalAnimation&&a.addClass(b.modalAnimationClass)}}}]).directive("modalTransclude",function(){return{link:function(a,b,c,d,e){e(a.$parent,function(a){b.empty(),b.append(a)})}}}).factory("$modalStack",["$animate","$timeout","$document","$compile","$rootScope","$$stackedMap",function(a,b,c,d,e,f){function g(){for(var a=-1,b=o.keys(),c=0;c<b.length;c++)o.get(b[c]).value.backdrop&&(a=c);return a}function h(a){var b=c.find("body").eq(0),d=o.get(a).value;o.remove(a),j(d.modalDomEl,d.modalScope,function(){b.toggleClass(n,o.length()>0),i()})}function i(){if(l&&-1==g()){var a=m;j(l,m,function(){a=null}),l=void 0,m=void 0}}function j(c,d,f){function g(){g.done||(g.done=!0,c.remove(),d.$destroy(),f&&f())}d.animate=!1,c.attr("modal-animation")&&a.enabled()?c.one("$animate:close",function(){e.$evalAsync(g)}):b(g)}function k(a,b,c){return!a.value.modalScope.$broadcast("modal.closing",b,c).defaultPrevented}var l,m,n="modal-open",o=f.createNew(),p={};return e.$watch(g,function(a){m&&(m.index=a)}),c.bind("keydown",function(a){var b;27===a.which&&(b=o.top(),b&&b.value.keyboard&&(a.preventDefault(),e.$apply(function(){p.dismiss(b.key,"escape key press")})))}),p.open=function(a,b){var f=c[0].activeElement;o.add(a,{deferred:b.deferred,renderDeferred:b.renderDeferred,modalScope:b.scope,backdrop:b.backdrop,keyboard:b.keyboard});var h=c.find("body").eq(0),i=g();if(i>=0&&!l){m=e.$new(!0),m.index=i;var j=angular.element('<div modal-backdrop="modal-backdrop"></div>');j.attr("backdrop-class",b.backdropClass),b.animation&&j.attr("modal-animation","true"),l=d(j)(m),h.append(l)}var k=angular.element('<div modal-window="modal-window"></div>');k.attr({"template-url":b.windowTemplateUrl,"window-class":b.windowClass,size:b.size,index:o.length()-1,animate:"animate"}).html(b.content),b.animation&&k.attr("modal-animation","true");var p=d(k)(b.scope);o.top().value.modalDomEl=p,o.top().value.modalOpener=f,h.append(p),h.addClass(n)},p.close=function(a,b){var c=o.get(a);return c&&k(c,b,!0)?(c.value.deferred.resolve(b),h(a),c.value.modalOpener.focus(),!0):!c},p.dismiss=function(a,b){var c=o.get(a);return c&&k(c,b,!1)?(c.value.deferred.reject(b),h(a),c.value.modalOpener.focus(),!0):!c},p.dismissAll=function(a){for(var b=this.getTop();b&&this.dismiss(b.key,a);)b=this.getTop()},p.getTop=function(){return o.top()},p.modalRendered=function(a){var b=o.get(a);b&&b.value.renderDeferred.resolve()},p}]).provider("$modal",function(){var a={options:{animation:!0,backdrop:!0,keyboard:!0},$get:["$injector","$rootScope","$q","$templateRequest","$controller","$modalStack",function(b,c,d,e,f,g){function h(a){return a.template?d.when(a.template):e(angular.isFunction(a.templateUrl)?a.templateUrl():a.templateUrl)}function i(a){var c=[];return angular.forEach(a,function(a){(angular.isFunction(a)||angular.isArray(a))&&c.push(d.when(b.invoke(a)))
}),c}var j={};return j.open=function(b){var e=d.defer(),j=d.defer(),k=d.defer(),l={result:e.promise,opened:j.promise,rendered:k.promise,close:function(a){return g.close(l,a)},dismiss:function(a){return g.dismiss(l,a)}};if(b=angular.extend({},a.options,b),b.resolve=b.resolve||{},!b.template&&!b.templateUrl)throw new Error("One of template or templateUrl options is required.");var m=d.all([h(b)].concat(i(b.resolve)));return m.then(function(a){var d=(b.scope||c).$new();d.$close=l.close,d.$dismiss=l.dismiss;var h,i={},j=1;b.controller&&(i.$scope=d,i.$modalInstance=l,angular.forEach(b.resolve,function(b,c){i[c]=a[j++]}),h=f(b.controller,i),b.controllerAs&&(d[b.controllerAs]=h)),g.open(l,{scope:d,deferred:e,renderDeferred:k,content:a[0],animation:b.animation,backdrop:b.backdrop,keyboard:b.keyboard,backdropClass:b.backdropClass,windowClass:b.windowClass,windowTemplateUrl:b.windowTemplateUrl,size:b.size})},function(a){e.reject(a)}),m.then(function(){j.resolve(!0)},function(a){j.reject(a)}),l},j}]};return a}),angular.module("ui.bootstrap.pagination",[]).controller("PaginationController",["$scope","$attrs","$parse",function(a,b,c){var d=this,e={$setViewValue:angular.noop},f=b.numPages?c(b.numPages).assign:angular.noop;this.init=function(g,h){e=g,this.config=h,e.$render=function(){d.render()},b.itemsPerPage?a.$parent.$watch(c(b.itemsPerPage),function(b){d.itemsPerPage=parseInt(b,10),a.totalPages=d.calculateTotalPages()}):this.itemsPerPage=h.itemsPerPage,a.$watch("totalItems",function(){a.totalPages=d.calculateTotalPages()}),a.$watch("totalPages",function(b){f(a.$parent,b),a.page>b?a.selectPage(b):e.$render()})},this.calculateTotalPages=function(){var b=this.itemsPerPage<1?1:Math.ceil(a.totalItems/this.itemsPerPage);return Math.max(b||0,1)},this.render=function(){a.page=parseInt(e.$viewValue,10)||1},a.selectPage=function(b,c){a.page!==b&&b>0&&b<=a.totalPages&&(c&&c.target&&c.target.blur(),e.$setViewValue(b),e.$render())},a.getText=function(b){return a[b+"Text"]||d.config[b+"Text"]},a.noPrevious=function(){return 1===a.page},a.noNext=function(){return a.page===a.totalPages}}]).constant("paginationConfig",{itemsPerPage:10,boundaryLinks:!1,directionLinks:!0,firstText:"First",previousText:"Previous",nextText:"Next",lastText:"Last",rotate:!0}).directive("pagination",["$parse","paginationConfig",function(a,b){return{restrict:"EA",scope:{totalItems:"=",firstText:"@",previousText:"@",nextText:"@",lastText:"@"},require:["pagination","?ngModel"],controller:"PaginationController",templateUrl:"template/pagination/pagination.html",replace:!0,link:function(c,d,e,f){function g(a,b,c){return{number:a,text:b,active:c}}function h(a,b){var c=[],d=1,e=b,f=angular.isDefined(k)&&b>k;f&&(l?(d=Math.max(a-Math.floor(k/2),1),e=d+k-1,e>b&&(e=b,d=e-k+1)):(d=(Math.ceil(a/k)-1)*k+1,e=Math.min(d+k-1,b)));for(var h=d;e>=h;h++){var i=g(h,h,h===a);c.push(i)}if(f&&!l){if(d>1){var j=g(d-1,"...",!1);c.unshift(j)}if(b>e){var m=g(e+1,"...",!1);c.push(m)}}return c}var i=f[0],j=f[1];if(j){var k=angular.isDefined(e.maxSize)?c.$parent.$eval(e.maxSize):b.maxSize,l=angular.isDefined(e.rotate)?c.$parent.$eval(e.rotate):b.rotate;c.boundaryLinks=angular.isDefined(e.boundaryLinks)?c.$parent.$eval(e.boundaryLinks):b.boundaryLinks,c.directionLinks=angular.isDefined(e.directionLinks)?c.$parent.$eval(e.directionLinks):b.directionLinks,i.init(j,b),e.maxSize&&c.$parent.$watch(a(e.maxSize),function(a){k=parseInt(a,10),i.render()});var m=i.render;i.render=function(){m(),c.page>0&&c.page<=c.totalPages&&(c.pages=h(c.page,c.totalPages))}}}}}]).constant("pagerConfig",{itemsPerPage:10,previousText:"« Previous",nextText:"Next »",align:!0}).directive("pager",["pagerConfig",function(a){return{restrict:"EA",scope:{totalItems:"=",previousText:"@",nextText:"@"},require:["pager","?ngModel"],controller:"PaginationController",templateUrl:"template/pagination/pager.html",replace:!0,link:function(b,c,d,e){var f=e[0],g=e[1];g&&(b.align=angular.isDefined(d.align)?b.$parent.$eval(d.align):a.align,f.init(g,a))}}}]),angular.module("ui.bootstrap.tooltip",["ui.bootstrap.position","ui.bootstrap.bindHtml"]).provider("$tooltip",function(){function a(a){var b=/[A-Z]/g,c="-";return a.replace(b,function(a,b){return(b?c:"")+a.toLowerCase()})}var b={placement:"top",animation:!0,popupDelay:0,useContentExp:!1},c={mouseenter:"mouseleave",click:"click",focus:"blur"},d={};this.options=function(a){angular.extend(d,a)},this.setTriggers=function(a){angular.extend(c,a)},this.$get=["$window","$compile","$timeout","$document","$position","$interpolate",function(e,f,g,h,i,j){return function(e,k,l,m){function n(a){var b=a||m.trigger||l,d=c[b]||b;return{show:b,hide:d}}m=angular.extend({},b,d,m);var o=a(e),p=j.startSymbol(),q=j.endSymbol(),r="<div "+o+'-popup title="'+p+"title"+q+'" '+(m.useContentExp?'content-exp="contentExp()" ':'content="'+p+"content"+q+'" ')+'placement="'+p+"placement"+q+'" popup-class="'+p+"popupClass"+q+'" animation="animation" is-open="isOpen"origin-scope="origScope" ></div>';return{restrict:"EA",compile:function(){var a=f(r);return function(b,c,d){function f(){E.isOpen?l():j()}function j(){(!D||b.$eval(d[k+"Enable"]))&&(s(),E.popupDelay?A||(A=g(o,E.popupDelay,!1),A.then(function(a){a()})):o()())}function l(){b.$apply(function(){p()})}function o(){return A=null,z&&(g.cancel(z),z=null),(m.useContentExp?E.contentExp():E.content)?(q(),x.css({top:0,left:0,display:"block"}),E.$digest(),F(),E.isOpen=!0,E.$apply(),F):angular.noop}function p(){E.isOpen=!1,g.cancel(A),A=null,E.animation?z||(z=g(r,500)):r()}function q(){x&&r(),y=E.$new(),x=a(y,function(a){B?h.find("body").append(a):c.after(a)}),y.$watch(function(){g(F,0,!1)}),m.useContentExp&&y.$watch("contentExp()",function(a){!a&&E.isOpen&&p()})}function r(){z=null,x&&(x.remove(),x=null),y&&(y.$destroy(),y=null)}function s(){t(),u(),v()}function t(){E.popupClass=d[k+"Class"]}function u(){var a=d[k+"Placement"];E.placement=angular.isDefined(a)?a:m.placement}function v(){var a=d[k+"PopupDelay"],b=parseInt(a,10);E.popupDelay=isNaN(b)?m.popupDelay:b}function w(){var a=d[k+"Trigger"];G(),C=n(a),C.show===C.hide?c.bind(C.show,f):(c.bind(C.show,j),c.bind(C.hide,l))}var x,y,z,A,B=angular.isDefined(m.appendToBody)?m.appendToBody:!1,C=n(void 0),D=angular.isDefined(d[k+"Enable"]),E=b.$new(!0),F=function(){if(x){var a=i.positionElements(c,x,E.placement,B);a.top+="px",a.left+="px",x.css(a)}};E.origScope=b,E.isOpen=!1,E.contentExp=function(){return b.$eval(d[e])},m.useContentExp||d.$observe(e,function(a){E.content=a,!a&&E.isOpen&&p()}),d.$observe("disabled",function(a){a&&E.isOpen&&p()}),d.$observe(k+"Title",function(a){E.title=a});var G=function(){c.unbind(C.show,j),c.unbind(C.hide,l)};w();var H=b.$eval(d[k+"Animation"]);E.animation=angular.isDefined(H)?!!H:m.animation;var I=b.$eval(d[k+"AppendToBody"]);B=angular.isDefined(I)?I:B,B&&b.$on("$locationChangeSuccess",function(){E.isOpen&&p()}),b.$on("$destroy",function(){g.cancel(z),g.cancel(A),G(),r(),E=null})}}}}}]}).directive("tooltipTemplateTransclude",["$animate","$sce","$compile","$templateRequest",function(a,b,c,d){return{link:function(e,f,g){var h,i,j,k=e.$eval(g.tooltipTemplateTranscludeScope),l=0,m=function(){i&&(i.remove(),i=null),h&&(h.$destroy(),h=null),j&&(a.leave(j).then(function(){i=null}),i=j,j=null)};e.$watch(b.parseAsResourceUrl(g.tooltipTemplateTransclude),function(b){var g=++l;b?(d(b,!0).then(function(d){if(g===l){var e=k.$new(),i=d,n=c(i)(e,function(b){m(),a.enter(b,f)});h=e,j=n,h.$emit("$includeContentLoaded",b)}},function(){g===l&&(m(),e.$emit("$includeContentError",b))}),e.$emit("$includeContentRequested",b)):m()}),e.$on("$destroy",m)}}}]).directive("tooltipClasses",function(){return{restrict:"A",link:function(a,b,c){a.placement&&b.addClass(a.placement),a.popupClass&&b.addClass(a.popupClass),a.animation()&&b.addClass(c.tooltipAnimationClass)}}}).directive("tooltipPopup",function(){return{restrict:"EA",replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-popup.html"}}).directive("tooltip",["$tooltip",function(a){return a("tooltip","tooltip","mouseenter")}]).directive("tooltipTemplatePopup",function(){return{restrict:"EA",replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/tooltip/tooltip-template-popup.html"}}).directive("tooltipTemplate",["$tooltip",function(a){return a("tooltipTemplate","tooltip","mouseenter",{useContentExp:!0})}]).directive("tooltipHtmlPopup",function(){return{restrict:"EA",replace:!0,scope:{contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-html-popup.html"}}).directive("tooltipHtml",["$tooltip",function(a){return a("tooltipHtml","tooltip","mouseenter",{useContentExp:!0})}]).directive("tooltipHtmlUnsafePopup",function(){return{restrict:"EA",replace:!0,scope:{content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/tooltip/tooltip-html-unsafe-popup.html"}}).value("tooltipHtmlUnsafeSuppressDeprecated",!1).directive("tooltipHtmlUnsafe",["$tooltip","tooltipHtmlUnsafeSuppressDeprecated","$log",function(a,b,c){return b||c.warn("tooltip-html-unsafe is now deprecated. Use tooltip-html or tooltip-template instead."),a("tooltipHtmlUnsafe","tooltip","mouseenter")}]),angular.module("ui.bootstrap.popover",["ui.bootstrap.tooltip"]).directive("popoverTemplatePopup",function(){return{restrict:"EA",replace:!0,scope:{title:"@",contentExp:"&",placement:"@",popupClass:"@",animation:"&",isOpen:"&",originScope:"&"},templateUrl:"template/popover/popover-template.html"}}).directive("popoverTemplate",["$tooltip",function(a){return a("popoverTemplate","popover","click",{useContentExp:!0})}]).directive("popoverPopup",function(){return{restrict:"EA",replace:!0,scope:{title:"@",content:"@",placement:"@",popupClass:"@",animation:"&",isOpen:"&"},templateUrl:"template/popover/popover.html"}}).directive("popover",["$tooltip",function(a){return a("popover","popover","click")}]),angular.module("ui.bootstrap.progressbar",[]).constant("progressConfig",{animate:!0,max:100}).controller("ProgressController",["$scope","$attrs","progressConfig",function(a,b,c){var d=this,e=angular.isDefined(b.animate)?a.$parent.$eval(b.animate):c.animate;this.bars=[],a.max=angular.isDefined(a.max)?a.max:c.max,this.addBar=function(b,c){e||c.css({transition:"none"}),this.bars.push(b),b.$watch("value",function(c){b.percent=+(100*c/a.max).toFixed(2)}),b.$on("$destroy",function(){c=null,d.removeBar(b)})},this.removeBar=function(a){this.bars.splice(this.bars.indexOf(a),1)}}]).directive("progress",function(){return{restrict:"EA",replace:!0,transclude:!0,controller:"ProgressController",require:"progress",scope:{},templateUrl:"template/progressbar/progress.html"}}).directive("bar",function(){return{restrict:"EA",replace:!0,transclude:!0,require:"^progress",scope:{value:"=",max:"=?",type:"@"},templateUrl:"template/progressbar/bar.html",link:function(a,b,c,d){d.addBar(a,b)}}}).directive("progressbar",function(){return{restrict:"EA",replace:!0,transclude:!0,controller:"ProgressController",scope:{value:"=",max:"=?",type:"@"},templateUrl:"template/progressbar/progressbar.html",link:function(a,b,c,d){d.addBar(a,angular.element(b.children()[0]))}}}),angular.module("ui.bootstrap.rating",[]).constant("ratingConfig",{max:5,stateOn:null,stateOff:null}).controller("RatingController",["$scope","$attrs","ratingConfig",function(a,b,c){var d={$setViewValue:angular.noop};this.init=function(e){d=e,d.$render=this.render,d.$formatters.push(function(a){return angular.isNumber(a)&&a<<0!==a&&(a=Math.round(a)),a}),this.stateOn=angular.isDefined(b.stateOn)?a.$parent.$eval(b.stateOn):c.stateOn,this.stateOff=angular.isDefined(b.stateOff)?a.$parent.$eval(b.stateOff):c.stateOff;var f=angular.isDefined(b.ratingStates)?a.$parent.$eval(b.ratingStates):new Array(angular.isDefined(b.max)?a.$parent.$eval(b.max):c.max);a.range=this.buildTemplateObjects(f)},this.buildTemplateObjects=function(a){for(var b=0,c=a.length;c>b;b++)a[b]=angular.extend({index:b},{stateOn:this.stateOn,stateOff:this.stateOff},a[b]);return a},a.rate=function(b){!a.readonly&&b>=0&&b<=a.range.length&&(d.$setViewValue(b),d.$render())},a.enter=function(b){a.readonly||(a.value=b),a.onHover({value:b})},a.reset=function(){a.value=d.$viewValue,a.onLeave()},a.onKeydown=function(b){/(37|38|39|40)/.test(b.which)&&(b.preventDefault(),b.stopPropagation(),a.rate(a.value+(38===b.which||39===b.which?1:-1)))},this.render=function(){a.value=d.$viewValue}}]).directive("rating",function(){return{restrict:"EA",require:["rating","ngModel"],scope:{readonly:"=?",onHover:"&",onLeave:"&"},controller:"RatingController",templateUrl:"template/rating/rating.html",replace:!0,link:function(a,b,c,d){var e=d[0],f=d[1];e.init(f)}}}),angular.module("ui.bootstrap.tabs",[]).controller("TabsetController",["$scope",function(a){var b=this,c=b.tabs=a.tabs=[];b.select=function(a){angular.forEach(c,function(b){b.active&&b!==a&&(b.active=!1,b.onDeselect())}),a.active=!0,a.onSelect()},b.addTab=function(a){c.push(a),1===c.length&&a.active!==!1?a.active=!0:a.active?b.select(a):a.active=!1},b.removeTab=function(a){var e=c.indexOf(a);if(a.active&&c.length>1&&!d){var f=e==c.length-1?e-1:e+1;b.select(c[f])}c.splice(e,1)};var d;a.$on("$destroy",function(){d=!0})}]).directive("tabset",function(){return{restrict:"EA",transclude:!0,replace:!0,scope:{type:"@"},controller:"TabsetController",templateUrl:"template/tabs/tabset.html",link:function(a,b,c){a.vertical=angular.isDefined(c.vertical)?a.$parent.$eval(c.vertical):!1,a.justified=angular.isDefined(c.justified)?a.$parent.$eval(c.justified):!1}}}).directive("tab",["$parse","$log",function(a,b){return{require:"^tabset",restrict:"EA",replace:!0,templateUrl:"template/tabs/tab.html",transclude:!0,scope:{active:"=?",heading:"@",onSelect:"&select",onDeselect:"&deselect"},controller:function(){},compile:function(c,d,e){return function(c,d,f,g){c.$watch("active",function(a){a&&g.select(c)}),c.disabled=!1,f.disable&&c.$parent.$watch(a(f.disable),function(a){c.disabled=!!a}),f.disabled&&(b.warn('Use of "disabled" attribute has been deprecated, please use "disable"'),c.$parent.$watch(a(f.disabled),function(a){c.disabled=!!a})),c.select=function(){c.disabled||(c.active=!0)},g.addTab(c),c.$on("$destroy",function(){g.removeTab(c)}),c.$transcludeFn=e}}}}]).directive("tabHeadingTransclude",[function(){return{restrict:"A",require:"^tab",link:function(a,b){a.$watch("headingElement",function(a){a&&(b.html(""),b.append(a))})}}}]).directive("tabContentTransclude",function(){function a(a){return a.tagName&&(a.hasAttribute("tab-heading")||a.hasAttribute("data-tab-heading")||"tab-heading"===a.tagName.toLowerCase()||"data-tab-heading"===a.tagName.toLowerCase())}return{restrict:"A",require:"^tabset",link:function(b,c,d){var e=b.$eval(d.tabContentTransclude);e.$transcludeFn(e.$parent,function(b){angular.forEach(b,function(b){a(b)?e.headingElement=b:c.append(b)})})}}}),angular.module("ui.bootstrap.timepicker",[]).constant("timepickerConfig",{hourStep:1,minuteStep:1,showMeridian:!0,meridians:null,readonlyInput:!1,mousewheel:!0,arrowkeys:!0}).controller("TimepickerController",["$scope","$attrs","$parse","$log","$locale","timepickerConfig",function(a,b,c,d,e,f){function g(){var b=parseInt(a.hours,10),c=a.showMeridian?b>0&&13>b:b>=0&&24>b;return c?(a.showMeridian&&(12===b&&(b=0),a.meridian===p[1]&&(b+=12)),b):void 0}function h(){var b=parseInt(a.minutes,10);return b>=0&&60>b?b:void 0}function i(a){return angular.isDefined(a)&&a.toString().length<2?"0"+a:a.toString()}function j(a){k(),o.$setViewValue(new Date(n)),l(a)}function k(){o.$setValidity("time",!0),a.invalidHours=!1,a.invalidMinutes=!1}function l(b){var c=n.getHours(),d=n.getMinutes();a.showMeridian&&(c=0===c||12===c?12:c%12),a.hours="h"===b?c:i(c),"m"!==b&&(a.minutes=i(d)),a.meridian=n.getHours()<12?p[0]:p[1]}function m(a){var b=new Date(n.getTime()+6e4*a);n.setHours(b.getHours(),b.getMinutes()),j()}var n=new Date,o={$setViewValue:angular.noop},p=angular.isDefined(b.meridians)?a.$parent.$eval(b.meridians):f.meridians||e.DATETIME_FORMATS.AMPMS;this.init=function(c,d){o=c,o.$render=this.render,o.$formatters.unshift(function(a){return a?new Date(a):null});var e=d.eq(0),g=d.eq(1),h=angular.isDefined(b.mousewheel)?a.$parent.$eval(b.mousewheel):f.mousewheel;h&&this.setupMousewheelEvents(e,g);var i=angular.isDefined(b.arrowkeys)?a.$parent.$eval(b.arrowkeys):f.arrowkeys;i&&this.setupArrowkeyEvents(e,g),a.readonlyInput=angular.isDefined(b.readonlyInput)?a.$parent.$eval(b.readonlyInput):f.readonlyInput,this.setupInputEvents(e,g)};var q=f.hourStep;b.hourStep&&a.$parent.$watch(c(b.hourStep),function(a){q=parseInt(a,10)});var r=f.minuteStep;b.minuteStep&&a.$parent.$watch(c(b.minuteStep),function(a){r=parseInt(a,10)}),a.showMeridian=f.showMeridian,b.showMeridian&&a.$parent.$watch(c(b.showMeridian),function(b){if(a.showMeridian=!!b,o.$error.time){var c=g(),d=h();angular.isDefined(c)&&angular.isDefined(d)&&(n.setHours(c),j())}else l()}),this.setupMousewheelEvents=function(b,c){var d=function(a){a.originalEvent&&(a=a.originalEvent);var b=a.wheelDelta?a.wheelDelta:-a.deltaY;return a.detail||b>0};b.bind("mousewheel wheel",function(b){a.$apply(d(b)?a.incrementHours():a.decrementHours()),b.preventDefault()}),c.bind("mousewheel wheel",function(b){a.$apply(d(b)?a.incrementMinutes():a.decrementMinutes()),b.preventDefault()})},this.setupArrowkeyEvents=function(b,c){b.bind("keydown",function(b){38===b.which?(b.preventDefault(),a.incrementHours(),a.$apply()):40===b.which&&(b.preventDefault(),a.decrementHours(),a.$apply())}),c.bind("keydown",function(b){38===b.which?(b.preventDefault(),a.incrementMinutes(),a.$apply()):40===b.which&&(b.preventDefault(),a.decrementMinutes(),a.$apply())})},this.setupInputEvents=function(b,c){if(a.readonlyInput)return a.updateHours=angular.noop,void(a.updateMinutes=angular.noop);var d=function(b,c){o.$setViewValue(null),o.$setValidity("time",!1),angular.isDefined(b)&&(a.invalidHours=b),angular.isDefined(c)&&(a.invalidMinutes=c)};a.updateHours=function(){var a=g();angular.isDefined(a)?(n.setHours(a),j("h")):d(!0)},b.bind("blur",function(){!a.invalidHours&&a.hours<10&&a.$apply(function(){a.hours=i(a.hours)})}),a.updateMinutes=function(){var a=h();angular.isDefined(a)?(n.setMinutes(a),j("m")):d(void 0,!0)},c.bind("blur",function(){!a.invalidMinutes&&a.minutes<10&&a.$apply(function(){a.minutes=i(a.minutes)})})},this.render=function(){var a=o.$viewValue;isNaN(a)?(o.$setValidity("time",!1),d.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.')):(a&&(n=a),k(),l())},a.incrementHours=function(){m(60*q)},a.decrementHours=function(){m(60*-q)},a.incrementMinutes=function(){m(r)},a.decrementMinutes=function(){m(-r)},a.toggleMeridian=function(){m(720*(n.getHours()<12?1:-1))}}]).directive("timepicker",function(){return{restrict:"EA",require:["timepicker","?^ngModel"],controller:"TimepickerController",replace:!0,scope:{},templateUrl:"template/timepicker/timepicker.html",link:function(a,b,c,d){var e=d[0],f=d[1];f&&e.init(f,b.find("input"))}}}),angular.module("ui.bootstrap.transition",[]).value("$transitionSuppressDeprecated",!1).factory("$transition",["$q","$timeout","$rootScope","$log","$transitionSuppressDeprecated",function(a,b,c,d,e){function f(a){for(var b in a)if(void 0!==h.style[b])return a[b]}e||d.warn("$transition is now deprecated. Use $animate from ngAnimate instead.");var g=function(d,e,f){f=f||{};var h=a.defer(),i=g[f.animation?"animationEndEventName":"transitionEndEventName"],j=function(){c.$apply(function(){d.unbind(i,j),h.resolve(d)})};return i&&d.bind(i,j),b(function(){angular.isString(e)?d.addClass(e):angular.isFunction(e)?e(d):angular.isObject(e)&&d.css(e),i||h.resolve(d)}),h.promise.cancel=function(){i&&d.unbind(i,j),h.reject("Transition cancelled")},h.promise},h=document.createElement("trans"),i={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd",transition:"transitionend"},j={WebkitTransition:"webkitAnimationEnd",MozTransition:"animationend",OTransition:"oAnimationEnd",transition:"animationend"};return g.transitionEndEventName=f(i),g.animationEndEventName=f(j),g}]),angular.module("ui.bootstrap.typeahead",["ui.bootstrap.position","ui.bootstrap.bindHtml"]).factory("typeaheadParser",["$parse",function(a){var b=/^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;return{parse:function(c){var d=c.match(b);if(!d)throw new Error('Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_" but got "'+c+'".');return{itemName:d[3],source:a(d[4]),viewMapper:a(d[2]||d[1]),modelMapper:a(d[1])}}}}]).directive("typeahead",["$compile","$parse","$q","$timeout","$document","$position","typeaheadParser",function(a,b,c,d,e,f,g){var h=[9,13,27,38,40];return{require:"ngModel",link:function(i,j,k,l){var m,n=i.$eval(k.typeaheadMinLength)||1,o=i.$eval(k.typeaheadWaitMs)||0,p=i.$eval(k.typeaheadEditable)!==!1,q=b(k.typeaheadLoading).assign||angular.noop,r=b(k.typeaheadOnSelect),s=k.typeaheadInputFormatter?b(k.typeaheadInputFormatter):void 0,t=k.typeaheadAppendToBody?i.$eval(k.typeaheadAppendToBody):!1,u=i.$eval(k.typeaheadFocusFirst)!==!1,v=b(k.ngModel).assign,w=g.parse(k.typeahead),x=i.$new();i.$on("$destroy",function(){x.$destroy()});var y="typeahead-"+x.$id+"-"+Math.floor(1e4*Math.random());j.attr({"aria-autocomplete":"list","aria-expanded":!1,"aria-owns":y});var z=angular.element("<div typeahead-popup></div>");z.attr({id:y,matches:"matches",active:"activeIdx",select:"select(activeIdx)",query:"query",position:"position"}),angular.isDefined(k.typeaheadTemplateUrl)&&z.attr("template-url",k.typeaheadTemplateUrl);var A=function(){x.matches=[],x.activeIdx=-1,j.attr("aria-expanded",!1)},B=function(a){return y+"-option-"+a};x.$watch("activeIdx",function(a){0>a?j.removeAttr("aria-activedescendant"):j.attr("aria-activedescendant",B(a))});var C=function(a){var b={$viewValue:a};q(i,!0),c.when(w.source(i,b)).then(function(c){var d=a===l.$viewValue;if(d&&m)if(c&&c.length>0){x.activeIdx=u?0:-1,x.matches.length=0;for(var e=0;e<c.length;e++)b[w.itemName]=c[e],x.matches.push({id:B(e),label:w.viewMapper(x,b),model:c[e]});x.query=a,x.position=t?f.offset(j):f.position(j),x.position.top=x.position.top+j.prop("offsetHeight"),j.attr("aria-expanded",!0)}else A();d&&q(i,!1)},function(){A(),q(i,!1)})};A(),x.query=void 0;var D,E=function(a){D=d(function(){C(a)},o)},F=function(){D&&d.cancel(D)};l.$parsers.unshift(function(a){return m=!0,a&&a.length>=n?o>0?(F(),E(a)):C(a):(q(i,!1),F(),A()),p?a:a?void l.$setValidity("editable",!1):(l.$setValidity("editable",!0),a)}),l.$formatters.push(function(a){var b,c,d={};return p||l.$setValidity("editable",!0),s?(d.$model=a,s(i,d)):(d[w.itemName]=a,b=w.viewMapper(i,d),d[w.itemName]=void 0,c=w.viewMapper(i,d),b!==c?b:a)}),x.select=function(a){var b,c,e={};e[w.itemName]=c=x.matches[a].model,b=w.modelMapper(i,e),v(i,b),l.$setValidity("editable",!0),l.$setValidity("parse",!0),r(i,{$item:c,$model:b,$label:w.viewMapper(i,e)}),A(),d(function(){j[0].focus()},0,!1)},j.bind("keydown",function(a){0!==x.matches.length&&-1!==h.indexOf(a.which)&&(-1!=x.activeIdx||13!==a.which&&9!==a.which)&&(a.preventDefault(),40===a.which?(x.activeIdx=(x.activeIdx+1)%x.matches.length,x.$digest()):38===a.which?(x.activeIdx=(x.activeIdx>0?x.activeIdx:x.matches.length)-1,x.$digest()):13===a.which||9===a.which?x.$apply(function(){x.select(x.activeIdx)}):27===a.which&&(a.stopPropagation(),A(),x.$digest()))}),j.bind("blur",function(){m=!1});var G=function(a){j[0]!==a.target&&(A(),x.$digest())};e.bind("click",G),i.$on("$destroy",function(){e.unbind("click",G),t&&H.remove(),z.remove()});var H=a(z)(x);t?e.find("body").append(H):j.after(H)}}}]).directive("typeaheadPopup",function(){return{restrict:"EA",scope:{matches:"=",query:"=",active:"=",position:"=",select:"&"},replace:!0,templateUrl:"template/typeahead/typeahead-popup.html",link:function(a,b,c){a.templateUrl=c.templateUrl,a.isOpen=function(){return a.matches.length>0},a.isActive=function(b){return a.active==b},a.selectActive=function(b){a.active=b},a.selectMatch=function(b){a.select({activeIdx:b})}}}}).directive("typeaheadMatch",["$templateRequest","$compile","$parse",function(a,b,c){return{restrict:"EA",scope:{index:"=",match:"=",query:"="},link:function(d,e,f){var g=c(f.templateUrl)(d.$parent)||"template/typeahead/typeahead-match.html";a(g).then(function(a){b(a.trim())(d,function(a){e.replaceWith(a)})})}}}]).filter("typeaheadHighlight",function(){function a(a){return a.replace(/([.?*+^$[\]\\(){}|-])/g,"\\$1")}return function(b,c){return c?(""+b).replace(new RegExp(a(c),"gi"),"<strong>$&</strong>"):b}}),angular.module("template/accordion/accordion-group.html",[]).run(["$templateCache",function(a){a.put("template/accordion/accordion-group.html",'<div class="panel panel-default">\n  <div class="panel-heading">\n    <h4 class="panel-title">\n      <a href="javascript:void(0)" tabindex="0" class="accordion-toggle" ng-click="toggleOpen()" accordion-transclude="heading"><span ng-class="{\'text-muted\': isDisabled}">{{heading}}</span></a>\n    </h4>\n  </div>\n  <div class="panel-collapse collapse" collapse="!isOpen">\n	  <div class="panel-body" ng-transclude></div>\n  </div>\n</div>\n')}]),angular.module("template/accordion/accordion.html",[]).run(["$templateCache",function(a){a.put("template/accordion/accordion.html",'<div class="panel-group" ng-transclude></div>')}]),angular.module("template/alert/alert.html",[]).run(["$templateCache",function(a){a.put("template/alert/alert.html",'<div class="alert" ng-class="[\'alert-\' + (type || \'warning\'), closeable ? \'alert-dismissable\' : null]" role="alert">\n    <button ng-show="closeable" type="button" class="close" ng-click="close()">\n        <span aria-hidden="true">&times;</span>\n        <span class="sr-only">Close</span>\n    </button>\n    <div ng-transclude></div>\n</div>\n')}]),angular.module("template/carousel/carousel.html",[]).run(["$templateCache",function(a){a.put("template/carousel/carousel.html",'<div ng-mouseenter="pause()" ng-mouseleave="play()" class="carousel" ng-swipe-right="prev()" ng-swipe-left="next()">\n    <ol class="carousel-indicators" ng-show="slides.length > 1">\n        <li ng-repeat="slide in slides | orderBy:\'index\' track by $index" ng-class="{active: isActive(slide)}" ng-click="select(slide)"></li>\n    </ol>\n    <div class="carousel-inner" ng-transclude></div>\n    <a class="left carousel-control" ng-click="prev()" ng-show="slides.length > 1"><span class="glyphicon glyphicon-chevron-left"></span></a>\n    <a class="right carousel-control" ng-click="next()" ng-show="slides.length > 1"><span class="glyphicon glyphicon-chevron-right"></span></a>\n</div>\n')}]),angular.module("template/carousel/slide.html",[]).run(["$templateCache",function(a){a.put("template/carousel/slide.html",'<div ng-class="{\n    \'active\': active\n  }" class="item text-center" ng-transclude></div>\n')}]),angular.module("template/datepicker/datepicker.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/datepicker.html",'<div ng-switch="datepickerMode" role="application" ng-keydown="keydown($event)">\n  <daypicker ng-switch-when="day" tabindex="0"></daypicker>\n  <monthpicker ng-switch-when="month" tabindex="0"></monthpicker>\n  <yearpicker ng-switch-when="year" tabindex="0"></yearpicker>\n</div>')}]),angular.module("template/datepicker/day.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/day.html",'<table role="grid" aria-labelledby="{{uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="{{5 + showWeeks}}"><button id="{{uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n    <tr>\n      <th ng-show="showWeeks" class="text-center"></th>\n      <th ng-repeat="label in labels track by $index" class="text-center"><small aria-label="{{label.full}}">{{label.abbr}}</small></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-show="showWeeks" class="text-center h6"><em>{{ weekNumbers[$index] }}</em></td>\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{dt.uid}}" aria-disabled="{{!!dt.disabled}}" ng-class="dt.customClass">\n        <button type="button" style="width:100%;" class="btn btn-default btn-sm" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="{\'text-muted\': dt.secondary, \'text-info\': dt.current}">{{dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/datepicker/month.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/month.html",'<table role="grid" aria-labelledby="{{uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th><button id="{{uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{dt.uid}}" aria-disabled="{{!!dt.disabled}}">\n        <button type="button" style="width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="{\'text-info\': dt.current}">{{dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')}]),angular.module("template/datepicker/popup.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/popup.html",'<ul class="dropdown-menu" ng-style="{display: (isOpen && \'block\') || \'none\', top: position.top+\'px\', left: position.left+\'px\'}" ng-keydown="keydown($event)">\n	<li ng-transclude></li>\n	<li ng-if="showButtonBar" style="padding:10px 9px 2px">\n		<span class="btn-group pull-left">\n			<button type="button" class="btn btn-sm btn-info" ng-click="select(\'today\')">{{ getText(\'current\') }}</button>\n			<button type="button" class="btn btn-sm btn-danger" ng-click="select(null)">{{ getText(\'clear\') }}</button>\n		</span>\n		<button type="button" class="btn btn-sm btn-success pull-right" ng-click="close()">{{ getText(\'close\') }}</button>\n	</li>\n</ul>\n')}]),angular.module("template/datepicker/year.html",[]).run(["$templateCache",function(a){a.put("template/datepicker/year.html",'<table role="grid" aria-labelledby="{{uniqueId}}-title" aria-activedescendant="{{activeDateId}}">\n  <thead>\n    <tr>\n      <th><button type="button" class="btn btn-default btn-sm pull-left" ng-click="move(-1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-left"></i></button></th>\n      <th colspan="3"><button id="{{uniqueId}}-title" role="heading" aria-live="assertive" aria-atomic="true" type="button" class="btn btn-default btn-sm" ng-click="toggleMode()" ng-disabled="datepickerMode === maxMode" tabindex="-1" style="width:100%;"><strong>{{title}}</strong></button></th>\n      <th><button type="button" class="btn btn-default btn-sm pull-right" ng-click="move(1)" tabindex="-1"><i class="glyphicon glyphicon-chevron-right"></i></button></th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr ng-repeat="row in rows track by $index">\n      <td ng-repeat="dt in row track by dt.date" class="text-center" role="gridcell" id="{{dt.uid}}" aria-disabled="{{!!dt.disabled}}">\n        <button type="button" style="width:100%;" class="btn btn-default" ng-class="{\'btn-info\': dt.selected, active: isActive(dt)}" ng-click="select(dt.date)" ng-disabled="dt.disabled" tabindex="-1"><span ng-class="{\'text-info\': dt.current}">{{dt.label}}</span></button>\n      </td>\n    </tr>\n  </tbody>\n</table>\n')
}]),angular.module("template/modal/backdrop.html",[]).run(["$templateCache",function(a){a.put("template/modal/backdrop.html",'<div class="modal-backdrop"\n     modal-animation-class="fade"\n     ng-class="{in: animate}"\n     ng-style="{\'z-index\': 1040 + (index && 1 || 0) + index*10}"\n></div>\n')}]),angular.module("template/modal/window.html",[]).run(["$templateCache",function(a){a.put("template/modal/window.html",'<div modal-render="{{$isRendered}}" tabindex="-1" role="dialog" class="modal"\n    modal-animation-class="fade"\n	ng-class="{in: animate}" ng-style="{\'z-index\': 1050 + index*10, display: \'block\'}" ng-click="close($event)">\n    <div class="modal-dialog" ng-class="size ? \'modal-\' + size : \'\'"><div class="modal-content" modal-transclude></div></div>\n</div>\n')}]),angular.module("template/pagination/pager.html",[]).run(["$templateCache",function(a){a.put("template/pagination/pager.html",'<ul class="pager">\n  <li ng-class="{disabled: noPrevious(), previous: align}"><a href ng-click="selectPage(page - 1, $event)">{{getText(\'previous\')}}</a></li>\n  <li ng-class="{disabled: noNext(), next: align}"><a href ng-click="selectPage(page + 1, $event)">{{getText(\'next\')}}</a></li>\n</ul>')}]),angular.module("template/pagination/pagination.html",[]).run(["$templateCache",function(a){a.put("template/pagination/pagination.html",'<ul class="pagination">\n  <li ng-if="boundaryLinks" ng-class="{disabled: noPrevious()}"><a href ng-click="selectPage(1, $event)">{{getText(\'first\')}}</a></li>\n  <li ng-if="directionLinks" ng-class="{disabled: noPrevious()}"><a href ng-click="selectPage(page - 1, $event)">{{getText(\'previous\')}}</a></li>\n  <li ng-repeat="page in pages track by $index" ng-class="{active: page.active}"><a href ng-click="selectPage(page.number, $event)">{{page.text}}</a></li>\n  <li ng-if="directionLinks" ng-class="{disabled: noNext()}"><a href ng-click="selectPage(page + 1, $event)">{{getText(\'next\')}}</a></li>\n  <li ng-if="boundaryLinks" ng-class="{disabled: noNext()}"><a href ng-click="selectPage(totalPages, $event)">{{getText(\'last\')}}</a></li>\n</ul>')}]),angular.module("template/tooltip/tooltip-html-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-html-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>\n</div>\n')}]),angular.module("template/tooltip/tooltip-html-unsafe-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-html-unsafe-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" bind-html-unsafe="content"></div>\n</div>\n')}]),angular.module("template/tooltip/tooltip-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner" ng-bind="content"></div>\n</div>\n')}]),angular.module("template/tooltip/tooltip-template-popup.html",[]).run(["$templateCache",function(a){a.put("template/tooltip/tooltip-template-popup.html",'<div class="tooltip"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="tooltip-arrow"></div>\n  <div class="tooltip-inner"\n    tooltip-template-transclude="contentExp()"\n    tooltip-template-transclude-scope="originScope()"></div>\n</div>\n')}]),angular.module("template/popover/popover-template.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover-template.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content"\n        tooltip-template-transclude="contentExp()"\n        tooltip-template-transclude-scope="originScope()"></div>\n  </div>\n</div>\n')}]),angular.module("template/popover/popover-window.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover-window.html",'<div class="popover {{placement}}" ng-class="{ in: isOpen, fade: animation }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-show="title"></h3>\n      <div class="popover-content" tooltip-template-transclude></div>\n  </div>\n</div>\n')}]),angular.module("template/popover/popover.html",[]).run(["$templateCache",function(a){a.put("template/popover/popover.html",'<div class="popover"\n  tooltip-animation-class="fade"\n  tooltip-classes\n  ng-class="{ in: isOpen() }">\n  <div class="arrow"></div>\n\n  <div class="popover-inner">\n      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>\n      <div class="popover-content" ng-bind="content"></div>\n  </div>\n</div>\n')}]),angular.module("template/progressbar/bar.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/bar.html",'<div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" ng-transclude></div>\n')}]),angular.module("template/progressbar/progress.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/progress.html",'<div class="progress" ng-transclude></div>')}]),angular.module("template/progressbar/progressbar.html",[]).run(["$templateCache",function(a){a.put("template/progressbar/progressbar.html",'<div class="progress">\n  <div class="progress-bar" ng-class="type && \'progress-bar-\' + type" role="progressbar" aria-valuenow="{{value}}" aria-valuemin="0" aria-valuemax="{{max}}" ng-style="{width: (percent < 100 ? percent : 100) + \'%\'}" aria-valuetext="{{percent | number:0}}%" ng-transclude></div>\n</div>\n')}]),angular.module("template/rating/rating.html",[]).run(["$templateCache",function(a){a.put("template/rating/rating.html",'<span ng-mouseleave="reset()" ng-keydown="onKeydown($event)" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="{{range.length}}" aria-valuenow="{{value}}">\n    <i ng-repeat="r in range track by $index" ng-mouseenter="enter($index + 1)" ng-click="rate($index + 1)" class="glyphicon" ng-class="$index < value && (r.stateOn || \'glyphicon-star\') || (r.stateOff || \'glyphicon-star-empty\')">\n        <span class="sr-only">({{ $index < value ? \'*\' : \' \' }})</span>\n    </i>\n</span>')}]),angular.module("template/tabs/tab.html",[]).run(["$templateCache",function(a){a.put("template/tabs/tab.html",'<li ng-class="{active: active, disabled: disabled}">\n  <a href ng-click="select()" tab-heading-transclude>{{heading}}</a>\n</li>\n')}]),angular.module("template/tabs/tabset.html",[]).run(["$templateCache",function(a){a.put("template/tabs/tabset.html",'<div>\n  <ul class="nav nav-{{type || \'tabs\'}}" ng-class="{\'nav-stacked\': vertical, \'nav-justified\': justified}" ng-transclude></ul>\n  <div class="tab-content">\n    <div class="tab-pane" \n         ng-repeat="tab in tabs" \n         ng-class="{active: tab.active}"\n         tab-content-transclude="tab">\n    </div>\n  </div>\n</div>\n')}]),angular.module("template/timepicker/timepicker.html",[]).run(["$templateCache",function(a){a.put("template/timepicker/timepicker.html",'<table>\n	<tbody>\n		<tr class="text-center">\n			<td><a ng-click="incrementHours()" class="btn btn-link"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n			<td>&nbsp;</td>\n			<td><a ng-click="incrementMinutes()" class="btn btn-link"><span class="glyphicon glyphicon-chevron-up"></span></a></td>\n			<td ng-show="showMeridian"></td>\n		</tr>\n		<tr>\n			<td class="form-group" ng-class="{\'has-error\': invalidHours}">\n				<input style="width:50px;" type="text" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-readonly="readonlyInput" maxlength="2">\n			</td>\n			<td>:</td>\n			<td class="form-group" ng-class="{\'has-error\': invalidMinutes}">\n				<input style="width:50px;" type="text" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-readonly="readonlyInput" maxlength="2">\n			</td>\n			<td ng-show="showMeridian"><button type="button" class="btn btn-default text-center" ng-click="toggleMeridian()">{{meridian}}</button></td>\n		</tr>\n		<tr class="text-center">\n			<td><a ng-click="decrementHours()" class="btn btn-link"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n			<td>&nbsp;</td>\n			<td><a ng-click="decrementMinutes()" class="btn btn-link"><span class="glyphicon glyphicon-chevron-down"></span></a></td>\n			<td ng-show="showMeridian"></td>\n		</tr>\n	</tbody>\n</table>\n')}]),angular.module("template/typeahead/typeahead-match.html",[]).run(["$templateCache",function(a){a.put("template/typeahead/typeahead-match.html",'<a tabindex="-1" bind-html-unsafe="match.label | typeaheadHighlight:query"></a>')}]),angular.module("template/typeahead/typeahead-popup.html",[]).run(["$templateCache",function(a){a.put("template/typeahead/typeahead-popup.html",'<ul class="dropdown-menu" ng-show="isOpen()" ng-style="{top: position.top+\'px\', left: position.left+\'px\'}" style="display: block;" role="listbox" aria-hidden="{{!isOpen()}}">\n    <li ng-repeat="match in matches track by $index" ng-class="{active: isActive($index) }" ng-mouseenter="selectActive($index)" ng-click="selectMatch($index)" role="option" id="{{match.id}}">\n        <div typeahead-match index="$index" match="match" query="query" template-url="templateUrl"></div>\n    </li>\n</ul>\n')}]),!angular.$$csp()&&angular.element(document).find("head").prepend('<style type="text/css">.ng-animate.item:not(.left):not(.right){-webkit-transition:0s ease-in-out left;transition:0s ease-in-out left}</style>');

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
      }, 1000);
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

var CategoryListController = ['$scope', '$rootScope', '$timeout', '$location', 'Category', 'Feed', 'Bridge', '$route', '$routeParams', '$http',
  function($scope, $rootScope, $timeout, $location, Category, Feed, Bridge, $route, $routeParams, $http) {

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

    // Flarum like composer helper vars
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
      var limit = 10;
      if(vp_h > 1080) {
        limit = 20;
      }

  		Feed.get({limit: limit, offset: 0, category: category.id}, function(data) {

        // For logged users, sync the feed position for new messages notifications
        if($scope.user.isLogged) {
          $scope.status.pending.$value = 0;
          // For sync purposes
          if(category.slug == null) {
            $scope.status.viewing.$value = 'all';
          } else {
            $scope.status.viewing.$value = category.id;
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
        var pending = $scope.status.pending.$value==undefined?$scope.status.pending:$scope.status.pending.$value;
        //console.log($scope.offset, pending);
    		Feed.get({limit: 10, offset: $scope.offset + pending, category: $scope.category.id}, function(data) {
          $scope.appendCategories(data.feed);
    			$scope.posts = $scope.posts.concat(data.feed);
    			$scope.offset = $scope.offset + data.feed.length;
          $scope.resolving.older = false;
    		});

    		ga('send', 'pageview', '/feed/' + $scope.category.slug);
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

    $scope.get_newer = function() {
      if(!$scope.resolving.newer) {
        $scope.resolving.newer = true;
        var pending = $scope.status.pending.$value;

        Feed.get({limit: pending, before: $scope.status.newer_post_date, category: $scope.category.id}, function(data) {
          if(data.feed.length > 0) {
            // append and mark as unread
            $scope.appendCategories(data.feed, true);
            // return to feed if in top posts
            $scope.viewing.top_posts = false;

            // Visual helper in posts
            $timeout(function() {
              for(p in data.feed) {
                data.feed[p].unread = false;
              }
            }, 1000);

            $scope.status.newer_post_date = get_newer_date(data.feed);

            $scope.posts = data.feed.concat($scope.posts);
            $scope.offset = $scope.offset + pending;
          }
          if($scope.user.isLogged) {
            $scope.status.pending.$value = 0;
          }
          $scope.resolving.newer = false;
          // return to the top of the feed
          $('.discussions-list').animate({ scrollTop: 0}, 100);
        });

        ga('send', 'pageview', '/feed/' + $scope.category.slug);
      } else {
        console.log("FeedGet already running...");
      }
    };

  	$scope.turnCategory = function( category ) {
  		$scope.category = category;
  		$scope.startupFeed(category);

  		ga('send', 'pageview', '/category/' + $scope.category.slug);
  	};

    /*
     * Toggle individual category switch, if error, invert switch
     */
    $scope.toggleSubscription = function(category) {
      if(category.selected) {
        $http.put(layer_path + 'category/subscription/' + category.id)
          .error(function(data) {
            category.selected = false;
          })
          .success(function(data) {
            if($scope.user.info.categories.indexOf(category.id) == -1) {
              $scope.user.info.categories.push(category.id);
            }
          });
      } else {
        $http.delete(layer_path + 'category/subscription/' + category.id)
          .error(function(data) {
            category.selected = true;
          })
          .success(function(data) {
            if($scope.user.info.categories.indexOf(category.id) > -1) {
              $scope.user.info.categories.splice($scope.user.info.categories.indexOf(category.id),1);
            }
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

  		ga('send', 'pageview', '/post/' + $scope.category.slug + '/' + post.id);
  	};

    $scope.viewPostID = function( postId, slug ) {
      $scope.activePostId = postId;
      $scope.status.post_selected = true;
      Bridge.changePost({id: postId, slug: slug, name: ""});

      ga('send', 'pageview', '/post/' + slug + '/' + postId);
    };

    $scope.reloadPost = function() {
      $scope.viewPostID($scope.activePostId, "");
    }

    $scope.matchCategories = function() {
      // For loged users, we match their personal feed current values
      if($scope.user.isLogged) {
        if ($scope.user.info.categories) {
          for (var i in $scope.categories) {
            for(var j in $scope.categories[i].subcategories) {
              if ($scope.user.info.categories.indexOf($scope.categories[i].subcategories[j].id) > -1) {
                $scope.categories[i].subcategories[j].selected = true;
              }
            }
          }
        }
      }
    }

    $scope.$on('userLogged', function(e) {
      $scope.matchCategories();
    });

    $scope.$on('reloadPost', function(e) {
      $scope.reloadPost();
    });

    $scope.$on('postDeleted', function(e) {
      // Doing...
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
              console.log("Watching comment:", cn);
              $scope.view_comment.position = cn;
            }
            else {
              $scope.view_comment.position = -1;
              console.log("Not watching comment");
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
            console.log("Watching comment:", cn);
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

var ReaderViewController = ['$scope', '$rootScope', '$http', '$timeout', 'Post', 'Upload', 'modalService',
  function($scope, $rootScope, $http, $timeout, Post, Upload, modalService) {

  $scope.post = {};
  $scope.comment = {content:''};
	$scope.waiting = true;
  $scope.waiting_comment = false;
  $scope.adding_file = false;

  $scope.people = [
    { label: 'AcidKid', username: 'AcidKid'},
    { label: 'Alberto', username: 'Alberto'},
    { label: 'Drak', username: 'Drak'},
    { label: 'fernandez14', username: 'fernandez14'}
  ];

	$scope.forceFirstComment = function() {
		// TO-DO analytics about this trigger
		// Force to show the comment box
		$scope.force_comment = true;
	};

  $scope.show_composer = function() {
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
    $('#comment-content').focus();
  }

  $scope.reply_to = function(username, comment) {
    if($scope.comment.content == '') {
      $scope.comment.content = '@' + username + '#' + comment + ' ';
    } else {
      $scope.comment.content = $scope.comment.content + '\n\n@' + username + '#' + comment + ' ';
    }
    $('#comment-content').focus();
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
  }

  $scope.comment_vote = function(post_id, comment, direction) {
    $http.post(layer_path + 'vote/comment/' + post_id, {comment: '' + comment.position, 'direction': direction}).
      success(function(data, status, headers, config) {
        //comment.liked = !comment.liked;
        var d = {'up': 1, 'down': -1};
        if(comment.liked == d[direction]) {
          comment.liked = null;
          if(direction == 'up') {
            comment.votes.up = comment.votes.up - 1;
          } else {
            comment.votes.down = comment.votes.down - 1;
          }
        } else {
          comment.liked = d[direction];
          if(direction == 'up') {
            comment.votes.up = comment.votes.up + 1;
          } else {
            comment.votes.down = comment.votes.down + 1;
          }
        }
        //console.log(data);
      }).
      error(function(data) {
        //console.log(data);
      });
  }

  $scope.post_vote = function(post, direction) {
    $http.post(layer_path + 'vote/post/' + post.id, {'direction': direction}).
      success(function(data) {
        var d = {'up': 1, 'down': -1};
        if(post.liked == d[direction]) {
          post.liked = null;
          if(direction == 'up') {
            post.votes.up = post.votes.up - 1;
          } else {
            post.votes.down = post.votes.down - 1;
          }
        } else {
          post.liked = d[direction];
          if(direction == 'up') {
            post.votes.up = post.votes.up + 1;
          } else {
            post.votes.down = post.votes.down + 1;
          }
        }
      }).
      error(function(data) {
        //console.log(data);
      });
  }

  $scope.publish = function() {
    if(!$scope.waiting_comment) {
      $scope.waiting_comment = true;
      $scope.publishComment().then(function(response) {
        var date = new Date();
        $scope.post.comments.count = $scope.post.comments.count + 1;
        $scope.post.comments.set.push({
          user_id: $scope.user.info.id,
          author: {
            id: $scope.user.info.id,
            username: $scope.user.info.username,
            email: $scope.user.info.email,
            description: $scope.user.info.description || "Sólo otro Spartan Geek más",
            image: $scope.user.info.image,
            roles: $scope.user.info.roles,
            level: $scope.user.info.gaming.level
          },
          content: response.data.message,
          created_at: date.toISOString(),
          position: parseInt(response.data.position),
          votes: {down: 0, up: 0}
        });

        var comment = $scope.post.comments.set[$scope.post.comments.count - 1];
        addMediaEmbed(comment);
        // Allow to comment once again
        $scope.waiting_comment = false;
        $scope.comment.content = '';
      }, function(error) {
        console.log("Error publicando comentario...");
      });
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

	$scope.publishComment = function() {
    // Check for the post integrity and then send the comment and return the promise
    if ('id' in $scope.post) {
      return $http.post(layer_path + 'post/comment/' + $scope.post.id, {content: $scope.comment.content});
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
  }
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
  }

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
        .then(function() {
          var position = $scope.post.comments.set.indexOf(comment);
          if(position > -1) {
            $scope.post.comments.set.splice(position, 1);
            $scope.post.comments.count--;
          }
          $scope.$broadcast('scrubberRecalculate');
        });
    });
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

	$scope.$on('pushLoggedComment', function(event, comment) {
		// Push the comment to the main set of comments
    addMediaEmbed(comment);
		$scope.post.comments.set.push(comment);
	});

	$scope.$on('resolvePost', function(event, post) {
		$scope.waiting = false;
		$scope.resolving = true;
    $scope.error_loading = false;
		$scope.post = post;
		$scope.force_comment = false;

		Post.get({id: post.id}, function(data) {
			$scope.post = data;
      addMediaEmbed($scope.post);

      for (var c in $scope.categories) {
        for(var s in $scope.categories[c].subcategories) {
          if($scope.categories[c].subcategories[s].id == $scope.post.category) {
            $scope.post.category = {
              id: $scope.categories[c].subcategories[s].id,
              name: $scope.categories[c].subcategories[s].name,
              slug: $scope.categories[c].subcategories[s].slug,
              parent_slug: $scope.categories[c].slug
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

      // Postproccess every comment
      for( var c in $scope.post.comments.set) {
        addMediaEmbed($scope.post.comments.set[c]);
      }
      $scope.resolving = false;

      // If searching for a comment, move to that comment
      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 400);
      }

      /* TEMPORAL - TODO: MOVE TO A DIRECTIVE */
      $scope.total_h = $scope.viewport_h = 0;
      $timeout(function() {
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
      }, 350);

      var from_top, surplus, lastScrollTop = 0;
      $scope.scrubber = {
        current_c: 0
      };
      // Scrolling responses
      $('.current-article').scroll( function() {
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
      });
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
    var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "g");
    var to_replace = "<div class=\"img-preview\"><a href=\"$1\" target=\"_blank\"><img src=\"$1\"></a></div>"
    comment.content_final = comment.content.replace(regex, to_replace);

    // Replace Youtube videos
    var yt_re = /(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/)(?:v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]{11})\S*/g;
    var to_replace = "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/$4\" frameborder=\"0\" allowfullscreen></iframe>";
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
    isQuestion: false,
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
        isquestion: $scope.post.isQuestion,
        pinned: $scope.post.pinned
  		};

  		$http.post(layer_path + 'post', post).then(function(data) {
  			// Return to home
        window.location.href = "/";
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
    isQuestion: false,
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

  		$http.put(layer_path + 'posts/' + $scope.post.id, $scope.post_edit).then(function(data) {
  			// Return to home
        window.location.href = "/";
  		}, function(err) {
        console.log(err);
      });
    }
	};

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

  // Load categories
  Category.writable(function(data) {
    $scope.categories = data;

    Post.get({id: $routeParams.id}, function(data) {
      $scope.post = data;
      $scope.post_edit = {
        title: data.title,
        content: data.content,
        category: data.category,
        kind: 'category-post',
        isQuestion: data.is_question,
        pinned: data.pinned
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
UserModule.controller('UserController', ['$scope', 'User', '$routeParams', 'Feed', 'Upload', '$http', '$timeout',
  function($scope, User, $routeParams, Feed, Upload, $http, $timeout) {

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
    $scope.resolving_posts = true;

    Feed.get({limit: 10, offset: 0, user_id: $scope.profile.id}, function(data) {
      //console.log(data);
      for(p in data.feed) {
        for(c in $scope.categories) {
          if (data.feed[p].categories[0] == $scope.categories[c].slug) {
            data.feed[p].category = {name: $scope.categories[c].name, color: $scope.categories[c].color, slug: $scope.categories[c].slug}
            break;
          }
        }
      }

      $scope.posts = data.feed;
      $scope.resolving_posts = false;
      $scope.offset = 10;
    });
  };

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

  User.get({user_id: $routeParams.id}, function(data) {
    console.log(data)
    $scope.profile = data;
    $scope.startFeed();
    $scope.new_data.username = $scope.profile.username;

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
        $scope.profile.gaming.remaining = remaining;
        var ratio = 100 - 100 * (remaining / (rules[data.gaming.level].swords_end - rules[data.gaming.level].swords_start));
        $scope.profile.gaming.ratio = ratio;
      }, 100);
    });

    //console.log(rules[data.gaming.level].swords_start, rules[data.gaming.level].swords_end, ratio);
    $scope.loadUserComments();
  }, function(response) {
    window.location = '/';
  });
}]);

UserModule.controller('UserValidationController', ['$scope', '$http', '$routeParams',
  function($scope, $http, $routeParams) {

    $scope.validation_in_progress = true;
    $scope.validated = false;

    $http.get(layer_path + "user/confirm/" + $routeParams.code).
      then(function() {
        $scope.validation_in_progress = false;
        $scope.user.info.validated = true;
        $scope.validated = true;
      }, function() {
        $scope.validation_in_progress = false;
        //Redirect to home if error
        window.location = '/';
      });
  }
])

var RankModule = angular.module('rankModule', []);

// Rank module controllers
RankModule.controller('RanksController', [function() {

}]);

var BadgeModule = angular.module('sg.module.badges', []);

// Badge module controllers
BadgeModule.controller('BadgeController', ['$scope', '$timeout', '$http', function($scope, $timeout, $http) {

  /*$timeout(function(){
    $scope.badges = $scope.misc.gaming.badges;
  }, 100);*/

  $scope.buy_badge = function(badge) {
    $http.post(layer_path + "badges/buy/" + badge.id)
      .success(function(data) {
        //console.log(data);
        badge.owned = true;

        for(var i in $scope.misc.gaming.badges) {
          if($scope.misc.gaming.badges[i].required_badge) {
            if($scope.misc.gaming.badges[i].required_badge.id === badge.id) {
              $scope.misc.gaming.badges[i].badge_needed = false;
            }
          }
        }

      })
      .error(function(data) {
        console.log("Can't buy me loOove! ... talk to AcidKid");
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

var ChatController = ['$scope', '$firebaseArray', '$firebaseObject', '$timeout',
  function($scope, $firebaseArray, $firebaseObject, $timeout) {
  $scope.channels = [];
  $scope.channel = {
    selected: null
  };
  $scope.messages = [];
  $scope.message = {
    content: '',
    send_on_enter: true,
    previous: '-'
  };
  $scope.show_details = true;

  $scope.members = [];
  $scope.online_members = 0;

  $scope.countOnline = function() {
    var temp = 0;
    //console.log("Contando...");
    for(m in $scope.members) {
      //console.log($scope.members[m].status);
      if($scope.members[m].status == 'online') {
        temp++;
      }
    }
    $scope.online_members = temp;
  };

  $scope.changeChannel = function(channel) {
    $scope.channel.selected = channel;
    var messagesRef = new Firebase(firebase_url + 'messages/' + channel.$id).limitToLast(100);
    $scope.messages = $firebaseArray(messagesRef);

    $scope.messages.$loaded().then(function(x) {
      $timeout(function(){
        var mh_window = $('.message-history');
        mh_window.scrollTop(mh_window[0].scrollHeight);
      }, 100);

      x.$watch(function(event) {
        if(event.event === "child_added") {
          $timeout(function(){
            var mh_window = $('.message-history');
            if(mh_window.scrollTop() > (mh_window[0].scrollHeight - mh_window.height() - 20)) {
              mh_window.scrollTop(mh_window[0].scrollHeight);
            }
          }, 50);
        }
      });
    });

    var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
    $scope.members = $firebaseArray(membersRef);

    $scope.members.$loaded().then(function(x) {
      $scope.countOnline();
      x.$watch(function(event) {
        $scope.countOnline();
      });
    });

    if($scope.user.isLogged) {
      var amOnline = new Firebase(firebase_url + '.info/connected');
      var statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

      amOnline.on('value', function(snapshot) {
        if(snapshot.val()) {
          var image = $scope.user.info.image || "";
          statusRef.onDisconnect().set({username: $scope.user.info.username, image: image, status: "offline"});
          statusRef.set({
            id: $scope.user.info.id,
            username: $scope.user.info.username,
            image: image,
            status: "online"
          });
        }
      });
    }
  };

  $scope.addMessage = function() {
    if($scope.message.content === $scope.message.previous || ($scope.message.previous.indexOf($scope.message.content) > -1) || ($scope.message.content.indexOf($scope.message.previous) > -1)) {
      $scope.message.content = '';
    } else {
      $scope.message.previous = $scope.message.content;
    }
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
      //console.log(new_message);
      $scope.messages.$add(new_message).then(function(ref) {
        $scope.message.content = '';
      });
    }
  }

  $scope.toggle_details = function() {
    $scope.show_details = !$scope.show_details;
  }

  // Initialization
  var ref = new Firebase(firebase_url + 'chat');
  var channelsRef = new Firebase(firebase_url + 'channels');

  $scope.channels = $firebaseArray(channelsRef);
  $scope.channels.$loaded().then(function() {
    $scope.changeChannel($scope.channels[0]);
  });

}];

var chatModule = angular.module('chatModule', ["firebase"]);
chatModule.controller('ChatController', ChatController);

chatModule.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      //var mh_window = $('.message-history');
      console.log(scope.message.send_on_enter);
      element.bind("keydown keypress", function(event) {
        if(event.which === 13 && scope.message.send_on_enter) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          /*console.log(mh_window.scrollTop(), (mh_window[0].scrollHeight - mh_window.height() - 20));
          if(mh_window.scrollTop() > (mh_window[0].scrollHeight - mh_window.height() - 20)) {
            console.log("estaba hasta abajo!");
            mh_window.scrollTop(mh_window[0].scrollHeight);
          } else {
            console.log("estaba hasta arriba");
          }*/
          //console.log(mh_window.scrollTop(), mh_window[0].scrollHeight);
          event.preventDefault();
        }
      });
    }
  };
});

chatModule.directive('youtube', function($sce) {
  return {
    restrict: 'EA',
    scope: { code:'=' },
    replace: true,
    template: '<div style="height:400px;"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
        scope.$watch('code', function (newVal) {
           if (newVal) {
               scope.url = $sce.trustAsResourceUrl("http://www.youtube.com/embed/" + newVal);
           }
        });
    }
  };
});

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
.controller('SearchController', ['$scope', '$timeout', '$http', 'algolia', function ($scope, $timeout, $http, algolia) {
  $scope.open = false;
  $scope.hits = [];
  $scope.query = '';
  $scope.loading = false;
  $scope.fetching = true;

  $scope.statistics = {
    total: 0,
    time: 0
  }

  var client = algolia.Client('5AO6WVBTY2', '46253cb75bbb7b4e031d41cda14c2426');
  var index = client.initIndex('prod_spartan');

  $scope.toggle = function() {
    $scope.open = !$scope.open;
    jQuery("#search-layout input").trigger( "focus" );
  }

  $scope.do = function(event) {

    var previous = $scope.query
    if(event.keyCode == 27){
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
        index.search($scope.query)
          .then(function searchSuccess(content) {
            console.log(content);
            $scope.hits = content.hits;
            $scope.statistics.total = content.nbHits;
            $scope.statistics.time = content.processingTimeMS;
          }, function searchFailure(err) {
            console.log(err);
          });
        $scope.fetching = false;
      }, 200); // delay in ms
    }
    else
    {
      $scope.hits = [];
    }
  };

}]);


// @codekit-prepend "common/directives"
// @codekit-prepend "common/filters"
// @codekit-prepend "common/active_reader"
// @codekit-prepend "common/services"
// @codekit-prepend "vendor/angular-marked"
// @codekit-prepend "vendor/wizzy"
// @codekit-prepend "vendor/infinite-scroll"
// @codekit-prepend "vendor/ui-bootstrap-tpls-0.13.0.min"
// @codekit-prepend "vendor/angular-facebook"
// @codekit-prepend "vendor/ng-file-upload-all.min.js"
// @codekit-prepend "vendor/elastic.js"
// @codekit-prepend "vendor/mentio.min.js"
// @codekit-prepend "vendor/angular-ui-switch.min.js"
// @codekit-prepend "vendor/angular-acl.min.js"
// @codekit-prepend "vendor/angular-timeago.js"
// @codekit-prepend "vendor/algoliasearch.angular.min.js"
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

var boardApplication = angular.module('board', [
  'ngRoute',
	'directivesModule',
	'filtersModule',
  'sg.services',
	'activeReader',
  'hc.marked',
  'idiotWizzy',
  'infinite-scroll',
  'ui.bootstrap',
  'facebook',
	'feedModule',
  'categoryModule',
  'readerModule',
	'publisherModule',
  'partModule',
  'userModule',
  'rankModule',
  'sg.module.badges',
  'sg.module.top',
  'chatModule',
  'angular-jwt',
  'firebase',
  'ngFileUpload',
  'monospaced.elastic',
  'mentio',
  'uiSwitch',
  'mm.acl',
  'yaru22.angular-timeago',
  'searchBar'
]);

var version = '0.1.4.6';

boardApplication.config(['$httpProvider', 'jwtInterceptorProvider', '$routeProvider', '$locationProvider', 'FacebookProvider', 'markedProvider', 'AclServiceProvider',
  function($httpProvider, jwtInterceptorProvider, $routeProvider, $locationProvider, FacebookProvider, markedProvider, AclServiceProvider) {

  $routeProvider.when('/home', {
    templateUrl: '/js/partials/home.html?v=' + version
  });
  $routeProvider.when('/about', {
    templateUrl: '/js/partials/about.html?v=' + version
  });
  $routeProvider.when('/tienda', {
    templateUrl: '/js/partials/shop.html?v=' + version
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
  $routeProvider.when('/chat', {
    templateUrl: '/js/partials/chat.html?v=' + version,
    controller: 'ChatController'
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

  // ACL Configuration
  AclServiceProvider.config({storage: false});
}]);

boardApplication.controller('SignInController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Facebook',
  function($scope, $rootScope, $http, $modalInstance, Facebook) {
  	$scope.form = {
  		email: '',
  		password: '',
  		error: false
  	};

    $scope.fb_loading = false;

  	$scope.signIn = function() {
  		if ($scope.form.email === '' || $scope.form.password === '') {
  			$scope.form.error = {message: 'Ambos campos son necesarios'};
  			return;
  		}

  		// Post credentials to the auth rest point
  		$http.get(layer_path + 'auth/get-token', {params: {email: $scope.form.email, password: $scope.form.password}, skipAuthorization: true})
      .error(function(data, status, headers, config) {
        $scope.form.error = {message:'Usuario o contraseña incorrecta.'};
      })
      .success(function(data) {
        localStorage.setItem('id_token', data.token);
        localStorage.setItem('firebase_token', data.firebase);
        localStorage.setItem('signed_in', true);
        //console.log(data.token, data.firebase);
        $modalInstance.dismiss('logged');
        $rootScope.$broadcast('login');
        //$rootScope.$broadcast('status_change');
      });
  	};

  	$scope.cancel = function() {
  		$modalInstance.dismiss('cancel');
  	};

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      var response;
      if($rootScope.fb_response.status === 'connected') {
        response = $rootScope.fb_response;
        $scope.fb_try(response);
      } else {
        Facebook.login(function(response) {
          $scope.fb_try(response);
        }, {scope: 'public_profile,email'});
      }
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
              $scope.form.error = {message:'No se pudo iniciar sesión.'};
            })
            .success(function(data) {
              localStorage.setItem('id_token', data.token);
              localStorage.setItem('firebase_token', data.firebase);
              localStorage.setItem('signed_in', true);
              //console.log(data.token, data.firebase);
              $modalInstance.dismiss('logged');
              $rootScope.$broadcast('login');
              //$rootScope.$broadcast('status_change');
            });
        }).
        error(function(data, status, headers, config) {
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
  }
]);

boardApplication.controller('SignUpController', ['$scope', '$rootScope', '$http', '$modalInstance', 'Facebook',
  function($scope, $rootScope, $http, $modalInstance, Facebook) {
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

      //console.log(payload);

  		$http.post(layer_path + 'user', payload, { skipAuthorization: true })
      .error(function(data, status, headers, config) {
        console.log(data.message);
        $scope.form.error = { message:'El usuario o correo elegido ya existe.' };
      })
      .success(function(data) {
        localStorage.setItem('id_token', data.token);
        localStorage.setItem('firebase_token', data.firebase);
        localStorage.setItem('signed_in', true);
        $modalInstance.dismiss('signed');
        $rootScope.$broadcast('login');
        //$rootScope.$broadcast('status_change');
  		});
  	};

  	$scope.ok = function (){
  		$modalInstance.close($scope.selected.item);
  	};

  	$scope.cancel = function () {
  		$modalInstance.dismiss('cancel');
  	};

    $scope.loginFb = function() {
      $scope.fb_loading = true;
      var response;
      if($rootScope.fb_response.status === 'connected') {
        response = $rootScope.fb_response;
        $scope.fb_try(response);
      } else {
        Facebook.login(function(response) {
          $scope.fb_try(response);
        }, {scope: 'public_profile,email'});
      }
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
              $scope.form.error = {message:'No se pudo iniciar sesión.'};
            })
            .success(function(data) {
              localStorage.setItem('id_token', data.token);
              localStorage.setItem('firebase_token', data.firebase);
              localStorage.setItem('signed_in', true);
              //console.log(data.token, data.firebase);
              $modalInstance.dismiss('logged');
              $rootScope.$broadcast('login');
              //$rootScope.$broadcast('status_change');
            });
        }).
        error(function(data, status, headers, config) {
          $scope.form.error = {message: 'Error conectando con FB'};
          return;
        });
    }
}]);

boardApplication.controller('MainController', ['$scope', '$rootScope', '$http', '$modal', '$timeout', '$firebaseObject', '$firebaseArray', 'Facebook', 'AclService', '$location',
  function($scope, $rootScope, $http, $modal, $timeout, $firebaseObject, $firebaseArray, Facebook, AclService, $location) {
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

    $scope.logUser = function() {
      $http.get(layer_path + 'user/my').then(
        function(response) {
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
              for(var i in data.gaming.badges) {
                for(var j in $scope.misc.gaming.badges) {
                  if(data.gaming.badges[i].id === $scope.misc.gaming.badges[j].id) {
                    $scope.misc.gaming.badges[j].owned = true;
                    break;
                  }
                }
              }

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
            }, 100);
          });

          // FIREBASE PREPARATION
          var userUrl = firebase_url + "users/" + data.id;

          var notificationsCountRef = new Firebase(userUrl + "/notifications/count");
          notificationsCountRef.onAuth(function(authData) {
            if (authData) {
              console.log("Authenticated to Firebase");
            } else {
              console.log("Client unauthenticated.");
              //$scope.signOut();
            }
          });
          notificationsCountRef.authWithCustomToken(localStorage.firebase_token, function(error, authData) {
            if (error) {
              console.log("Login to Firebase failed!", error);
            } else {
              var amOnline = new Firebase(firebase_url + '.info/connected');
              //var userRef = new Firebase('https://spartangeek.firebaseio.com/presence/' + data.id);
              var presenceRef = new Firebase(userUrl + '/online');
              var categoryRef = new Firebase(userUrl + '/viewing');
              var pendingRef = new Firebase(userUrl + '/pending');
              amOnline.on('value', function(snapshot) {
                if(snapshot.val()) {
                  //userRef.onDisconnect().remove();
                  presenceRef.onDisconnect().set(0);
                  categoryRef.onDisconnect().remove();
                  presenceRef.set(1);
                  categoryRef.set("all");
                }
              });

              // Gamification attributes
              var gamingRef = new Firebase(userUrl + '/gaming');
              $scope.user.gaming = $firebaseObject(gamingRef);
              $scope.user.gaming.$loaded(function() {});

              // For sync options in newsfeed
              var pending = $firebaseObject(pendingRef);
              pending.$bindTo($scope, "status.pending");
              pending.$loaded(function(){ $scope.status.pending.$value = 0; });

              var viewing = $firebaseObject(categoryRef);
              viewing.$bindTo($scope, "status.viewing");
              //viewing.$loaded(function(){ $scope.status.viewing.$value = 0; });

              // download the data into a local object
              var count = $firebaseObject(notificationsCountRef)
              // synchronize the object with a three-way data binding
              count.$bindTo($scope, "user.notifications.count");
              count.$loaded( function() {
                var to_show = 15;
                if(count.$value > 15){
                  to_show = count.$value;
                }
                var list_ref = new Firebase(userUrl + "/notifications/list");
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

          // Warn everyone
          $timeout(function() {
            $scope.$broadcast('userLogged');
            $scope.$broadcast('changedContainers');
          }, 100);
        },
        function(response) {
          // If error while getting personal info, just log him out
          $scope.signOut();
        });
    }

    $scope.signIn = function() {
      var modalInstance = $modal.open({
        templateUrl: '/js/partials/sign-in.html',
        controller: 'SignInController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signUp = function() {
      var modalInstance = $modal.open({
        templateUrl: '/js/partials/sign-up.html',
        controller: 'SignUpController',
        size: 'sm'
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };

    $scope.signOut = function() {
      localStorage.signed_in = false;
      $scope.user.isLogged = false;
      localStorage.removeItem('id_token');
      localStorage.removeItem('firebase_token');
      window.location = '/';
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

    // If login action sucessfull anywhere, sign in the user
    $scope.$on('login', function(e) {
      $scope.logUser();
    });

    // Check for FB Login Status, this is necessary so later calls doesn't make
    // the pop up to be blocked by the browser
    Facebook.getLoginStatus(function(r){$rootScope.fb_response = r;});

    // If already signed in, sign in the user
    if(localStorage.signed_in === 'true') {
      $scope.logUser();
    }

    // Load platform stats
    $scope.promises.board_stats = $http.get(layer_path + 'stats/board').
      success(function(data, status) {
        $scope.status.stats = data;
      }).
      error(function(data) {
      });

    // Load gamification data
    $scope.promises.gaming = $http.get(layer_path + 'gamification').
      success(function(data, status) {
        //console.log(data)
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
      }).
      error(function(data) {});

    var ref = $location.search().ref;
    if(ref != undefined) {
      localStorage.setItem('ref', ref);
    }
    //alert(localStorage.getItem('ref'))
  }
]);

boardApplication.run(['$rootScope', '$http', 'AclService', 'AdvancedAcl', function($rootScope, $http, AclService, AdvancedAcl) {
  // TEST PURPOSES
  if(false) {
    localStorage.removeItem('signed_in');
    localStorage.removeItem('id_token');
    localStorage.removeItem('firebase_token');
  }

  // Initialize the local storage
  if(!localStorage.signed_in)
    localStorage.signed_in = false;

  $rootScope.page = {
    title: "SpartanGeek.com | Comunidad de tecnología, geeks y más",
    description: "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos."
  };

  // Set the ACL data.
  // The data should have the roles as the property names,
  // with arrays listing their permissions as their value.
  var aclData = {}
  $http.get(layer_path + 'permissions')
    .error(function(data) {}) // How should we proceed if no data?
    .success(function(data) {
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
    });
  $rootScope.can = AclService.can;
  $rootScope.aacl = AdvancedAcl;
}]);

