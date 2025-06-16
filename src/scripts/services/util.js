/**
 * Add mixins to a class, useful for splitting files.
 * @param {object} [master] Master class to add mixins to.
 * @param {object[]|object} [mixins] Mixins to be added to master.
 */
export const addMixins = (master = {}, mixins = []) => {
  if (!master.prototype) {
    return;
  }

  if (!Array.isArray(mixins)) {
    mixins = [mixins];
  }

  const masterPrototype = master.prototype;

  mixins.forEach((mixin) => {
    const mixinPrototype = mixin.prototype;
    Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
      if (property === 'constructor') {
        return; // Don't need constructor
      }

      if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
        return; // property already present, do not override
      }

      masterPrototype[property] = mixinPrototype[property];
    });
  });
};

/**
 * Extend an array just like JQuery's extend.
 * @param {...object} args Objects to merge.
 * @returns {object} Merged objects.
 */
export const extend = (...args) => {
  for (let i = 1; i < args.length; i++) {
    for (let key in args[i]) {
      if (Object.prototype.hasOwnProperty.call(args[i], key)) {
        if (
          typeof args[0][key] === 'object' &&
          typeof args[i][key] === 'object'
        ) {
          extend(args[0][key], args[i][key]);
        }
        else if (args[i][key] !== undefined) {
          args[0][key] = args[i][key];
        }
      }
    }
  }
  return args[0];
};

export const callOnceVisible = async (dom, callback, options = {}) => {
  if (typeof dom !== 'object' || typeof callback !== 'function') {
    return; // Invalid arguments
  }

  options.threshold = options.threshold || 0;

  return await new Promise((resolve) => {
    // iOS is behind ... Again ...
    const idleCallback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    idleCallback(() => {
      // Get started once visible and ready
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(dom);
          observer.disconnect();

          callback();
        }
      }, {
        ...(options.root && { root: options.root }),
        threshold: options.threshold,
      });
      observer.observe(dom);

      resolve(observer);
    });
  });
};

/**
 * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
 * Cmp. https://tools.ietf.org/html/rfc5646
 * @param {string} languageCode Language tag.
 * @returns {string} Formatted language tag.
 */
export const formatLanguageCode = (languageCode) => {
  if (typeof languageCode !== 'string') {
    return languageCode;
  }

  /*
    * RFC 5646 states that language tags are case insensitive, but
    * recommendations may be followed to improve human interpretation
    */
  const segments = languageCode.split('-');
  segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
  if (segments.length > 1) {
    segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
  }
  languageCode = segments.join('-');

  return languageCode;
};
