function printObject(obj) {
  for (let [key, value] of Object.entries(obj)) {
    if (typeof value !== 'object') {
      console.log(`\t${key}: ${value}`);
    } else {
      console.log(`\t${key}:`);
      printObject(value);
    }
  }
}

function printSeparateLine(str) {
  console.log(`------------------------------------------------${str}------------------------------------------------`);
}

module.exports = {
  printObject,
  printSeparateLine,
};
