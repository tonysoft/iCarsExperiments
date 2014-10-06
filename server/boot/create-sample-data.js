var importer = require('../sample-data/import');
var testData;

module.exports = function(app) {
  try {
    testData = require('../../testData.json');
  }
  catch(e) {}
  console.log(app.dataSources.db.name !== 'Memory');
  console.log(testData !== undefined);
  if ((app.dataSources.db.name !== 'Memory') || 
      (testData !== undefined))
    return;

  console.error('Started the import of sample data.');
  app.importing = true;

  importer(app, function(err) {
    delete app.importing;
    if (err) {
      console.error('Cannot import sample data - ', err);
    } else {
      console.error('Sample data was imported.');
    }
    app.emit('import done', err);
  });
};
