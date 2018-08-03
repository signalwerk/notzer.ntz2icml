// var fs = require("fs");
var xmlbuilder = require("xmlbuilder");
var _ = require("lodash");

const noCharacterStyle = "$ID/[No character style]";

class ntz2icml {
  constructor() {
    this.producer = "ntz2icml";
    this.doc = xmlbuilder
      .create("Document", {
        version: "1.0",
        encoding: "UTF-8",
        standalone: true
      })
      .instructionBefore(
        "aid",
        'style="50" type="snippet" readerVersion="6.0" featureSet="513" product="8.0(370)" '
      )
      .instructionBefore("aid", 'SnippetType="InCopyInterchange"')
      .att("DOMVersion", "8.0")
      .att("Self", `${this.producer}_doc`);

    this.rootCharacterStyleGroup = this.doc.ele("RootCharacterStyleGroup", {
      Self: `${this.producer}_character_styles`
    });
    this.rootParagraphStyleGroup = this.doc.ele("RootParagraphStyleGroup", {
      Self: `${this.producer}_paragraph_styles`
    });

    this.story = this.doc.ele("Story", {
      Self: `${this.producer}_story`
    });

    this.characterStyles = [];
    this.paragraphStyles = [];

    this.addCharacterStyle(noCharacterStyle, { Self: noCharacterStyle });
    // this.addCharacterStyle("Default", { Self: "$ID/NormalCharacterStyle" });

    this.addParagraphStyle("$ID/NormalParagraphStyle", {
      Self: "$ID/NormalParagraphStyle"
    });
  }

  addCharacterStyle(title, attr) {
    var found = this.characterStyles.find(element => {
      return element.title === title;
    });

    if (found) {
      return found.ID;
    } else {
      let characterStyle = {
        ID: (attr && attr.Self) || `CharacterStyle/${title}`,
        title: title,
        attr: attr
      };
      this.characterStyles.push(characterStyle);
      return characterStyle.ID;
    }
  }

  addParagraphStyle(title, attr) {
    var found = this.paragraphStyles.find(element => {
      return element.title === title;
    });

    if (found) {
      return found.ID;
    } else {
      let paragraphStyle = {
        ID: (attr && attr.Self) || `ParagraphStyle/${title}`,
        title: title,
        attr: attr
      };
      this.paragraphStyles.push(paragraphStyle);
      return paragraphStyle.ID;
    }
  }

  _preprocess(root, ast, parent) {
    if (_.isUndefined(ast)) {
      return;
    }

    if (_.isArray(ast)) {
      _.forEach(ast, item => {
        this._preprocess(root, item, parent);
      });
      return;
    }

    if (_.isObject(ast)) {
      let type = ast.processor.type;

      switch (type) {
        case "root":
          if (ast.children) {
            return this._preprocess(root, ast.children, ast);
          }
          return;
          break;
        case "paragraph":
          let paragraphStyleID = this.addParagraphStyle(ast.processor.title);
          let eleParagraph = root
            .ele("ParagraphStyleRange")
            .att("AppliedParagraphStyle", paragraphStyleID);

          if (ast.children) {
            this._preprocess(eleParagraph, ast.children, ast);
          }
          root.ele("Br");
          return;
          break;
        case "inline":
          let characterStyleID = this.addCharacterStyle(
            ast.processor.title || noCharacterStyle
          );
          let eleCharacterStyle = root
            .ele("CharacterStyleRange")
            .att("AppliedCharacterStyle", characterStyleID);

          if (ast.children) {
            this._preprocess(eleCharacterStyle, ast.children, ast);
          }
          return;

          break;
        case "text":
          let eleTxt = null;

          // if there is no caracter style add default
          if (parent && parent.processor.type !== "inline") {
            let characterStyleID = this.addCharacterStyle(noCharacterStyle);
            let eleCharacterStyle = root
              .ele("CharacterStyleRange")
              .att("AppliedCharacterStyle", characterStyleID);

            eleTxt = eleCharacterStyle.ele("Content").txt(ast.value);
          } else {
            eleTxt = root.ele("Content").txt(ast.value);
          }

          // let eleTxt = root.ele("Content").txt(ast.value);

          if (ast.children) {
            return this._preprocess(eleTxt, ast.children, ast);
          }
          return;
          break;
        // case "table":
        //   return this.generalTagHandler(element, nodeStyle);
        //   break;
        // case "tr":
        //   return this.generalTagHandler(element, nodeStyle);
        //   break;
        // case "td":
        //   return this.generalTagHandler(element, nodeStyle);
        //   break;
        // case "th":
        //   return this.generalTagHandler(element, nodeStyle);
        //   break;
        default:
          console.log("!!!!! error! type: " + type);
        // if we have no special handler we just parse the text
        // return this.childerenHandler(element);
      }
    }
  }

  convert(ast) {
    this._preprocess(this.story, ast);

    // set characterStyles
    this.characterStyles.forEach(characterStyle => {
      this.rootCharacterStyleGroup
        .ele("CharacterStyle")
        .att("Self", characterStyle.ID)
        .att("Name", characterStyle.title);
    });

    // set paragraphStyles
    this.paragraphStyles.forEach(paragraphStyle => {
      this.rootParagraphStyleGroup
        .ele("ParagraphStyle")
        .att("Self", paragraphStyle.ID)
        .att("Name", paragraphStyle.title);
    });

    var xmlString = this.doc.end({
      pretty: true,
      indent: "  ",
      newline: "\n",
      allowEmpty: false,
      spacebeforeslash: ""
    });

    return xmlString;
    // fs.writeFileSync("./xml.xml", xmlString);
  }
}

module.exports = ntz2icml;
