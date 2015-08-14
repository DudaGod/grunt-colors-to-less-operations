/*
 * grunt-less-color
 * https://github.com/DudaGod/grunt-less-color
 *
 * Copyright (c) 2015 DudaGod
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Internal lib.
  var fs = require('fs');
  var glob = require('glob');
  var lineReader = require('line-reader');
  var _r = require('color-model').HexRgb; var HexRgb = _r;
  var _r = require('sprintf-js').sprintf; eval('var sprintf = _r'); var sprintf = _r;
  var replace = require("replace");
  var createLess = require("less/lib/less"),
      myLess = createLess("less/libs/less/environment/environment-api.js");

  grunt.registerMultiTask('less_colors', 'Converts colors to less color operation functions', function() {
    var funcName = this.options().funcName;
    var color1 = [], color2 = [], num = [], num2 = [], lines = [];

    var done = this.async();

    this.files.forEach(function(f) {
      f.src.forEach(function(file) {
        findFuncAndReplace(file);
      });
    });

    function findFuncAndReplace(file) {
      var i = 0;

      lineReader.eachLine(file, function(line) {
        if(line.indexOf(funcName) != -1) {              // find line with function name
          var arr = line.split(/(?:,\s*)|[()]/);
          color1.push(arr[1]);
          color2.push(arr[2]);
          lines.push(line);

          for(; i < color1.length; i++) {
            if(color1[i].indexOf("@") != -1) {         // if using less variable (like @green)
              num.push(i);
              changeWithDependence(file, color1[num[0]], color2[num[0]], lines[num[0]]);  // find hex value of less variable
              num.shift();
            }
            else {
              num2.push(i);
              changeWithoutDependence(file, color1[num2[0]], color2[num2[0]], lines[num2[0]]);
              num2.shift();
            }
          }
        }
      // }).then(function () {
      //   console.log(color1, color2);
      });
    };

    function changeWithDependence(file, col1, col2, line) {
      lineReader.eachLine(file, function(line2, last) {
        if (line2.indexOf(col1 + ":") != -1) {
          var arr = line2.split(/(?::\s*|;)/);
          var colorName = arr[0];
          col1 = arr[1];

          var lessString = transformToLessOperations(col1, col2);  // get less function with my colors
          lessString = lessString.replace(col1, colorName);        // change one of hex color to less variable, in order to save dependencies between colors

          var arr2 = line.split(' ');
          var newString = arr2[0] + " " + lessString;              // final string with less functions

          var arr3 = line.split(/[()]/);
          var findLine = arr3[0] + "\\(" + arr3[1] + "\\)" + arr3[2];  // string which I'll replace (it's regexp)

          replaceStrings(file, findLine, newString, function() {});
        }
      });
    };

    function changeWithoutDependence(file, col1, col2, line) {
      var lessString = transformToLessOperations(col1, col2);  // get less function with my colors
      var arr = line.split(' ');
      var newString = arr[0] + " " + lessString;              // final string with less functions
      var arr2 = line.split(/[()]/);
      var findLine = arr2[0] + "\\(" + arr2[1] + "\\)" + arr2[2];  // string which I'll replace (it's regexp)

      replaceStrings(file, findLine, newString, function() {});
    };


    function transformToLessOperations(baseColor, desiredColor, format) {
      format = format ? format : '%(operationsStart)s%(operationsBaseColor)s%(operationsEnd)s; // desire: %(desiredColor)s - result: %(resultColor)s';

      var baseRgb    = new HexRgb(baseColor.toString()),
          desiredRgb = new HexRgb(desiredColor.toString()),
          lessColor = new myLess.tree.Color(baseColor.substr(1)),
          lessColorFunc = myLess.functions.functionRegistry._data,
          lessColorRes,
          amount = new Object();

      if (baseRgb.equals(desiredRgb)) {
        return _formatResult(format, '', baseRgb, '', desiredRgb);
      }

      var operationsStart = '',
          operationsEnd   = '';

      var lightnessDelta = desiredRgb.toHsl().lightness() - baseRgb.toHsl().lightness();
      if (lightnessDelta > 0) {
        lightnessDelta  = Math.round(lightnessDelta * 100);
        operationsStart = 'lighten(' + operationsStart;
        operationsEnd   = operationsEnd + ', ' + lightnessDelta + '%)';

        amount.value = lightnessDelta;
        lessColor = lessColorFunc.lighten(lessColor, amount);
      } else if (lightnessDelta < 0) {
        lightnessDelta = Math.round(-lightnessDelta * 100);
        operationsStart = 'darken(' + operationsStart;
        operationsEnd   = operationsEnd + ', ' + lightnessDelta + '%)';

        amount.value = lightnessDelta;
        lessColor = lessColorFunc.darken(lessColor, amount);
      }

      var saturationDelta = desiredRgb.toHsl().saturation() - baseRgb.toHsl().saturation();
      if (saturationDelta > 0) {
        saturationDelta = Math.round(saturationDelta * 100);
        operationsStart = 'saturate(' + operationsStart;
        operationsEnd   = operationsEnd + ', ' + saturationDelta + '%)';

        amount.value = saturationDelta;
        lessColor = lessColorFunc.saturate(lessColor, amount);
      } else if (saturationDelta < 0) {
        saturationDelta = Math.round(-saturationDelta * 100);
        operationsStart = 'desaturate(' + operationsStart;
        operationsEnd   = operationsEnd + ', ' + saturationDelta + '%)';

        amount.value = saturationDelta;
        lessColor = lessColorFunc.desaturate(lessColor, amount);
      }

      var hueDelta = desiredRgb.toHsl().hue() - baseRgb.toHsl().hue();
      if (hueDelta != 0) {
        operationsStart = 'spin(' + operationsStart;
        operationsEnd   = operationsEnd + ', ' + hueDelta + ')';

        amount.value = hueDelta;
        lessColor = lessColorFunc.spin(lessColor, amount);
      }

      var resultColor = lessColor.toRGB();

      return _formatResult(format, operationsStart, baseRgb, operationsEnd, desiredRgb, resultColor);
    };

    function _formatResult(format, operationsStart, operationsBaseColor, operationsEnd, desiredColor, resultColor) {
      return sprintf(format, {
        operationsStart     : operationsStart,
        operationsBaseColor : operationsBaseColor,
        operationsEnd       : operationsEnd,
        desiredColor        : desiredColor,
        resultColor         : resultColor
      });
    };

    function replaceStrings(filePath, replaceThis, withThat) {
      // Find file
      glob(filePath, function (err,files) {
        if (err) throw err;
        files.forEach(function (item,index,array){
          // Replace string
         replace({
            regex: replaceThis,
            replacement: withThat,
            paths: [item],
            recursive: false,
            silent: true,
          });
        });
      });
    };
  });
};
