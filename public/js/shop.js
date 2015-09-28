/*!
 * classie - class helper functions
 * from bonzo https://github.com/ded/bonzo
 * 
 * classie.has( elem, 'my-class' ) -> true/false
 * classie.add( elem, 'my-new-class' )
 * classie.remove( elem, 'my-unwanted-class' )
 * classie.toggle( elem, 'my-class' )
 */

/*jshint browser: true, strict: true, undef: true */
/*global define: false */

( function( window ) {

'use strict';

// class helper functions from bonzo https://github.com/ded/bonzo

function classReg( className ) {
  return new RegExp("(^|\\s+)" + className + "(\\s+|$)");
}

// classList support for class management
// altho to be fair, the api sucks because it won't accept multiple classes at once
var hasClass, addClass, removeClass;

if ( 'classList' in document.documentElement ) {
  hasClass = function( elem, c ) {
    return elem.classList.contains( c );
  };
  addClass = function( elem, c ) {
    elem.classList.add( c );
  };
  removeClass = function( elem, c ) {
    elem.classList.remove( c );
  };
}
else {
  hasClass = function( elem, c ) {
    return classReg( c ).test( elem.className );
  };
  addClass = function( elem, c ) {
    if ( !hasClass( elem, c ) ) {
      elem.className = elem.className + ' ' + c;
    }
  };
  removeClass = function( elem, c ) {
    elem.className = elem.className.replace( classReg( c ), ' ' );
  };
}

function toggleClass( elem, c ) {
  var fn = hasClass( elem, c ) ? removeClass : addClass;
  fn( elem, c );
}

var classie = {
  // full names
  hasClass: hasClass,
  addClass: addClass,
  removeClass: removeClass,
  toggleClass: toggleClass,
  // short names
  has: hasClass,
  add: addClass,
  remove: removeClass,
  toggle: toggleClass
};

// transport
if ( typeof define === 'function' && define.amd ) {
  // AMD
  define( classie );
} else {
  // browser global
  window.classie = classie;
}

})( window );


/**
 * fullscreenForm.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2014, Codrops
 * http://www.codrops.com
 */
;( function( window ) {

	'use strict';

	var support = { animations : Modernizr.cssanimations },
		animEndEventNames = { 'WebkitAnimation' : 'webkitAnimationEnd', 'OAnimation' : 'oAnimationEnd', 'msAnimation' : 'MSAnimationEnd', 'animation' : 'animationend' },
		// animation end event name
		animEndEventName = animEndEventNames[ Modernizr.prefixed( 'animation' ) ];

	/**
	 * extend obj function
	 */
	function extend( a, b ) {
		for( var key in b ) {
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * createElement function
	 * creates an element with tag = tag, className = opt.cName, innerHTML = opt.inner and appends it to opt.appendTo
	 */
	function createElement( tag, opt ) {
		var el = document.createElement( tag )
		if( opt ) {
			if( opt.cName ) {
				el.className = opt.cName;
			}
			if( opt.inner ) {
				el.innerHTML = opt.inner;
			}
			if( opt.appendTo ) {
				opt.appendTo.appendChild( el );
			}
		}
		return el;
	}

	/**
	 * FForm function
	 */
	function FForm( el, options ) {
		this.el = el;
		this.options = extend( {}, this.options );
  		extend( this.options, options );
  		this._init();
	}

	/**
	 * FForm options
	 */
	FForm.prototype.options = {
		// show progress bar
		ctrlProgress : true,
		// show navigation dots
		ctrlNavDots : true,
		// show [current field]/[total fields] status
		ctrlNavPosition : true,
		// reached the review and submit step
		onReview : function() { return false; }
	};

	/**
	 * init function
	 * initialize and cache some vars
	 */
	FForm.prototype._init = function() {
		// the form element
		this.formEl = this.el.querySelector( 'form' );

		// list of fields
		this.fieldsList = this.formEl.querySelector( 'ol.fs-fields' );

		// current field position
		this.current = 0;

		// all fields
		this.fields = [].slice.call( this.fieldsList.children );

		// total fields
		this.fieldsCount = this.fields.length;

		// show first field
		classie.add( this.fields[ this.current ], 'fs-current' );

		// create/add controls
		this._addControls();

		// create/add messages
		this._addErrorMsg();

		// init events
		this._initEvents();
	};

	/**
	 * addControls function
	 * create and insert the structure for the controls
	 */
	FForm.prototype._addControls = function() {
		// main controls wrapper
		this.ctrls = createElement( 'div', { cName : 'fs-controls', appendTo : this.el } );

		// continue button (jump to next field)
		this.ctrlContinue = createElement( 'button', { cName : 'fs-continue', inner : 'Siguiente', appendTo : this.ctrls } );
		this._showCtrl( this.ctrlContinue );

		// navigation dots
		if( this.options.ctrlNavDots ) {
			this.ctrlNav = createElement( 'nav', { cName : 'fs-nav-dots', appendTo : this.ctrls } );
			var dots = '';
			for( var i = 0; i < this.fieldsCount; ++i ) {
				dots += i === this.current ? '<button class="fs-dot-current"></button>' : '<button disabled></button>';
			}
			this.ctrlNav.innerHTML = dots;
			this._showCtrl( this.ctrlNav );
			this.ctrlNavDots = [].slice.call( this.ctrlNav.children );
		}

		// field number status
		if( this.options.ctrlNavPosition ) {
			this.ctrlFldStatus = createElement( 'span', { cName : 'fs-numbers', appendTo : this.ctrls } );

			// current field placeholder
			this.ctrlFldStatusCurr = createElement( 'span', { cName : 'fs-number-current', inner : Number( this.current + 1 ) } );
			this.ctrlFldStatus.appendChild( this.ctrlFldStatusCurr );

			// total fields placeholder
			this.ctrlFldStatusTotal = createElement( 'span', { cName : 'fs-number-total', inner : this.fieldsCount } );
			this.ctrlFldStatus.appendChild( this.ctrlFldStatusTotal );
			this._showCtrl( this.ctrlFldStatus );
		}

		// progress bar
		if( this.options.ctrlProgress ) {
			this.ctrlProgress = createElement( 'div', { cName : 'fs-progress', appendTo : this.ctrls } );
			this._showCtrl( this.ctrlProgress );
		}
	}

	/**
	 * addErrorMsg function
	 * create and insert the structure for the error message
	 */
	FForm.prototype._addErrorMsg = function() {
		// error message
		this.msgError = createElement( 'span', { cName : 'fs-message-error', appendTo : this.el } );
	}

	/**
	 * init events
	 */
	FForm.prototype._initEvents = function() {
		var self = this;

		// show next field
		this.ctrlContinue.addEventListener( 'click', function() {
			self._nextField();
		} );

		// navigation dots
		if( this.options.ctrlNavDots ) {
			this.ctrlNavDots.forEach( function( dot, pos ) {
				dot.addEventListener( 'click', function() {
					self._showField( pos );
				} );
			} );
		}

		// jump to next field without clicking the continue button (for fields/list items with the attribute "data-input-trigger")
		this.fields.forEach( function( fld ) {
			if( fld.hasAttribute( 'data-input-trigger' ) ) {
				var input = fld.querySelector( 'input[type="radio"]' ) || /*fld.querySelector( '.cs-select' ) ||*/ fld.querySelector( 'select' ); // assuming only radio and select elements (TODO: exclude multiple selects)
				if( !input ) return;

				switch( input.tagName.toLowerCase() ) {
					case 'select' :
						input.addEventListener( 'change', function() { self._nextField(); } );
						break;

					case 'input' :
						[].slice.call( fld.querySelectorAll( 'input[type="radio"]' ) ).forEach( function( inp ) {
							inp.addEventListener( 'change', function(ev) { self._nextField(); } );
						} );
						break;

					/*
					// for our custom select we would do something like:
					case 'div' :
						[].slice.call( fld.querySelectorAll( 'ul > li' ) ).forEach( function( inp ) {
							inp.addEventListener( 'click', function(ev) { self._nextField(); } );
						} );
						break;
					*/
				}
			}
		} );

		// keyboard navigation events - jump to next field when pressing enter
		document.addEventListener( 'keydown', function( ev ) {
			if( !self.isLastStep && ev.target.tagName.toLowerCase() !== 'textarea' ) {
				var keyCode = ev.keyCode || ev.which;
				if( keyCode === 13 ) {
					ev.preventDefault();
					self._nextField();
				}
			}
		} );
	};

	/**
	 * nextField function
	 * jumps to the next field
	 */
	FForm.prototype._nextField = function( backto ) {
		if( this.isLastStep || !this._validade() || this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;

		// check if on last step
		this.isLastStep = this.current === this.fieldsCount - 1 && backto === undefined ? true : false;

		// clear any previous error messages
		this._clearError();

		// current field
		var currentFld = this.fields[ this.current ];

		// save the navigation direction
		this.navdir = backto !== undefined ? backto < this.current ? 'prev' : 'next' : 'next';

		// update current field
		this.current = backto !== undefined ? backto : this.current + 1;

		if( backto === undefined ) {
			// update progress bar (unless we navigate backwards)
			this._progress();

			// save farthest position so far
			this.farthest = this.current;
		}

		// add class "fs-display-next" or "fs-display-prev" to the list of fields
		classie.add( this.fieldsList, 'fs-display-' + this.navdir );

		// remove class "fs-current" from current field and add it to the next one
		// also add class "fs-show" to the next field and the class "fs-hide" to the current one
		classie.remove( currentFld, 'fs-current' );
		classie.add( currentFld, 'fs-hide' );

		if( !this.isLastStep ) {
			// update nav
			this._updateNav();

			// change the current field number/status
			this._updateFieldNumber();

			var nextField = this.fields[ this.current ];
			classie.add( nextField, 'fs-current' );
			classie.add( nextField, 'fs-show' );
		}

		// after animation ends remove added classes from fields
		var self = this,
			onEndAnimationFn = function( ev ) {
				if( support.animations ) {
					this.removeEventListener( animEndEventName, onEndAnimationFn );
				}

				classie.remove( self.fieldsList, 'fs-display-' + self.navdir );
				classie.remove( currentFld, 'fs-hide' );

				if( self.isLastStep ) {
					// show the complete form and hide the controls
					self._hideCtrl( self.ctrlNav );
					self._hideCtrl( self.ctrlProgress );
					self._hideCtrl( self.ctrlContinue );
					self._hideCtrl( self.ctrlFldStatus );
					// replace class fs-form-full with fs-form-overview
					classie.remove( self.formEl, 'fs-form-full' );
					classie.add( self.formEl, 'fs-form-overview' );
					classie.add( self.formEl, 'fs-show' );
					// callback
					self.options.onReview();
				}
				else {
					classie.remove( nextField, 'fs-show' );

					if( self.options.ctrlNavPosition ) {
						self.ctrlFldStatusCurr.innerHTML = self.ctrlFldStatusNew.innerHTML;
						self.ctrlFldStatus.removeChild( self.ctrlFldStatusNew );
						classie.remove( self.ctrlFldStatus, 'fs-show-' + self.navdir );
					}
				}
				self.isAnimating = false;
			};

		if( support.animations ) {
			if( this.navdir === 'next' ) {
				if( this.isLastStep ) {
					currentFld.querySelector( '.fs-anim-upper' ).addEventListener( animEndEventName, onEndAnimationFn );
				}
				else {
					nextField.querySelector( '.fs-anim-lower' ).addEventListener( animEndEventName, onEndAnimationFn );
				}
			}
			else {
				nextField.querySelector( '.fs-anim-upper' ).addEventListener( animEndEventName, onEndAnimationFn );
			}
		}
		else {
			onEndAnimationFn();
		}
	}

	/**
	 * showField function
	 * jumps to the field at position pos
	 */
	FForm.prototype._showField = function( pos ) {
		if( pos === this.current || pos < 0 || pos > this.fieldsCount - 1 ) {
			return false;
		}
		this._nextField( pos );
	}

	/**
	 * updateFieldNumber function
	 * changes the current field number
	 */
	FForm.prototype._updateFieldNumber = function() {
		if( this.options.ctrlNavPosition ) {
			// first, create next field number placeholder
			this.ctrlFldStatusNew = document.createElement( 'span' );
			this.ctrlFldStatusNew.className = 'fs-number-new';
			this.ctrlFldStatusNew.innerHTML = Number( this.current + 1 );

			// insert it in the DOM
			this.ctrlFldStatus.appendChild( this.ctrlFldStatusNew );

			// add class "fs-show-next" or "fs-show-prev" depending on the navigation direction
			var self = this;
			setTimeout( function() {
				classie.add( self.ctrlFldStatus, self.navdir === 'next' ? 'fs-show-next' : 'fs-show-prev' );
			}, 25 );
		}
	}

	/**
	 * progress function
	 * updates the progress bar by setting its width
	 */
	FForm.prototype._progress = function() {
		if( this.options.ctrlProgress ) {
			this.ctrlProgress.style.width = this.current * ( 100 / this.fieldsCount ) + '%';
		}
	}

	/**
	 * updateNav function
	 * updates the navigation dots
	 */
	FForm.prototype._updateNav = function() {
		if( this.options.ctrlNavDots ) {
			classie.remove( this.ctrlNav.querySelector( 'button.fs-dot-current' ), 'fs-dot-current' );
			classie.add( this.ctrlNavDots[ this.current ], 'fs-dot-current' );
			this.ctrlNavDots[ this.current ].disabled = false;
		}
	}

	/**
	 * showCtrl function
	 * shows a control
	 */
	FForm.prototype._showCtrl = function( ctrl ) {
		classie.add( ctrl, 'fs-show' );
	}

	/**
	 * hideCtrl function
	 * hides a control
	 */
	FForm.prototype._hideCtrl = function( ctrl ) {
		classie.remove( ctrl, 'fs-show' );
	}

	// TODO: this is a very basic validation function. Only checks for required fields..
	FForm.prototype._validade = function() {
		var fld = this.fields[ this.current ],
			input = fld.querySelector( 'input[required]' ) || fld.querySelector( 'textarea[required]' ) || fld.querySelector( 'select[required]' ),
			error;

		if( !input ) return true;

		switch( input.tagName.toLowerCase() ) {
			case 'input' :
				if( input.type === 'radio' || input.type === 'checkbox' ) {
					var checked = 0;
					[].slice.call( fld.querySelectorAll( 'input[type="' + input.type + '"]' ) ).forEach( function( inp ) {
						if( inp.checked ) {
							++checked;
						}
					} );
					if( !checked ) {
						error = 'NOVAL';
					}
				}
				else if( input.value === '' ) {
					error = 'NOVAL';
				}
				break;

			case 'select' :
				// assuming here '' or '-1' only
				if( input.value === '' || input.value === '-1' ) {
					error = 'NOVAL';
				}
				break;

			case 'textarea' :
				if( input.value === '' ) {
					error = 'NOVAL';
				}
				break;
		}

		if( error != undefined ) {
			this._showError( error );
			return false;
		}

		return true;
	}

	// TODO
	FForm.prototype._showError = function( err ) {
		var message = '';
		switch( err ) {
			case 'NOVAL' :
				message = 'Completa el campo antes de continuar por favor';
				break;
			case 'INVALIDEMAIL' :
				message = 'Escribe un email válido por favor';
				break;
			// ...
		};
		this.msgError.innerHTML = message;
		this._showCtrl( this.msgError );
	}

	// clears/hides the current error message
	FForm.prototype._clearError = function() {
		this._hideCtrl( this.msgError );
	}

	// add to global namespace
	window.FForm = FForm;

})( window );

/**
 * selectFx.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Codrops
 * http://www.codrops.com
 */
;( function( window ) {
	
	'use strict';

	/**
	 * based on from https://github.com/inuyaksa/jquery.nicescroll/blob/master/jquery.nicescroll.js
	 */
	function hasParent( e, p ) {
		if (!e) return false;
		var el = e.target||e.srcElement||e||false;
		while (el && el != p) {
			el = el.parentNode||false;
		}
		return (el!==false);
	};
	
	/**
	 * extend obj function
	 */
	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * SelectFx function
	 */
	function SelectFx( el, options ) {	
		this.el = el;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
	}

	/**
	 * SelectFx options
	 */
	SelectFx.prototype.options = {
		// if true all the links will open in a new tab.
		// if we want to be redirected when we click an option, we need to define a data-link attr on the option of the native select element
		newTab : true,
		// when opening the select element, the default placeholder (if any) is shown
		stickyPlaceholder : true,
		// callback when changing the value
		onChange : function( val ) { return false; }
	}

	/**
	 * init function
	 * initialize and cache some vars
	 */
	SelectFx.prototype._init = function() {
		// check if we are using a placeholder for the native select box
		// we assume the placeholder is disabled and selected by default
		var selectedOpt = this.el.querySelector( 'option[selected]' );
		this.hasDefaultPlaceholder = selectedOpt && selectedOpt.disabled;

		// get selected option (either the first option with attr selected or just the first option)
		this.selectedOpt = selectedOpt || this.el.querySelector( 'option' );

		// create structure
		this._createSelectEl();

		// all options
		this.selOpts = [].slice.call( this.selEl.querySelectorAll( 'li[data-option]' ) );
		
		// total options
		this.selOptsCount = this.selOpts.length;
		
		// current index
		this.current = this.selOpts.indexOf( this.selEl.querySelector( 'li.cs-selected' ) ) || -1;
		
		// placeholder elem
		this.selPlaceholder = this.selEl.querySelector( 'span.cs-placeholder' );

		// init events
		this._initEvents();
	}

	/**
	 * creates the structure for the select element
	 */
	SelectFx.prototype._createSelectEl = function() {
		var self = this, options = '', createOptionHTML = function(el) {
			var optclass = '', classes = '', link = '';

			if( el.selectedOpt && !this.foundSelected && !this.hasDefaultPlaceholder ) {
				classes += 'cs-selected ';
				this.foundSelected = true;
			}
			// extra classes
			if( el.getAttribute( 'data-class' ) ) {
				classes += el.getAttribute( 'data-class' );
			}
			// link options
			if( el.getAttribute( 'data-link' ) ) {
				link = 'data-link=' + el.getAttribute( 'data-link' );
			}

			if( classes !== '' ) {
				optclass = 'class="' + classes + '" ';
			}

			return '<li ' + optclass + link + ' data-option data-value="' + el.value + '"><span>' + el.textContent + '</span></li>';
		};

		[].slice.call( this.el.children ).forEach( function(el) {
			if( el.disabled ) { return; }

			var tag = el.tagName.toLowerCase();

			if( tag === 'option' ) {
				options += createOptionHTML(el);
			}
			else if( tag === 'optgroup' ) {
				options += '<li class="cs-optgroup"><span>' + el.label + '</span><ul>';
				[].slice.call( el.children ).forEach( function(opt) {
					options += createOptionHTML(opt);
				} )
				options += '</ul></li>';
			}
		} );

		var opts_el = '<div class="cs-options"><ul>' + options + '</ul></div>';
		this.selEl = document.createElement( 'div' );
		this.selEl.className = this.el.className;
		this.selEl.tabIndex = this.el.tabIndex;
		this.selEl.innerHTML = '<span class="cs-placeholder">' + this.selectedOpt.textContent + '</span>' + opts_el;
		this.el.parentNode.appendChild( this.selEl );
		this.selEl.appendChild( this.el );
	}

	/**
	 * initialize the events
	 */
	SelectFx.prototype._initEvents = function() {
		var self = this;

		// open/close select
		this.selPlaceholder.addEventListener( 'click', function() {
			self._toggleSelect();
		} );

		// clicking the options
		this.selOpts.forEach( function(opt, idx) {
			opt.addEventListener( 'click', function() {
				self.current = idx;
				self._changeOption();
				// close select elem
				self._toggleSelect();
			} );
		} );

		// close the select element if the target it´s not the select element or one of its descendants..
		document.addEventListener( 'click', function(ev) {
			var target = ev.target;
			if( self._isOpen() && target !== self.selEl && !hasParent( target, self.selEl ) ) {
				self._toggleSelect();
			}
		} );

		// keyboard navigation events
		this.selEl.addEventListener( 'keydown', function( ev ) {
			var keyCode = ev.keyCode || ev.which;

			switch (keyCode) {
				// up key
				case 38:
					ev.preventDefault();
					self._navigateOpts('prev');
					break;
				// down key
				case 40:
					ev.preventDefault();
					self._navigateOpts('next');
					break;
				// space key
				case 32:
					ev.preventDefault();
					if( self._isOpen() && typeof self.preSelCurrent != 'undefined' && self.preSelCurrent !== -1 ) {
						self._changeOption();
					}
					self._toggleSelect();
					break;
				// enter key
				case 13:
					ev.stopPropagation();
					ev.preventDefault();
					if( self._isOpen() && typeof self.preSelCurrent != 'undefined' && self.preSelCurrent !== -1 ) {
						self._changeOption();
						self._toggleSelect();
					}
					break;
				// esc key
				case 27:
					ev.preventDefault();
					if( self._isOpen() ) {
						self._toggleSelect();
					}
					break;
			}
		} );
	}

	/**
	 * navigate with up/dpwn keys
	 */
	SelectFx.prototype._navigateOpts = function(dir) {
		if( !this._isOpen() ) {
			this._toggleSelect();
		}

		var tmpcurrent = typeof this.preSelCurrent != 'undefined' && this.preSelCurrent !== -1 ? this.preSelCurrent : this.current;
		
		if( dir === 'prev' && tmpcurrent > 0 || dir === 'next' && tmpcurrent < this.selOptsCount - 1 ) {
			// save pre selected current - if we click on option, or press enter, or press space this is going to be the index of the current option
			this.preSelCurrent = dir === 'next' ? tmpcurrent + 1 : tmpcurrent - 1;
			// remove focus class if any..
			this._removeFocus();
			// add class focus - track which option we are navigating
			classie.add( this.selOpts[this.preSelCurrent], 'cs-focus' );
		}
	}

	/**
	 * open/close select
	 * when opened show the default placeholder if any
	 */
	SelectFx.prototype._toggleSelect = function() {
		// remove focus class if any..
		this._removeFocus();
		
		if( this._isOpen() ) {
			if( this.current !== -1 ) {
				// update placeholder text
				this.selPlaceholder.textContent = this.selOpts[ this.current ].textContent;
			}
			classie.remove( this.selEl, 'cs-active' );
		}
		else {
			if( this.hasDefaultPlaceholder && this.options.stickyPlaceholder ) {
				// everytime we open we wanna see the default placeholder text
				this.selPlaceholder.textContent = this.selectedOpt.textContent;
			}
			classie.add( this.selEl, 'cs-active' );
		}
	}

	/**
	 * change option - the new value is set
	 */
	SelectFx.prototype._changeOption = function() {
		// if pre selected current (if we navigate with the keyboard)...
		if( typeof this.preSelCurrent != 'undefined' && this.preSelCurrent !== -1 ) {
			this.current = this.preSelCurrent;
			this.preSelCurrent = -1;
		}

		// current option
		var opt = this.selOpts[ this.current ];

		// update current selected value
		this.selPlaceholder.textContent = opt.textContent;
		
		// change native select element´s value
		this.el.value = opt.getAttribute( 'data-value' );

		// remove class cs-selected from old selected option and add it to current selected option
		var oldOpt = this.selEl.querySelector( 'li.cs-selected' );
		if( oldOpt ) {
			classie.remove( oldOpt, 'cs-selected' );
		}
		classie.add( opt, 'cs-selected' );

		// if there´s a link defined
		if( opt.getAttribute( 'data-link' ) ) {
			// open in new tab?
			if( this.options.newTab ) {
				window.open( opt.getAttribute( 'data-link' ), '_blank' );
			}
			else {
				window.location = opt.getAttribute( 'data-link' );
			}
		}

		// callback
		this.options.onChange( this.el.value );
	}

	/**
	 * returns true if select element is opened
	 */
	SelectFx.prototype._isOpen = function(opt) {
		return classie.has( this.selEl, 'cs-active' );
	}

	/**
	 * removes the focus class from the option
	 */
	SelectFx.prototype._removeFocus = function(opt) {
		var focusEl = this.selEl.querySelector( 'li.cs-focus' )
		if( focusEl ) {
			classie.remove( focusEl, 'cs-focus' );
		}
	}

	/**
	 * add to global namespace
	 */
	window.SelectFx = SelectFx;

} )( window );

// @codekit-prepend "shop/classie"
// @codekit-prepend "shop/fullscreenForm"
// @codekit-prepend "shop/selectFx"

