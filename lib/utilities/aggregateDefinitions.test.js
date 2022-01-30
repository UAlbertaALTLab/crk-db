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

describe(`aggregateDefinitions`, function() {

  it(`returns the expected results`, function() {
    const result = aggregateDefinitions(definitions);
    expect(result).to.be.an.instanceof(Array);
    expect(result.length).to.equal(4);
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
    expect(result.length).to.equal(2);
  });

  it(`option: threshold (1)`, function() {
    const result = aggregateDefinitions(definitions, { threshold: 1 });
    expect(result.length).to.equal(5);
  });

});
