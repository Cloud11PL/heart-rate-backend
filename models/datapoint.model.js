const mongoose = require('mongoose');

const DataPointSchema = mongoose.Schema({
  hrVal: {
    type: Number,
  },
  spoVal: {
    type: Number,
  },
  seriesId: {
    type: mongoose.Schema.Types.ObjectId,
  }
});

DataPointSchema.set('timestamps', true);

module.exports = mongoose.model('datapoint', DataPointSchema, 'datapoints');
