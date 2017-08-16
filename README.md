
L10ns - Effective translation workflow
==============

## Dependencies

* [webp](https://developers.google.com/speed/webp/download)
* [ruby](https://github.com/rbenv/rbenv)

## Build from sources

* `git clone https://github.com/Sparted/l10ns && cd l10ns`
* `bundle install`
* `npm install`
* `./node_modules/.bin/bower install`
* `./node_modules/.bin/grunt data`
* `./node_modules/.bin/grunt webp`
* `./node_modules/.bin/grunt compass`
* `./node_modules/.bin/grunt dot`

[![Join the chat at https://gitter.im/tinganho/l10ns](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/tinganho/l10ns?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](http://img.shields.io/travis/tinganho/l10ns/master.svg?style=flat-square)](https://travis-ci.org/tinganho/l10ns)
[![Version](https://img.shields.io/npm/v/l10ns.svg?style=flat-square)](https://www.npmjs.org/package/l10ns)
[![Download](http://img.shields.io/npm/dm/l10ns.svg?style=flat-square)](https://www.npmjs.org/package/l10ns)
[![Gratipay](http://img.shields.io/gratipay/tinganho.svg?style=flat-square)](https://gratipay.com/tinganho)

## Today's translation problems

* Syncing translation keys between source code and storage.
* Accessing a simple translation web interface.
* Compiling translations.
* Searching a translation.
* Problem translating gender context.
* Problem translating multiple plural forms.
* Problem translating ordinals.
* Problem translating number/currency formats.
* Problem translating date formats.

L10ns deals with the entire translation problem mentioned above. It manage syncing translation keys between your source code and your localization storage. You can compile translations and open a translation interface by a CLI method. It supports ICU's message format and reads data directly from CLDR for translating multiple complex translations.

## Installation

`npm install l10ns -g`

## Getting started

Create a new project folder test and initialize a new translation project. The initialization guide will lead you through creating a project.
```
$ mkdir test
$ cd test
$ l10ns init
```
Now, create a source file test.js with (at least) the following code:
```
var requireLocalizations = require('path/to/output');
var l = requireLocalizations('en-US');
var firstname = l('SIGN_UP__FIRSTNAME');
var lastname = l('SIGN_UP__LASTNAME');
```
Now, let's update translation keys from source. It will traverse your source code and look for all `l()` calls:
```
$ l10ns update
```
Let's check which translation keys have been added:
```
$ l10ns log
@1 SIGN_UP__FIRSTNAME | NO TRANSLATION
@2 SIGN_UP__LASTNAME | NO TRANSLATION
```
Edit the last translation using log reference:
```
$ l10ns set @1 "Firstname" # using default language
$ l10ns set @1 -l zh-CN "名" # using Chinese
```
Translation are now saved to a localization file. To compile to your source programming language:
```
$ l10ns compile
```
Let's set up a web interface for translator to use:
```
$ l10ns interface
```

## Documentation

For more information please checkout our [official documentation](http://l10ns.org/docs.html).

## License
Copyright (c) 2014 Tingan Ho
Licensed under the MIT license.
