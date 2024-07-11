import parseAnalysis        from '../utilities/parseAnalysis.js';
import parseCategory        from '../utilities/parseCategory.js';

/**
 * Checks whether an analysis is the correct part of speech.
 * @param   {String}  category
 * @param   {Array}   analysis
 * @returns {Boolean}
 */
export default function isPOSMatch(category, analysis) {

    const { pos: categoryPOS, wordClass: categoryWordClass } = parseCategory(category);
    const { pos: analysisPOS, wordClass: analysisWordClass } = parseAnalysis(analysis);
  
    if (categoryPOS !== analysisPOS) return false;
  
    return categoryWordClass === analysisWordClass;
  }