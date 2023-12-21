var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TableSchema = new Schema(
    {
        tab_name: {type: String, required: true, max: 100},
        chairs: {type: Number, required: true, min: 1, max: 40},
        description: {type: String, required: false, max: 200}, //описание стола
    }
);

// Виртуальное свойство - URL стола
TableSchema
.virtual('url')
.get(function () {
  return '/hall/table/' + this._id;
});


module.exports = mongoose.model('Table', TableSchema);
