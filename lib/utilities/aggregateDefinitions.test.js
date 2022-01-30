/* eslint-disable
  func-names,
  no-magic-numbers,
  prefer-arrow-callback,
*/

import aggregateDefinitions from './aggregateDefinitions.js';
import { expect }           from 'chai';

const definitions = [
  {
    definition:    `one`,
    otherProperty: true,
    sources:       [`AECD`],
  },
  {
    definition: `one two`,
    sources:     [`CW`],
  },
  {
    definition: `one two three`,
    sources:     [`DLC`],
  },
  {
    definition: `one two three four`,
    sources:     [`MD`],
  },
  {
    definition: `one two three four five`,
    sources:     [`ABCD`],
  },
];

const precedence = [`CW`, `AE`, `MD`];

describe(`aggregateDefinitions`, function() {

  it(`returns the expected results`, function() {
    const defs   = JSON.parse(JSON.stringify(definitions));
    const result = aggregateDefinitions(defs);
    expect(result).to.be.an.instanceof(Array);
    expect(result).to.have.length(4);
    const firstDefinition = result.shift();
    expect(firstDefinition.otherProperty).to.be.true;
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
        sources:     [`CW`],
      },
      {
        definition: `s/he witnesses s.o.`,
        sources:     [`CW`],
      },
      {
        definition: `S/he sees him/her.`,
        sources:     [`AE`],
      },
      {
        definition: `s/he sees her/him`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `s/he is available`,
        sources:     [`CW`],
      },
      {
        definition: `s/he is there, s/he is situated`,
        sources:     [`CW`],
      },
      {
        definition: `s/he is at home, s/he stays at home`,
        sources:    [``],
      },
      {
        definition: `s/he is sitting`,
        sources:     [`AE`],
      },
      {
        definition: `He sits. Also means he is at home.`,
        sources:     [`MD`],
      },
    ];

    const result = aggregateDefinitions(defs);

    expect(result).to.have.length(6);

  });

  it(`apoy`, function() {

    const defs = [
      {
        definition: `paddle`,
        sources:     [`CW`],
      },
      {
        definition: `spade`,
        sources:     [`CW`],
      },
      {
        definition: `paddle`,
        sources:     [`AE`],
      },
      {
        definition: `A shovel.`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `A sock`,
        sources:     [`AE`],
      },
      {
        definition: `stocking`,
        sources:     [`AE`],
      },
      {
        definition: `Sock.`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `kettle`,
        sources:     [`CW`],
      },
      {
        definition: `A pail`,
        sources:     [`AE`],
      },
      {
        definition: `a bucket.`,
        sources:     [`AE`],
      },
      {
        definition: `A pail.`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `A hat.`,
        sources:     [`AE`],
      },
      {
        definition: `hat`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `He works.`,
        sources:     [`MD`],
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
        sources:     [`CW`],
      },
      {
        definition: `S/he eats them.`,
        sources:     [`AE`],
      },
      {
        definition: `He eats him.`,
        sources:     [`MD`],
      },
    ];

    const result = aggregateDefinitions(defs);
    const [a]    = result;

    expect(result).to.have.length(1);
    expect(a.definition).to.equal(`s/he eats s.o. (e.g. bread)`);
    expect(a.sources).to.have.members([`CW`, `AE`, `MD`]);

  });

});
