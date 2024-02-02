// models/PanelData.js
const mongoose = require('mongoose');

const panelDataSchema = new mongoose.Schema({
  name: String,
  url: String,
  userId: String,
  linkCount: Number, 
});

const PanelData = mongoose.model('PanelData', panelDataSchema);

module.exports = PanelData;
