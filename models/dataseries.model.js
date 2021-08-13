const mongoose = require('mongoose');

const DataSeries = mongoose.Schema({
  deviceName: {
    type: String,
  },
  active: {
    type: Boolean
  }
});

DataSeries.set('timestamps', true);

module.exports = mongoose.model('dataseries', DataSeries, 'series');