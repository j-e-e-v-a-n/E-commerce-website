const MongoClient = require('mongodb').MongoClient;

const state = {
  db: null
};

module.exports.connect = function(done) {
  const url = process.env.MONGO_URI;
  const dbname = 'shopping';

  MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) return done(err);
    state.db = client.db(dbname);
    done();
  });


module.exports.get = function() {
  return state.db;
};
}
