const mongoose = require('mongoose');
const Schema = mongoose.Schema;
let completematch = new Schema({
    matchid: { type: String },
    type : {type :String},
    gameid : {type :Number},
    match: {},//
    ismatchcomplete : {type :Number},
    status: {type :String},
    status_overview: {type :String},
    matchstarted: {type :Date},
    matchovers:{type :Number},
    inningsdetail:{type:Object}
}, {
        versionKey: false
    });
module.exports = mongoose.model('completematch', completematch);