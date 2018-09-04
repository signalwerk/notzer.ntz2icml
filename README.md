# Notzer → ntz2icml
Convert a Notzer-File to a ICML-File (InCopy/InDesign).


## install
```sh
npm install notzer.ntz2icml --save
```

## usage
```js
var fs = require("fs");
const ntz2icml = require("notzer.ntz2icml");

let ntz = fs.readFileSync("./data/index.ntz.json");
ntz = JSON.parse(ntz);

// parse ntz to icml
let ntz2icml = new Ntz2icml();

fs.writeFileSync("./data/index.icml", ntz2icml.convert(ntz));

```

## Infos
* [IDML Overview (German)](https://www.markupforum.de/images/2015/vortraege/IDML_Fellenz.pdf)
* [Coordinate Spaces & Transformations in InDesign](http://www.indiscripts.com/tag/CST)
