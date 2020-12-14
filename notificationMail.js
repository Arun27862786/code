"use strict";
require('dotenv').config();
const ApibaseUrl = require('./db');
const axios = require("axios");
const NotifyMail = require('./models/NotifyMail');
const cron = require('node-cron');


var sndNotification = async (req, res) => {
  NotifyMail.find({}, async function (error, resultsNP, fields) {
    try {
      if (error) {
        console.log("connection down at", error);
      } else
        if (resultsNP.length > 0) {
            let api_url = (ApibaseUrl.ApibaseUrl.baseUrl) + "/mailcron";
            var response = await axios.post(api_url);
            console.log("response--->>>",response);
            
        }

    } catch (e) {
      console.log("error ===>", e);
    }
  })

}
cron.schedule('*/1 * * * *', () => {
  sndNotification();
})
sndNotification();