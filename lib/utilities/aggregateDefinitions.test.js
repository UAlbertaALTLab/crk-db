/* eslint-disable
  func-names,
  no-magic-numbers,
  prefer-arrow-callback,
*/

import aggregateDefinitions from './aggregateDefinitions.js';
import { expect }           from 'chai';

const definitions = [
  {
    definition: `one`,
    source:     `AECD`,
  },
  {
    definition: `one two`,
    source:     `CW`,
  },
  {
    definition: `one two three`,
    source:     `DLC`,
  },
  {
    definition: `one two three four`,
    source:     `MD`,
  },
  {
    definition: `one two three four five`,
    source:     `ABCD`,
  },
];

const precedence = [`CW`, `AE`, `MD`];

describe(`aggregateDefinitions`, function() {

  it(`returns the expected results`, function() {
    const result = aggregateDefinitions(definitions);
    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.length(4);
    const lastDefinition = result.pop();
    expect(lastDefinition.sources).to.include(`MD`);
    expect(lastDefinition.sources).to.include(`ABCD`);
  });

  it(`error: unknown source`, function() {
    const test = () => aggregateDefinitions(definitions, { precedence: [`A`] });
    expect(test).to.throw(`Unrecognized source`);
  });

  it(`option: precedence`, function() {
    const precedence      = [`CW`, `AECD`, `ABCD`, `MD`, `DLC`];
    const result          = aggregateDefinitions(definitions, { precedence });
    const firstDefinition = result.shift();
    expect(firstDefinition.sources).to.include(`CW`);
    const fiveWordDef     = result.find(({ definition }) => definition === `one two three four five`);
    expect(fiveWordDef.sources).not.to.be.undefined;
  });

  it(`option: threshold (0.5)`, function() {
    const result = aggregateDefinitions(definitions, { threshold: 0.5 });
    expect(result).to.have.length(2);
  });

  it(`option: threshold (1)`, function() {
    const result = aggregateDefinitions(definitions, { threshold: 1 });
    expect(result).to.have.length(5);
  });

  it(`wâpamêw`, function() {

    const defs = [
      {
        definition: `s/he sees s.o.`,
        source:     `CW`,
      },
      {
        definition: `s/he witnesses s.o.`,
        source:     `CW`,
      },
      {
        definition: `S/he sees him/her.`,
        source:     `AE`,
      },
      {
        definition: `s/he sees her/him`,
        source:     `MD`,
      },
    ];

    const result = aggregateDefinitions(defs, { precedence });
    const [a, b] = result;

    expect(result).to.have.length(2);
    expect(a.definition).to.equal(`s/he sees s.o.`);
    expect(a.sources).to.have.length(3);
    expect(a.sources).to.have.members([`CW`, `AE`, `MD`]);
    expect(b.definition).to.equal(`s/he witnesses s.o.`);
    expect(b.sources).to.have.length(1);
    expect(b.sources).to.have.members([`CW`]);

  });

  it(`apiw`, function() {

    const defs = [
      {
        definition: `s/he sits, s/he sits down, s/he is present`,
        source:     `CW`,
      },
      {
        definition: `s/he is available`,
        source:     `CW`,
      },
      {
        definition: `s/he is there, s/he is situated`,
        source:     `CW`,
      },
      {
        definition: `s/he is at home, s/he stays at home`,
        source:     ``,
      },
      {
        definition: `s/he is sitting`,
        source:     `AE`,
      },
      {
        definition: `He sits. Also means he is at home.`,
        source:     `MD`,
      },
    ];

    const result = aggregateDefinitions(defs);

    expect(result).to.have.length(6);

  });

  it(`apoy`, function() {

    const defs = [
      {
        definition: `paddle`,
        source:     `CW`,
      },
      {
        definition: `spade`,
        source:     `CW`,
      },
      {
        definition: `paddle`,
        source:     `AE`,
      },
      {
        definition: `A shovel.`,
        source:     `MD`,
      },
    ];

    const result    = aggregateDefinitions(defs);
    const [a, b, c] = result;

    expect(result).to.have.length(3);
    expect(a.definition).to.equal(`paddle`);
    expect(a.sources).to.have.members([`CW`, `AE`]);
    expect(b.definition).to.equal(`spade`);
    expect(b.sources).to.have.members([`CW`]);
    expect(c.definition).to.equal(`A shovel.`);
    expect(c.sources).to.have.members([`MD`]);

  });

  it(`asikan`, function() {

    const defs = [
      {
        definition: `sock, stocking`,
        source:     `CW`,
      },
      {
        definition: `A sock`,
        source:     `AE`,
      },
      {
        definition: `stocking`,
        source:     `AE`,
      },
      {
        definition: `Sock.`,
        source:     `MD`,
      },
    ];

    const result    = aggregateDefinitions(defs);
    const [a, b, c] = result;

    expect(result).to.have.length(3);
    expect(a.definition).to.equal(`sock, stocking`);
    expect(a.sources).to.have.members([`CW`]);
    expect(b.definition).to.equal(`A sock`);
    expect(b.sources).to.have.members([`AE`, `MD`]);
    expect(c.definition).to.equal(`stocking`);
    expect(c.sources).to.have.members([`AE`]);

  });

  it(`askihk`, function() {

    const defs = [
      {
        definition: `pail`,
        source:     `CW`,
      },
      {
        definition: `kettle`,
        source:     `CW`,
      },
      {
        definition: `A pail`,
        source:     `AE`,
      },
      {
        definition: `a bucket.`,
        source:     `AE`,
      },
      {
        definition: `A pail.`,
        source:     `MD`,
      },
    ];

    const result    = aggregateDefinitions(defs);
    const [a, b, c] = result;

    expect(result).to.have.length(3);
    expect(a.definition).to.equal(`pail`);
    expect(a.sources).to.have.members([`CW`, `AE`, `MD`]);
    expect(b.definition).to.equal(`kettle`);
    expect(b.sources).to.have.members([`CW`]);
    expect(c.definition).to.equal(`a bucket.`);
    expect(c.sources).to.have.members([`AE`]);

  });

  it(`astotin`, function() {

    const defs = [
      {
        definition: `hat, cap, headgear`,
        source:     `CW`,
      },
      {
        definition: `A hat.`,
        source:     `AE`,
      },
      {
        definition: `hat`,
        source:     `MD`,
      },
    ];

    const result = aggregateDefinitions(defs);
    const [a, b] = result;

    expect(result).to.have.length(2);
    expect(a.definition).to.equal(`hat, cap, headgear`);
    expect(a.sources).to.have.members([`CW`]);
    expect(b.definition).to.equal(`A hat.`);
    expect(b.sources).to.have.members([`AE`, `MD`]);

  });

  it(`atoskêw`, function() {

    const defs = [
      {
        definition: `s/he works`,
        source:     `CW`,
      },
      {
        definition: `He works.`,
        source:     `MD`,
      },
    ];

    const result = aggregateDefinitions(defs);
    const [a]    = result;

    expect(result).to.have.length(1);
    expect(a.definition).to.equal(`s/he works`);
    expect(a.sources).to.have.members([`CW`, `MD`]);

  });

  it(`mowêw`, function() {

    const defs = [
      {
        definition: `s/he eats s.o. (e.g. bread)`,
        source:     `CW`,
      },
      {
        definition: `S/he eats them.`,
        source:     `AE`,
      },
      {
        definition: `He eats him.`,
        source:     `MD`,
      },
    ];

    const result = aggregateDefinitions(defs);
    const [a]    = result;

    expect(result).to.have.length(1);
    expect(a.definition).to.equal(`s/he eats s.o. (e.g. bread)`);
    expect(a.sources).to.have.members([`CW`, `AE`, `MD`]);

  });

});
