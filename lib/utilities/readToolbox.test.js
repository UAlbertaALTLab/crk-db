import {ToolboxEntry} from "./readToolbox.js";
import {expect} from "chai";

describe(`readToolbox`, function() {

  describe(`getLindexByType`, function() {

    it(`returns a list of sources when several are specified`, function() {
      const entry = new ToolboxEntry(`
        \\src A
        \\src B
      `);
      expect(entry.getLinesByType(`src`)).to.eql([`A`, `B`]);
    });

    it(`includes an empty string in the list when no text is given`, function() {
      const entry = new ToolboxEntry(`
        \\src A
        \\src
        \\src C
      `);
      expect(entry.getLinesByType(`src`)).to.eql([`A`, ``, `C`]);
    });

    it(`returns an empty string when there is only a single line of a given type, with no text`, function() {
      const entry = new ToolboxEntry(`
        \\stm
        \\src
      `);
      expect(entry.getLinesByType(`stm`)).to.eql([``]);
    });

    it(`returns [] when the line type does not exist`, function() {
      const entry = new ToolboxEntry(`
        \\src A
      `);
      expect(entry.getLinesByType(`foo`)).to.eql([]);
    });

  });

});
