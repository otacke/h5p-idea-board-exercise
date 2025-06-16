import semantics from '@root/semantics.json';
import libraryJson from '@root/library.json';

/**
 * Get title from library.
 * @param {string} fallbackTitle Fallback title to use if library does not have a title.
 * @returns {string} Title.
 */
export const getLibraryTitle = (fallbackTitle = '') => {
  if (typeof fallbackTitle !== 'string') {
    fallbackTitle = '';
  }

  return libraryJson.title ?? fallbackTitle;
};

/**
 * Get default values from semantics fields.
 * @param {object[]} start Start semantics field.
 * @returns {object} Default values from semantics.
 */
export const getSemanticsDefaults = (start = semantics) => {
  let defaults = {};

  if (!Array.isArray(start)) {
    return defaults; // Must be array, root or list
  }

  start.forEach((entry) => {
    if (typeof entry.name !== 'string') {
      return;
    }

    if (typeof entry.default !== 'undefined') {
      defaults[entry.name] = entry.default;
    }

    if (entry.type === 'list') {
      defaults[entry.name] = []; // Does not set defaults within list items!
    }
    else if (entry.type === 'group' && entry.fields) {
      const groupDefaults = getSemanticsDefaults(entry.fields);
      if (Object.keys(groupDefaults).length) {
        defaults[entry.name] = groupDefaults;
      }
    }
  });

  return defaults;
};

export const isUsingMouse = () => {
  return document.querySelector('.h5p-content')?.classList.contains('using-mouse');
};
