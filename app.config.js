export default ({ config }) => {
  const isPreview = process.env.APP_VARIANT === 'preview';

  return {
    ...config,
    name: isPreview ? config.name + ' (Preview)' : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: isPreview 
        ? 'com.jsm788steam.brangomobile.preview' 
        : 'com.jsm788steam.brangomobile'
    },
    android: {
      ...config.android,
      package: isPreview 
        ? 'com.jsm788steam.brangomobile.preview' 
        : 'com.jsm788steam.brangomobile'
    }
  };
};
