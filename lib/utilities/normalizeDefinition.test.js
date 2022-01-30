/* eslint-disable
  func-names,
  prefer-arrow-callback,
*/

import { expect }          from 'chai';
import normalizeDefinition from './normalizeDefinition.js';

describe(`normalizeDefinition`, function() {

  it(`s/he sees s.o. => he sees him`, function() {
    const normalized = normalizeDefinition(`s/he sees s.o.`);
    expect(normalized).to.equal(`he sees him`);
  });

  it(`S/he sees s.o. => he sees him`, function() {
    const normalized = normalizeDefinition(`S/he sees s.o.`);
    expect(normalized).to.equal(`he sees him`);
  });

  it(`s/he sees her/him => he sees him`, function() {
    const normalized = normalizeDefinition(`s/he sees her/him`);
    expect(normalized).to.equal(`he sees him`);
  });

  it(`S/he sees him/her. => he sees him`, function() {
    const normalized = normalizeDefinition(`S/he sees him/her.`);
    expect(normalized).to.equal(`he sees him`);
  });

  it(`his/her => his`, function() {
    const normalized = normalizeDefinition(`his/her`);
    expect(normalized).to.equal(`his`);
  });

  it(`him/herself => himself`, function() {
    const normalized = normalizeDefinition(`him/herself`);
    expect(normalized).to.equal(`himself`);
  });

  it(`it/him => him`, function() {
    const normalized = normalizeDefinition(`it/him`);
    expect(normalized).to.equal(`him`);
  });

  it(`s.t. => something`, function() {
    const normalized = normalizeDefinition(`s.t.`);
    expect(normalized).to.equal(`something`);
  });

  it(`a sock => sock`, function() {
    const normalized = normalizeDefinition(`a sock`);
    expect(normalized).to.equal(`sock`);
  });

});
