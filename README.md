# grunt-colors-to-less-operations

> Converts colors to [less color operation functions](http://lesscss.org/functions/#color-operations)

## Install
`npm install grunt-colors-to-less-operations --save-dev`

## Usage

In Gruntfile.js write this:
```js
less_colors: {
  options: {
    funcName: 'name_of_your_function' // name of your function
  },
  files: {
    'src/less/variables.less': ['src/less/variables.less']
  }
},
```
After that you can use it like this:

```
@navy: #81b3d2;
@btn-nav-hvr: name_of_your_function(@navy, #5fac53);
```
will be convert right in your file to:

```
@btn-nav-hvr: spin(desaturate(darken(@navy, 16%), 12%), -91); // desire: #5fac53 - result: #60ad54
```