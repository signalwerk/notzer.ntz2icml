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

        case "img":
          let width = ast.style.width;
          let height = ast.style.height;

          let [backgroundWidth, backgroundHeight] = ast.style[
            "background-size"
          ].split(" ");

          let [backgroundLeft, backgroundTop] = ast.style["background-position"]
            .split(" ")
            .map(f => parseFloat(f));

          let backgroundClip = ast.style["background-PDFCropBounds"]
            .split(" ")
            .map(f => parseFloat(f));

          let pdfWidth = backgroundClip[2] - backgroundClip[0];
          let pdfHeight = backgroundClip[3] - backgroundClip[1];

          // set background
          backgroundWidth = parseFloat(backgroundWidth); // no auto-handling

          if (backgroundHeight === "auto") {
            backgroundHeight = (backgroundWidth / pdfWidth) * pdfHeight;
          } else {
            backgroundHeight = parseFloat(backgroundHeight);
          }

          // set final box
          if (width === "auto") {
            width = backgroundWidth + backgroundLeft;
          } else {
            width = parseFloat(width);
          }

          if (height === "auto") {
            height = backgroundHeight + backgroundTop;
          } else {
            height = parseFloat(height);
          }

          let rect = root
            .ele("Rectangle")
            .att("Self", "uec")
            .att("ItemTransform", "1 0 0 1 0 0")
            .att("AppliedObjectStyle", "ObjectStyle/img");

          let PathPoints = rect
            .ele("Properties")
            .ele("PathGeometry")
            .ele("GeometryPathType")
            .att("PathOpen", "false")
            .ele("PathPointArray");

          PathPoints.ele("PathPointType")
            .att("Anchor", `${0 - width / 2} ${0 - height / 2}`)
            .att("LeftDirection", `${0 - width / 2} ${0 - height / 2}`)
            .att("RightDirection", `${0 - width / 2} ${0 - height / 2}`);

          PathPoints.ele("PathPointType")
            .att("Anchor", `${0 - width / 2} ${height / 2}`)
            .att("LeftDirection", `${0 - width / 2} ${height / 2}`)
            .att("RightDirection", `${0 - width / 2} ${height / 2}`);

          PathPoints.ele("PathPointType")
            .att("Anchor", `${width / 2} ${height / 2}`)
            .att("LeftDirection", `${width / 2} ${height / 2}`)
            .att("RightDirection", `${width / 2} ${height / 2}`);

          PathPoints.ele("PathPointType")
            .att("Anchor", `${width / 2} ${0 - height / 2}`)
            .att("LeftDirection", `${width / 2} ${0 - height / 2}`)
            .att("RightDirection", `${width / 2} ${0 - height / 2}`);

          let scaleX = (1 * backgroundWidth) / pdfWidth;
          let scaleY = (1 * backgroundHeight) / pdfHeight;

          // indesign calculates from center so calc the x/y top left
          let xOffset =
            0 - backgroundClip[0] * scaleX - width / 2 + backgroundLeft;
          let yOffset =
            0 - backgroundClip[1] * scaleY - height / 2 + backgroundTop;

          let PDF = rect
            .ele("PDF")
            .att("Self", "u166")
            .att("AppliedObjectStyle", "ObjectStyle/$ID/[None]")
            .att(
              "ItemTransform",
              `${scaleX} 0 0 ${scaleY} ${xOffset} ${yOffset}`
            );

          PDF.ele("Properties")
            .ele("GraphicBounds")
            .att("Left", backgroundClip[0])
            .att("Top", backgroundClip[1])
            .att("Right", backgroundClip[2])
            .att("Bottom", backgroundClip[3]);

          PDF.ele("Link")
            .att("Self", "u163")
            .att("LinkResourceURI", "file:" + ast.processor.src);

          PDF.ele("PDFAttribute")
            .att("PageNumber", "1")
            .att("PDFCrop", ast.style["background-PDFCropName"] || "CropMedia")
            .att("TransparentBackground", "true");

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
