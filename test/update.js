
var sinon        = require('sinon')
  , _            = require('underscore')
  , path         = require('path')
  , expect       = require('chai').expect
  , proxyquire   = require('proxyquire')
  , jsonFixtures = require('./fixtures/json')
  , fixtures     = require('./fixtures/update');


var Update = require('../lib/update').Update;

module.exports = function() {
  describe('update', function() {
    describe('_stripInnerFunctionCalls', function() {
      it('should be able to strip inner functions', function() {
        var update = new Update();
        var str = update._stripInnerFunctionCalls(fixtures.innerFunction);
        expect(str).to.not.have.string('test()');
      });
    });

    describe('_getSourceKeys', function() {
      var fsStub = {
        readFileSync : function() {
          return 'gt(\'test\');'; 
        }
      };
      var Update = proxyquire('../lib/update', { fs : fsStub }).Update
      var update = new Update();
      update.src = ['test/test.js'];
      var translation = update._getSourceKeys();
      expect(translation).to.have.property('test');
      expect(translation.test).to.have.property('vars');
      expect(translation.test).to.have.property('files');
      expect(translation.test.files[0]).to.equal(update.src[0]);
      expect(translation.test.vars).to.have.length(0);
    });

    describe('getTranslations', function() {
      it('should be able to return a translation object', function() {
        var localesFolder = 'localesFolder';
        var locales = ['en-US', 'zh-CN'];
        var globStub = {
          sync : function(path, opts) {
            if(/\.json/.test(path)
            && opts.cwd === localesFolder) {
              return locales;
            }
          } 
        };
        var fsStub = {
          readFileSync : sinon.stub().returns(JSON.stringify(jsonFixtures.basicTranslationItem)) 
        };
        var pathStub = {
          join : function() {
            return 'en-US.json';
          }
        };
        var Update = proxyquire('../lib/update', { glob : globStub, fs : fsStub, path : pathStub }).Update
        var update = new Update();
        update.localesFolder = localesFolder;
        update.locales = locales;
        var translations = update.getTranslations();
        expect(translations).to.have.property(locales[0]);
        expect(translations).to.have.property(locales[1]);
      });
    });

    describe('_mergeTranslations', function() {
      it('should be able to migrate old translations', function(done) {
        var update = new Update();
        update.locales = ['en-US'];
        update.getTranslations = sinon.stub().returns(jsonFixtures.oldBasicTranslation);
        update.mergeUserInputs = function(_newTranslations, oldTranslations, callback) {
          callback(null, _newTranslations);
        };
        update._mergeTranslations(jsonFixtures.basicTranslationItem, function(err, _newTranslations) {
          expect(_newTranslations['en-US'].test.translations).to.have.string('test');
          done();
        });
      });
    });
  });
};