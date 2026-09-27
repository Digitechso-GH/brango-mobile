export default ({ config }) => {
  const isPreview = process.env.APP_VARIANT === 'preview';

  return {
    ...config,
    name: isPreview ? config.name + ' (Preview)' : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: isPreview 
        ? 'com.digitechgroup.brangomobile.preview' 
        : 'com.digitechgroup.brangomobile'
    },
    android: {
      ...config.android,
      package: isPreview 
        ? 'com.digitechgroup.brangomobile.preview' 
        : 'com.digitechgroup.brangomobile'
    }
  };
};
