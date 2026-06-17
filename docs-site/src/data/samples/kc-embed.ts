// Sample data for <kc-embed> non-scalar props.
//
// `data` is scalar:false — set as a JS property (an object).
// lib/sample-data.ts auto-aggregates every src/data/samples/*.ts via glob, so
// adding this file never touches a shared file.
//
// `sample`  = default data shown by the playground + bare examples
// `named`   = per-provider / per-feature sets referenced by <Example data="…">

export default {
  // Default: YouTube lazy embed — poster + play button, no iframe until clicked.
  sample: {
    data: {
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      title: 'Product intro',
      aspectRatio: '16:9',
    },
  },
  named: {
    // YouTube story
    youtube: {
      data: {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        title: 'Product intro',
        aspectRatio: '16:9',
      },
    },
    // Vimeo story — supply a poster because Vimeo has no static thumbnail URL
    vimeo: {
      data: {
        provider: 'vimeo',
        id: '76979871',
        title: 'Vimeo staff pick',
        poster: 'https://placehold.co/1280x720/1ab7ea/ffffff/png?text=Vimeo',
      },
    },
    // Generic player story — origin must be allowlisted by the app
    generic: {
      data: {
        provider: 'generic',
        url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        title: 'Generic embed',
        poster: 'https://placehold.co/1280x720/444/fff/png?text=Generic+player',
      },
    },
    // Custom aspect ratio — vertical 9:16 short
    aspectRatio916: {
      data: {
        provider: 'youtube',
        id: 'dQw4w9WgXcQ',
        title: 'Short',
        aspectRatio: '9:16',
      },
    },
  },
};
