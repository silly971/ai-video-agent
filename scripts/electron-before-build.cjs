exports.default = async function beforeBuild(context) {
  console.log(
    `[electron-before-build] using prebuilt Next standalone app from ${context.appDir}`,
  );
  return false;
};
