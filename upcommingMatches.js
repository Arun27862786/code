"use strict";
const axios = require("axios");
require("dotenv").config();
const mysql_pool = require("./db");
const cron = require("node-cron");

var saveNewmatches = async (req, res) => {
  try {
    let api_url = NEWCRICKETAPI + "/matches/upcommingmatches";

    var response = await axios.get(api_url);

    mysql_pool.mysql_pool.getConnection(function (err, con) {
      if (err) {
        console.log(" Error getting mysql_pool connection: " + err);
      }

      var upcommingmatches =
        response && response.data && response.data.length > 0
          ? response.data
          : "";

      upcommingmatches.forEach((matchItem, matchIndex) => {
        /*console.log('matchItem ->>',matchItem);
                    matchItem.match.key;
                    matchItem.name; */
        var matchObj = matchItem.match;
        var start_date =
          matchObj.start_date && matchObj.start_date.iso
            ? matchObj.start_date.iso
            : "";
        var team1 =
          matchObj.teams.a && matchObj.teams.a.name
            ? matchObj.teams.a.name
            : "";
        var team2 =
          matchObj.teams.b && matchObj.teams.b.name
            ? matchObj.teams.b.name
            : "";

        var sqlMatch = "SELECT unique_id FROM  matchmaster WHERE unique_id=?";
        con.query(sqlMatch, [matchObj.key], function (err, result, fields) {
          //if (err) console.log(err);
          //console.log('result =>> ',result);
          //console.log('result 11=>> ',matchObj);
          if (result.length > 0) {
            var sqlUpdate =
              "UPDATE matchmaster SET mdate=?,dateTimeGMT=?,team1=?,team2=?,mtype=?,name=?,seasonkey=?,seriesname=? WHERE unique_id=?";
            con.query(
              sqlUpdate,
              [
                start_date,
                start_date,
                team1,
                team2,
                matchObj.format,
                matchObj.name,
                matchObj.season.key,
                matchObj.season.name,
                matchObj.key,
              ],
              function (err, result, fields) {
                if (err) {
                  console.log(" Error : " + err);
                }
              }
            );
            console.log("update node ", matchIndex);
          } else {
            var sqlInsert =
              "INSERT INTO matchmaster (unique_id,mdate,dateTimeGMT,team1,team2,mtype,gameid,name,seasonkey,seriesname) VALUES(?,?,?,?,?,?,?,?,?,?)";
            con.query(
              sqlInsert,
              [
                matchObj.key,
                start_date,
                start_date,
                team1,
                team2,
                matchObj.format,
                1,
                matchObj.name,
                matchObj.season.key,
                matchObj.season.name,
              ],
              function (err, result, fields) {
                if (err) {
                  console.log(" Error : " + err);
                }
              }
            );
            console.log("insert node ", matchIndex);
          }
        });
      });
    });
  } catch (e) {
    console.log("error catch", e);
  }
};

cron.schedule("0 0 */3 * * *", () => {
  saveNewmatches();
});

saveNewmatches();
