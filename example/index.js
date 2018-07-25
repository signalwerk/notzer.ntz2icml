var fs = require("fs");
const Ntz2icml = require("../src/");
const path = require("path");

let ntz = fs.readFileSync(path.resolve(__dirname, "./data/index.ntz.json"));
ntz = JSON.parse(ntz);

// parse html to ntz
let ntz2icml = new Ntz2icml();

fs.writeFileSync(path.resolve(__dirname, "./data/index.icml"), ntz2icml.convert(ntz));
