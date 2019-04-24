const localeOptions = { hour12: false };

exports.print = (text) => {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  console.error(`[${timeStamp}][Info] ${text}`);
};

exports.printWarning = (text) => {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  console.warn(`[${timeStamp}][Warning] ${text}`);
};

exports.printError = (text) => {
  const timeStamp = new Date().toLocaleString('en-US', localeOptions);
  console.log(`[${timeStamp}][Error] ${text}`);
};
