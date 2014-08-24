
/**
 * Requires
 */

var Lexer = require('./Lexer')
  , AST = require('./AST')
  , _ = require('underscore');

/**
 * Constants
 */

var STARTING_BRACKET = '{'
  , ENDING_BRACKET = '}'
  , ESCAPE_CHARACTER = '\\'
  , PLURAL_REMAINING = '#'
  , DIAGRAPH = '|'
  , EMPTY = ''
  , COMMA = ','
  , EOF = -1;

/**
 * MessageFormat class
 *
 * @constructor
 */

function MessageFormat() {
  this.lexer = null;
  this.messageAST = [];
  this.currentToken = null;
  this.lastChoiceCase = null;
  this.pluralKeywords = ['zero', 'one', 'two', 'few', 'many', 'other'];
};

/**
 * Parse message
 *
 * @param {String} string
 * @return {void}
 */

MessageFormat.prototype.parse = function(message) {
  this.messageAST = [];
  this.lexer = new Lexer(message);
  this.currentToken = this.lexer.getNextToken();
  while(this.currentToken !== EOF) {
    this.messageAST.push(this._parsePrimary());
  }
};

/**
 * Handle top level expresion
 *
 * @return {AST}
 * @api private
 */

MessageFormat.prototype._parsePrimary = function(options) {
  options = _.defaults(options || {}, {
    remaining: false
  });

  if(options.remaining && this.currentToken === PLURAL_REMAINING) {
    return this._parsePluralRemaining();
  }

  switch(this.currentToken) {
    case STARTING_BRACKET:
      return this._parseBracketStatement();
    default:
      return this._parseSentence();
  }
};

/**
 * Parse plural remaining
 *
 * @return {AST.PluralRemaining}
 * @api private
 */

MessageFormat.prototype._parsePluralRemaining = function() {
  // Swallow '#'
  this.currentToken = this.lexer.getNextToken();

  return new AST.PluralRemaining();
};

/**
 * Parse sentence
 *
 * @return {AST.Sentence}
 * @api private
 */

MessageFormat.prototype._parseSentence = function() {
  var sentence = '';
  while(this.currentToken !== EOF &&
        this.currentToken !== STARTING_BRACKET &&
        this.currentToken !== ENDING_BRACKET &&
        this.currentToken !== PLURAL_REMAINING &&
        this.currentToken !== DIAGRAPH) {
    if(this.currentToken === ESCAPE_CHARACTER) {
      sentence += this.currentToken;
      this.currentToken = this.lexer.getNextToken();
      sentence += this.currentToken;
    }
    else {
      sentence += this.currentToken;
    }
    this.currentToken = this.lexer.getNextToken();
  }

  return new AST.Sentence(sentence);
};

/**
 * Parse bracket statements (variable|select|plural)
 *
 * @param {Strin}
 * @return {void}
 * @api private
 */

MessageFormat.prototype._parseBracketStatement = function() {
  // Swallow '{'
  this.currentToken = this.lexer.getNextToken();

  var variable = this._parseVariable();

  if(this.currentToken === COMMA) {
    return this._parseSwitchStatement(variable);
  }
  else if(this.currentToken === ENDING_BRACKET ||
          this.currentToken === EOF) {
    this.currentToken = this.lexer.getNextToken();
    return variable;
  }
  else {
    throw new TypeError('Expected \'{\' or \',\', instead got \''
      + this.currentToken + '\' in \'' +  this.lexer.getLatestTokensLog());
  }
};

/**
 * Parse variable
 *
 * @return {AST.Sentence}
 * @api private
 */

MessageFormat.prototype._parseVariable = function() {
  var name = '';

  this._swallowWhiteSpace();

  while(this.currentToken !== EOF &&
        this.currentToken !== STARTING_BRACKET &&
        this.currentToken !== ENDING_BRACKET &&
        this.currentToken !== COMMA) {
    if(!this._isAlphaNumeric(this.currentToken) &&
        (this.currentToken !== ' ' && this.currentToken !== '\t') ) {
      throw new TypeError('Variable names must be alpha numeric, got a \'' + this.currentToken + '\' in ' + this.lexer.getLatestTokensLog());
    }
    name += this.currentToken;
    this.currentToken = this.lexer.getNextToken();
  }

  name = name.trim();

  if(name.length === 0) {
    throw new TypeError('Could not parse variable in ' + this.lexer.getLatestTokensLog());
  }

  if(!this._isAlphaNumeric(name)) {
    throw new TypeError('You can not have spaces or tabs in ' + this.lexer.getLatestTokensLog());
  }

  return new AST.Variable(name);
};

/**
 * Parse switch statement
 *
 * @return {AST}
 * @api private
 * @throw TypeError
 */

MessageFormat.prototype._parseSwitchStatement = function(variable) {
  var type = '', switchStatement = null;
  // Swallow comma
  this.currentToken = this.lexer.getNextToken();

  this._swallowWhiteSpace();

  while(this._isAlphaNumeric(this.currentToken)){
    type += this.currentToken;
    this.currentToken = this.lexer.getNextToken();
  }

  this._swallowWhiteSpace();

  if(this.currentToken !== COMMA) {
    throw new TypeError('Missing comma in: ' + this.lexer.getLatestTokensLog());
  }

  switch(type) {
    case 'choice':
      switchStatement = this._parseChoiceFormat(variable);
      break;
    case 'select':
      switchStatement = this._parseSelectFormat(variable);
      break;
    case 'plural':
      switchStatement = this._parsePluralFormat(variable);
      break;
    default:
      throw new TypeError('Wrong type of ICU format: ' + type);
      break;
  }

  return switchStatement;
};
/**
 * Parse ChoiceFormat
 *
 * @return {AST.Plural}
 * @api private
 */

MessageFormat.prototype._parseChoiceFormat = function(variable) {
  var values = {};

  // Swallow comma
  this.currentToken = this.lexer.getNextToken();
  this.lastChoiceCase = null;
  var _case = this._getChoiceCase();
  while(true) {
    if(_case === EMPTY) {
      throw new TypeError('Missing choice case in ' + this.lexer.getLatestTokensLog());
    }
    var messageAST = [];
    while(this.currentToken !== DIAGRAPH &&
          this.currentToken !== ENDING_BRACKET) {
      messageAST.push(this._parsePrimary());
    }
    values[_case] = messageAST;
    if(this.currentToken === DIAGRAPH) {
      // Swallow diagraph
      this.currentToken = this.lexer.getNextToken();
      _case = this._getChoiceCase();
    }
    else if(this.currentToken === ENDING_BRACKET) {
      // Swallow ending bracket of ChoiceFormat
      this.currentToken = this.lexer.getNextToken();
      return new AST.ChoiceFormat(variable, values);
    }
    else {
      throw new TypeError('You must have a closing bracket in your plural format in ' + this.lexer.getLatestTokensLog());
    }
  }
};

/**
 * Parse SelectFormat
 *
 * @return {AST.Plural}
 * @api private
 */

MessageFormat.prototype._parseSelectFormat = function(variable) {
  var values = {};

  // Swallow comma
  this.currentToken = this.lexer.getNextToken();
  var _case = this._getSelectCase();
  while(true) {
    if(this.currentToken === ENDING_BRACKET) {
      throw new TypeError('Missing \'other\' case in ' + this.lexer.getLatestTokensLog());
    }
    if(this.currentToken !== STARTING_BRACKET) {
      throw new TypeError('Expected bracket \'{\' instead got \'' + this.currentToken + '\' in ' + this.lexer.getLatestTokensLog());
    }
    var messageAST = [];
    this.currentToken = this.lexer.getNextToken();
    while(this.currentToken !== ENDING_BRACKET) {
      messageAST.push(this._parsePrimary());
    }
    values[_case] = messageAST;
    this.currentToken = this.lexer.getNextToken();
    if(_case !== 'other') {
      _case = this._getSelectCase();
    }
    else {
      this._swallowWhiteSpace();
      if(this.currentToken === EOF) {
        throw new TypeError('You must have a closing bracket in your select format in ' + this.lexer.getLatestTokensLog());
      }
      // Swallow ending bracket of PluralFormat
      this.currentToken = this.lexer.getNextToken();
      return new AST.SelectFormat(variable, values);
    }
  }
};

/**
 * Parse PluralFormat
 *
 * @return {AST.Plural}
 * @api private
 */

MessageFormat.prototype._parsePluralFormat = function(variable) {
  var offset = 0
    , values = {}
    , offsetSyntax = /^offset:(\d)$/
    , exactlySyntax = /^=\d+$/;

  // Swallow comma
  this.currentToken = this.lexer.getNextToken();
  var _case = this._getPluralCase();
  while(true) {
    if(offsetSyntax.test(_case)) {
      offset = parseInt(offsetSyntax.exec(_case)[1], 10);
      offsetSyntax.lastIndex = 0;
      _case = this._getPluralCase();
    }
    else if(exactlySyntax.test(_case) || this.pluralKeywords.indexOf(_case) !== -1) {
      if(this.currentToken !== STARTING_BRACKET) {
        throw new TypeError('Expected bracket \'{\' instead got \'' + this.currentToken + '\' in ' + this.lexer.getLatestTokensLog());
      }
      var messageAST = [];
      this.currentToken = this.lexer.getNextToken();
      while(this.currentToken !== ENDING_BRACKET) {
        messageAST.push(this._parsePrimary({ remaining: true }));
      }
      values[_case] = messageAST;
      exactlySyntax.lastIndex = 0;
      // Swallow ending bracket of sub-message
      this.currentToken = this.lexer.getNextToken();
      if(_case !== 'other') {
        _case = this._getPluralCase();
      }
      else {
        this._swallowWhiteSpace();
        // Swallow ending bracket of PluralFormat
        if(this.currentToken === EOF) {
          throw new TypeError('You must have a closing bracket in your plural format in ' + this.lexer.getLatestTokensLog());
        }
        this.currentToken = this.lexer.getNextToken();
        return new AST.PluralFormat(variable, values, offset);
      }
    }
    else {
      throw new TypeError('Missing \'other\' case in ' + this.lexer.getLatestTokensLog());
    }
  }
};

/**
 * Get choice case
 *
 * @return {String}
 * @api private
 */


MessageFormat.prototype._getChoiceCase = function() {
  var _case = '';

  this._swallowWhiteSpace();
  while(/^[\d∞\-\.<#]$/.test(this.currentToken)) {
    _case += this.currentToken;
    this.currentToken = this.lexer.getNextToken();
  }

  if(!/^(\-?\d+\.?\d*[<#]|∞#|\-∞[<#])$/.test(_case)) {
    throw new TypeError('Expected a ChoiceFormat case (/^(\\-?\\d+\\.?\\d*[<#]|∞#|\\-∞[<#])$/), instead got \'' + _case + '\' in ' + this.lexer.getLatestTokensLog());
  }

  if(_case === this.lastChoiceCase) {
    throw new TypeError('Same ChoiceFormat case in ' + this.lexer.getLatestTokensLog());
  }

  if(this.lastChoiceCase === null) {
    this.lastChoiceCase = _case;

    return _case;
  }

  var comparatorStringOfNewCase = _case.charAt(_case.length - 1)
    , comparatorStringOfOldCase = this.lastChoiceCase.charAt(this.lastChoiceCase.length - 1)
    , numberStringOfNewCase = _case.substring(0, _case.length - 1)
    , numberStringOfOldCase = this.lastChoiceCase.substring(0, this.lastChoiceCase.length - 1)
    , numberOfNewCase;

  if(/^∞$/.test(numberStringOfNewCase)) {
    numberOfNewCase = Infinity;
  }
  else if(/^\-∞$/.test(numberStringOfNewCase)) {
    numberOfNewCase = -Infinity;
  }
  else {
    numberOfNewCase = parseFloat(numberStringOfNewCase);
  }

  if(/^∞$/.test(numberStringOfOldCase)) {
    numberOfOldCase = Infinity;
  }
  else if(/^\-∞$/.test(numberStringOfOldCase)) {
    numberOfOldCase = -Infinity;
  }
  else {
    numberOfOldCase = parseFloat(numberStringOfOldCase);
  }

  var hasBiggerValueThanPreviousCase = numberOfNewCase > numberOfOldCase;
  if(numberStringOfNewCase === numberStringOfOldCase) {
    hasBiggerValueThanPreviousCase = !(comparatorStringOfNewCase > comparatorStringOfOldCase);
  }

  if(!hasBiggerValueThanPreviousCase) {
    throw new TypeError('Case \'' + _case + '\' needs to bigger than case \'' + this.lastChoiceCase + '\' in ' + this.lexer.getLatestTokensLog());
  }

  this.lastChoiceCase = _case;

  return _case;
};

/**
 * Get plural case
 *
 * @return {String}
 * @api private
 */

MessageFormat.prototype._getSelectCase = function() {
  var _case = '';

  this._swallowWhiteSpace();

  while(this._isAlphaNumeric(this.currentToken)) {
    _case += this.currentToken;
    this.currentToken = this.lexer.getNextToken();
  }

  this._swallowWhiteSpace();

  return _case;
};

/**
 * Get plural case
 *
 * @return {String}
 * @api private
 */

MessageFormat.prototype._getPluralCase = function() {
  var _case = '';

  this._swallowWhiteSpace();

  while(this._isAlphaNumeric(this.currentToken) ||
        this.currentToken === '=' ||
        this.currentToken === ':') {
    _case += this.currentToken;
    this.currentToken = this.lexer.getNextToken();
  }

  this._swallowWhiteSpace();

  return _case;
};

/**
 * Check if a string is alpha numeric
 *
 * @param {String} string
 * @return {Boolean}
 * @api private
 */

MessageFormat.prototype._isAlphaNumeric = function(character) {
  return /^[a-zA-Z0-9]+$/.test(character);
};

/**
 * Check if a string is space
 *
 * @param {String} string
 * @return {Boolean}
 * @api private
 */

MessageFormat.prototype._isWhiteSpace = function(character) {
  return ' ' === character || '\n' === character || '\t' === character;
};

/**
 * Swallow spaces
 *
 * @return {void}
 * @api private
 */

MessageFormat.prototype._swallowWhiteSpace = function() {
  while(this._isWhiteSpace(this.currentToken)) {
    this.currentToken = this.lexer.getNextToken();
  }
};

module.exports = new MessageFormat;
